# Makefile compatible con Windows y Linux
# Detecta automáticamente el sistema operativo

# Variables
COMPOSE_FILE = docker-compose.yml
PROJECT_NAME = sql-chat

# Detectar comando Docker Compose disponible
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)
ifndef DOCKER_COMPOSE
    DOCKER_COMPOSE := docker compose
endif

# Detectar sistema operativo
ifeq ($(OS),Windows_NT)
    DETECTED_OS := Windows
    SHELL := cmd.exe
    .SHELLFLAGS := /c
else
    DETECTED_OS := $(shell uname -s)
    SHELL := /bin/bash
endif

# Comandos principales
.PHONY: help start stop restart build logs clean status test

# Ayuda (comando por defecto)
help:
	@echo "=== SQL Chat Application ==="
	@echo "Sistema detectado: $(DETECTED_OS)"
	@echo ""
	@echo "Comandos disponibles:"
	@echo "  make start    - Iniciar todos los servicios"
	@echo "  make stop     - Detener todos los servicios"
	@echo "  make restart  - Reiniciar todos los servicios"
	@echo "  make build    - Construir las imágenes Docker"
	@echo "  make logs     - Ver logs de todos los servicios"
	@echo "  make status   - Ver estado de los contenedores"
	@echo "  make clean    - Limpiar contenedores y volúmenes"
	@echo "  make test     - Probar conectividad de servicios"
	@echo ""
	@echo "Después de 'make start', abre: http://localhost:8080"

# Iniciar servicios
start:
	@echo "🚀 Iniciando SQL Chat Application..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) up -d
	@echo ""
	@echo "✅ Servicios iniciados!"
	@echo "📱 Frontend: http://localhost:8080"
	@echo "🔌 Backend API: http://localhost:3001"
	@echo "🗃️  MySQL: localhost:3307"
	@echo ""
	@echo "💡 Usa 'make logs' para ver los logs en tiempo real"

# Detener servicios
stop:
	@echo "🛑 Deteniendo servicios..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) down
	@echo "✅ Servicios detenidos"

# Reiniciar servicios
restart: stop start

# Construir imágenes
build:
	@echo "🔨 Construyendo imágenes Docker..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) build --no-cache
	@echo "✅ Imágenes construidas"

# Ver logs
logs:
	@echo "📋 Mostrando logs (Ctrl+C para salir)..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) logs -f

# Ver estado
status:
	@echo "📊 Estado de los contenedores:"
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) ps

# Limpiar todo
clean:
	@echo "🧹 Limpiando contenedores, redes y volúmenes..."
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) down -v --remove-orphans
	docker system prune -f
	@echo "✅ Limpieza completada"

# Probar servicios
test:
	@echo "🔍 Probando conectividad de servicios..."
	@echo "Backend Health Check:"
	@curl -s http://localhost:3001/api/health || echo "❌ Backend no responde"
	@echo ""
	@echo "Frontend:"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8080 || echo "❌ Frontend no responde"

# Comandos de desarrollo adicionales
dev-logs-backend:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) logs -f sql-chat-backend

dev-logs-mysql:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) logs -f sql-chat-mysql

dev-shell-backend:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec sql-chat-backend sh

dev-shell-mysql:
	$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec sql-chat-mysql mysql -u sqlchat -p sqlchat