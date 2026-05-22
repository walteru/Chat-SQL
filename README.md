# 🤖 SQL Chat - Consultas con IA

Aplicación web que permite cargar dumps de bases de datos MySQL y realizar consultas en lenguaje natural usando Claude AI.

## 🚀 Inicio Rápido

### Prerrequisitos
- Docker y Docker Compose instalados
- API Key de Claude (Anthropic)

### Instalación

1. **Clonar el proyecto**
```bash
git clone git@github.com:walteru/Chat-SQL.git
cd Chat-SQL
```

2. **Iniciar la aplicación**
```bash
make start
```

3. **Abrir en navegador**
```
http://localhost:8080
```

## 📋 Uso

### 1. Configuración Inicial
- Ingresa tu **Claude API Key** (sk-ant-api03-...)
- Selecciona tu archivo **dump.sql**
- Haz clic en **"Cargar Base de Datos"**

### 2. Chat con IA
Una vez cargada la base de datos:
- Escribe consultas en **lenguaje natural**
- Ejemplo: *"Muestra todos los usuarios activos"*
- La IA convertirá tu pregunta a SQL y ejecutará la consulta

### 3. Seguridad
- Solo se ejecutan consultas **SELECT**: se valida que sea **una única sentencia**
  SELECT (se rechazan sentencias apiladas tipo `SELECT 1; DROP TABLE ...`, los
  `SELECT ... INTO OUTFILE/DUMPFILE`, y **cualquier comentario SQL** `/* */ -- #`
  —que MySQL trata como espacio y permitiría ofuscar keywords—), y además la
  query del chat corre en una conexión con `multipleStatements: false` que rechaza
  varias sentencias a nivel del driver. Ver `backend/sqlGuard.js` (con tests en
  `backend/sqlGuard.test.js`).
  > Nota: por seguridad la validación es conservadora; rechaza la query aunque el
  > comentario o el texto `into outfile` aparezcan dentro de un string literal.
- Tu API key **no se guarda** en el servidor
- Los datos se procesan localmente en Docker

> Endurecimiento opcional recomendado para entornos sensibles: usar un usuario
> MySQL con permisos `SELECT` únicamente para las consultas del chat (defensa en
> profundidad sobre la validación).

## 🛠️ Comandos Disponibles

```bash
make start     # Iniciar todos los servicios
make stop      # Detener servicios
make restart   # Reiniciar servicios
make logs      # Ver logs en tiempo real
make status    # Ver estado de contenedores
make clean     # Limpiar todo (contenedores, volúmenes)
make test      # Probar conectividad
```

## 🏗️ Arquitectura

- **Frontend**: HTML/CSS/JavaScript (host 8080)
- **Backend**: Node.js + Express (host 3001 → 3000 interno)
- **Base de datos**: MySQL 8.0 (host 3307 → 3306 interno)
- **Proxy**: Nginx

> Normalmente solo necesitás el frontend en `http://localhost:8080`; Nginx hace de proxy hacia el backend. Los puertos de backend y MySQL se exponen al host solo para depuración.

## 🔧 Desarrollo

### Ver logs específicos
```bash
make dev-logs-backend    # Solo backend
make dev-logs-mysql      # Solo MySQL
```

### Acceder a contenedores
```bash
make dev-shell-backend   # Shell del backend
make dev-shell-mysql     # MySQL CLI
```

## ⚡ Puertos

| Servicio | Puerto host | Puerto interno | URL |
|----------|-------------|----------------|-----|
| Frontend | 8080 | 80 | http://localhost:8080 |
| Backend API | 3001 | 3000 | http://localhost:3001 |
| MySQL | 3307 | 3306 | mysql://localhost:3307 |

## 🔐 Seguridad

- API Key se maneja solo en frontend
- Validación de consultas SQL
- Solo queries SELECT permitidas
- Límites de tamaño de archivo (500MB)
- Timeout en consultas

## 📁 Estructura del Proyecto

```
sql-chat-app/
├── docker-compose.yml    # Configuración Docker
├── Makefile             # Comandos de gestión
├── nginx.conf           # Configuración proxy
├── backend/             # API Node.js
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
├── frontend/            # Interfaz web
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
└── uploads/            # Archivos temporales
```

## 🐛 Troubleshooting

### La aplicación no inicia
```bash
make clean && make build && make start
```

### Error de permisos (Linux)
```bash
sudo chown -R $USER:$USER uploads/
```

### MySQL no responde
```bash
make dev-logs-mysql
# Esperar que aparezca "ready for connections"
```

### API Key inválida
- Verifica que empiece con `sk-ant-api03-`
- Comprueba en https://console.anthropic.com/

## 📝 Notas

- Compatible con **Windows** y **Linux**
- Archivos SQL hasta **500MB**
- Resultados limitados a **100 filas** por consulta
- Sesión temporal (se pierde al recargar página)

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs: `make logs`
2. Verifica el estado: `make status` 
3. Reinicia: `make restart`