const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/app/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'sql-chat-mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'sqlchat',
  password: process.env.DB_PASSWORD || 'sqlchat123',
  database: process.env.DB_NAME || 'sqlchat',
  multipleStatements: true
};

let dbConnection = null;

// Initialize database connection
async function initDatabase() {
  try {
    dbConnection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    setTimeout(initDatabase, 5000); // Retry after 5 seconds
  }
}

// Clean and recreate database
async function cleanAndRecreateDatabase() {
  try {
    const dbName = process.env.DB_NAME || 'sqlchat';
    
    // Drop database if exists
    await dbConnection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    console.log(`🗑️  Database '${dbName}' dropped`);
    
    // Create database
    await dbConnection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`🆕 Database '${dbName}' created`);
    
    // Switch to the new database
    await dbConnection.query(`USE \`${dbName}\``);
    console.log(`🔄 Switched to database '${dbName}'`);
    
  } catch (error) {
    console.error('❌ Error cleaning/recreating database:', error.message);
    throw error;
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: dbConnection ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Upload and load SQL dump
app.post('/api/upload-sql', upload.single('sqlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const filename = req.file.originalname;
    const fileSize = req.file.size;
    
    console.log(`📁 Processing SQL file: ${filename} (${Math.round(fileSize / 1024)} KB)`);

    // Read SQL file
    const sqlContent = await fs.readFile(filePath, 'utf8');
    
    console.log('🗑️  Cleaning existing database...');
    
    // Clean and recreate database
    await cleanAndRecreateDatabase();
    
    console.log('📊 Loading SQL dump...');
    
    // Execute SQL dump (using query for multiple statements)
    await dbConnection.query(sqlContent);
    
    // Clean up uploaded file
    await fs.unlink(filePath);
    
    console.log('✅ SQL dump loaded successfully');
    res.json({ 
      message: 'SQL dump loaded successfully',
      filename: filename,
      size: fileSize
    });

  } catch (error) {
    console.error('❌ Error loading SQL dump:', error.message);
    
    // Clean up uploaded file if it exists
    try {
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path);
      }
    } catch (cleanupError) {
      console.error('❌ Error cleaning up file:', cleanupError.message);
    }
    
    res.status(500).json({ 
      error: 'Failed to load SQL dump',
      details: error.message
    });
  }
});

// Get database tables
app.get('/api/tables', async (req, res) => {
  try {
    const [rows] = await dbConnection.query('SHOW TABLES');
    const tables = rows.map(row => Object.values(row)[0]);
    res.json({ tables });
  } catch (error) {
    console.error('❌ Error fetching tables:', error.message);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Chat with Claude
app.post('/api/chat', async (req, res) => {
  try {
    const { message, apiKey, model } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'Claude API key is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!model) {
      return res.status(400).json({ error: 'Model selection is required' });
    }

    // Validate model
    const validModels = [
      'claude-3-5-haiku-20241022',
      'claude-3-7-sonnet-20250219', 
      'claude-opus-4-20250514'
    ];
    
    if (!validModels.includes(model)) {
      return res.status(400).json({ error: 'Invalid model selected' });
    }

    // Get database schema for context
    const [tables] = await dbConnection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    let schema = '';
    for (const table of tableNames) {
      const [columns] = await dbConnection.query(`DESCRIBE ${table}`);
      schema += `Table: ${table}\n`;
      columns.forEach(col => {
        schema += `  - ${col.Field} (${col.Type})\n`;
      });
      schema += '\n';
    }

    // Prepare prompt for Claude
    const prompt = `You are a SQL expert. Based on this database schema:

${schema}

User question: "${message}"

Please provide ONLY the SQL query (no explanations, no markdown, no additional text). The query should be safe and read-only (SELECT statements only).`;

    console.log(`🤖 Using Claude model: ${model}`);
    
    // Call Claude API
    const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: model,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    const sqlQuery = claudeResponse.data.content[0].text.trim();
    
    // Validate query is SELECT only
    if (!sqlQuery.toLowerCase().trim().startsWith('select')) {
      return res.status(400).json({ 
        error: 'Only SELECT queries are allowed for security reasons'
      });
    }

    // Execute the query
    const [results] = await dbConnection.query(sqlQuery);
    
    res.json({
      query: sqlQuery,
      results: results,
      rowCount: results.length
    });

  } catch (error) {
    console.error('❌ Chat error:', error.message);
    res.status(500).json({ 
      error: 'Chat processing failed',
      details: error.response?.data || error.message
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 SQL Chat Backend running on port ${PORT}`);
  await initDatabase();
});

process.on('SIGTERM', async () => {
  if (dbConnection) {
    await dbConnection.end();
  }
  process.exit(0);
});