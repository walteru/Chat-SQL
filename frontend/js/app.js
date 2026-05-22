// Global variables
let apiKey = '';
let selectedModel = '';
let isSetupComplete = false;

// DOM elements
const setupSection = document.getElementById('setup-section');
const chatSection = document.getElementById('chat-section');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('modelSelect');
const sqlFileInput = document.getElementById('sqlFile');
const setupBtn = document.getElementById('setup-btn');
const setupText = document.getElementById('setup-text');
const setupLoading = document.getElementById('setup-loading');
const setupStatus = document.getElementById('setup-status');
const dbFilename = document.getElementById('db-filename');
const dbTables = document.getElementById('db-tables');
const selectedModelSpan = document.getElementById('selected-model');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Validate setup form
    function validateSetupForm() {
        const hasApiKey = apiKeyInput.value.trim().length > 0;
        const hasModel = modelSelect.value.length > 0;
        const hasFile = sqlFileInput.files.length > 0;
        setupBtn.disabled = !(hasApiKey && hasModel && hasFile);
    }

    apiKeyInput.addEventListener('input', validateSetupForm);
    modelSelect.addEventListener('change', validateSetupForm);
    sqlFileInput.addEventListener('change', validateSetupForm);

    // Setup button click
    setupBtn.addEventListener('click', handleSetup);

    // Chat functionality
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Reset button
    resetBtn.addEventListener('click', resetApp);

    // Initial validation
    validateSetupForm();
});

// Handle setup process
async function handleSetup() {
    try {
        setLoadingState(true);
        showStatus('Validando API key...', 'loading');

        // Store API key and model
        apiKey = apiKeyInput.value.trim();
        selectedModel = modelSelect.value;

        // Validate API key format
        if (!apiKey.startsWith('sk-ant-api')) {
            throw new Error('Formato de API key inválido. Debe comenzar con "sk-ant-api"');
        }

        // Note: API key validation will happen on first chat usage

        showStatus('API key válida. Preparando base de datos...', 'loading');

        // Upload SQL file
        const file = sqlFileInput.files[0];
        await uploadSqlFile(file);

        showStatus('¡Base de datos cargada exitosamente!', 'success');

        // Get database info
        const tables = await fetchTables();

        // Show chat interface
        dbFilename.textContent = file.name;
        dbTables.textContent = tables.join(', ');
        
        // Show selected model with friendly name
        const modelNames = {
            'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku (Económico)',
            'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet (Balanceado)', 
            'claude-opus-4-20250514': 'Claude Opus 4 (Premium)'
        };
        selectedModelSpan.textContent = modelNames[selectedModel] || selectedModel;
        
        setupSection.style.display = 'none';
        chatSection.style.display = 'block';
        
        isSetupComplete = true;
        
        // Add welcome message
        addMessage('¡Hola! Tu base de datos está lista. Puedes hacerme consultas en lenguaje natural.', 'assistant');
        addMessage(`Tablas disponibles: ${tables.join(', ')}`, 'assistant');

    } catch (error) {
        console.error('Setup error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        setLoadingState(false);
    }
}

// API key will be validated on first chat usage in backend

// Upload SQL file
async function uploadSqlFile(file) {
    console.log(`📤 Uploading file: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    
    const formData = new FormData();
    formData.append('sqlFile', file);

    try {
        const response = await fetch('/api/upload-sql', {
            method: 'POST',
            body: formData
        });

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
            let errorMessage;
            try {
                const error = await response.json();
                errorMessage = error.error || `Server error: ${response.status}`;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Upload successful:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Upload error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Error de conexión. Verifica que el servidor esté funcionando.');
        }
        
        throw error;
    }
}

// Fetch database tables
async function fetchTables() {
    const response = await fetch('/api/tables');
    
    if (!response.ok) {
        throw new Error('Error al obtener las tablas de la base de datos');
    }

    const data = await response.json();
    return data.tables;
}

// Send chat message
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !isSetupComplete) return;

    // Add user message
    addMessage(message, 'user');
    chatInput.value = '';

    // Show loading
    const loadingMsg = addMessage('Procesando consulta...', 'assistant loading');

    try {
        // Send to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                apiKey: apiKey,
                model: selectedModel
            })
        });

        // Remove loading message
        chatMessages.removeChild(loadingMsg);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en el procesamiento');
        }

        const data = await response.json();
        
        // Add query and results
        addQueryResult(data);

    } catch (error) {
        console.error('Chat error:', error);
        chatMessages.removeChild(loadingMsg);
        addMessage(`Error: ${error.message}`, 'error');
    }
}

// Add message to chat
function addMessage(text, type = 'assistant') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// Add query result
function addQueryResult(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    
    const queryDiv = document.createElement('div');
    queryDiv.className = 'query-sql';
    queryDiv.textContent = data.query;
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'query-result';
    
    if (data.results && data.results.length > 0) {
        resultDiv.innerHTML = `
            <p><strong>Resultados encontrados:</strong> ${data.rowCount}</p>
            ${createResultTable(data.results)}
        `;
    } else {
        resultDiv.innerHTML = '<p><em>No se encontraron resultados.</em></p>';
    }
    
    messageDiv.appendChild(queryDiv);
    messageDiv.appendChild(resultDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Create result table
function createResultTable(results) {
    if (!results || results.length === 0) {
        return '<p><em>Sin resultados</em></p>';
    }

    const headers = Object.keys(results[0]);
    const maxRows = Math.min(results.length, 100); // Limit to 100 rows

    let html = '<div class="result-table"><table>';
    
    // Headers
    html += '<thead><tr>';
    headers.forEach(header => {
        html += `<th>${escapeHtml(header)}</th>`;
    });
    html += '</tr></thead>';
    
    // Rows
    html += '<tbody>';
    for (let i = 0; i < maxRows; i++) {
        html += '<tr>';
        headers.forEach(header => {
            const value = results[i][header];
            html += `<td>${escapeHtml(value !== null ? String(value) : 'NULL')}</td>`;
        });
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    
    if (results.length > maxRows) {
        html += `<p><small>Mostrando ${maxRows} de ${results.length} resultados</small></p>`;
    }
    
    return html;
}

// Utility functions
function setLoadingState(loading) {
    setupBtn.disabled = loading;
    if (loading) {
        setupText.style.display = 'none';
        setupLoading.style.display = 'inline';
    } else {
        setupText.style.display = 'inline';
        setupLoading.style.display = 'none';
    }
}

function showStatus(message, type) {
    setupStatus.textContent = message;
    setupStatus.className = `status ${type}`;
    setupStatus.style.display = 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetApp() {
    // Reset form
    apiKeyInput.value = '';
    modelSelect.value = 'claude-3-7-sonnet-20250219'; // Reset to default
    sqlFileInput.value = '';
    apiKey = '';
    selectedModel = '';
    isSetupComplete = false;
    
    // Clear status
    setupStatus.style.display = 'none';
    chatMessages.innerHTML = '';
    
    // Show setup section
    setupSection.style.display = 'block';
    chatSection.style.display = 'none';
    
    // Re-validate form
    setupBtn.disabled = true;
}