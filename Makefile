.PHONY: help dev build deploy test lint clean

# ============================================================
# Snake Game 3D - Makefile
# Convenient commands for development and deployment
# ============================================================

help:
	@echo "🐍 Snake Game 3D - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev                 - Start all services in development mode"
	@echo "  make dev-frontend        - Start frontend dev server"
	@echo "  make dev-backend         - Start backend dev server"
	@echo "  make dev-db              - Start MongoDB only"
	@echo ""
	@echo "Building:"
	@echo "  make build               - Build all Docker images"
	@echo "  make build-frontend      - Build frontend image"
	@echo "  make build-backend       - Build backend image"
	@echo "  make build-devtools      - Build devtools image"
	@echo ""
	@echo "Docker Compose:"
	@echo "  make up                  - Start all services (docker-compose up)"
	@echo "  make down                - Stop all services (docker-compose down)"
	@echo "  make logs                - View all logs"
	@echo "  make ps                  - Show running containers"
	@echo ""
	@echo "Testing:"
	@echo "  make test                - Run all tests"
	@echo "  make test-frontend       - Run frontend tests"
	@echo "  make test-backend        - Run backend tests"
	@echo "  make test-coverage       - Generate coverage reports"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint                - Lint all code"
	@echo "  make lint-frontend       - Lint frontend only"
	@echo "  make lint-backend        - Lint backend only"
	@echo "  make format              - Format all code"
	@echo "  make type-check          - Check TypeScript types"
	@echo ""
	@echo "Database:"
	@echo "  make db-init             - Initialize MongoDB"
	@echo "  make db-seed             - Seed cosmetics data"
	@echo "  make db-backup           - Backup MongoDB"
	@echo "  make db-restore          - Restore MongoDB from backup"
	@echo "  make db-shell            - Open MongoDB shell"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-prod         - Deploy to production"
	@echo "  make deploy-frontend     - Deploy frontend to Vercel"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean               - Remove all build artifacts"
	@echo "  make clean-docker        - Remove Docker volumes and networks"
	@echo "  make install             - Install all dependencies"
	@echo "  make env-setup           - Setup environment files"
	@echo ""

# ============================================================
# Development Commands
# ============================================================

dev:
	docker-compose up -d

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && npm run dev

dev-db:
	docker-compose up mongodb -d

# ============================================================
# Building Commands
# ============================================================

build: build-frontend build-backend build-devtools
	@echo "✅ All images built successfully"

build-frontend:
	docker build -f .docker/Dockerfile.frontend -t snake-game-frontend:latest .

build-backend:
	docker build -f .docker/Dockerfile.backend -t snake-game-backend:latest .

build-devtools:
	docker build -f .docker/Dockerfile.devtools -t snake-game-devtools:latest .

# ============================================================
# Docker Compose Commands
# ============================================================

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-frontend:
	docker-compose logs -f frontend

logs-backend:
	docker-compose logs -f backend

logs-db:
	docker-compose logs -f mongodb

ps:
	docker-compose ps

# ============================================================
# Testing Commands
# ============================================================

test: test-frontend test-backend
	@echo "✅ All tests passed"

test-frontend:
	cd frontend && npm test

test-backend:
	cd backend && npm test

test-coverage:
	cd frontend && npm run test:coverage
	cd backend && npm run test:coverage

# ============================================================
# Code Quality Commands
# ============================================================

lint: lint-frontend lint-backend
	@echo "✅ All files linted successfully"

lint-frontend:
	cd frontend && npm run lint

lint-backend:
	cd backend && npm run lint

format: format-frontend format-backend
	@echo "✅ All files formatted"

format-frontend:
	cd frontend && npm run format

format-backend:
	cd backend && npm run format

type-check: type-check-frontend type-check-backend
	@echo "✅ All type checks passed"

type-check-frontend:
	cd frontend && npm run type-check

type-check-backend:
	cd backend && npm run type-check

# ============================================================
# Database Commands
# ============================================================

db-init:
	docker-compose exec mongodb mongosh --authenticationDatabase admin -u admin -p admin-password /docker-entrypoint-initdb.d/01-collections.js

db-seed:
	docker-compose exec mongodb mongosh --authenticationDatabase admin -u admin -p admin-password /docker-entrypoint-initdb.d/03-seed.js

db-shell:
	docker-compose exec mongodb mongosh --authenticationDatabase admin -u admin -p admin-password snake_game

db-backup:
	mkdir -p ./backups
	docker-compose exec mongodb mongodump --authenticationDatabase admin -u admin -p admin-password -d snake_game -o /backups

db-restore:
	docker-compose exec mongodb mongorestore --authenticationDatabase admin -u admin -p admin-password /backups

# ============================================================
# Installation Commands
# ============================================================

install:
	cd frontend && npm install
	cd backend && npm install
	@echo "✅ Dependencies installed"

env-setup:
	cp .env.example .env.development
	cp .env.example .env.production
	@echo "✅ Environment files created (update with your values)"

# ============================================================
# Deployment Commands
# ============================================================

deploy-prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "✅ Production deployment complete"

deploy-frontend:
	@echo "Deploying frontend to Vercel..."
	@echo "Make sure VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID are set"
	@echo "Then push to main branch to trigger GitHub Actions"

# ============================================================
# Cleanup Commands
# ============================================================

clean:
	rm -rf frontend/dist backend/dist coverage
	rm -rf node_modules frontend/node_modules backend/node_modules
	@echo "✅ Build artifacts cleaned"

clean-docker:
	docker-compose down -v
	docker volume prune -f
	@echo "✅ Docker volumes cleaned"

clean-all: clean clean-docker
	@echo "✅ Complete cleanup finished"

# ============================================================
# Status Commands
# ============================================================

status:
	@echo "🐍 Snake Game 3D - Service Status"
	@docker-compose ps
	@echo ""
	@echo "Frontend URL:  http://localhost:3000"
	@echo "Backend URL:   http://localhost:4000"
	@echo "MongoDB:       mongodb://admin:admin-password@localhost:27017/snake_game"

health-check:
	@echo "🔍 Health Check..."
	@curl -s http://localhost:4000/health | jq .
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend: OK" || echo "❌ Frontend: DOWN"

# ============================================================
# Git Commands
# ============================================================

commit-msg ?= "Update"

git-status:
	git status

git-add:
	git add -A

git-commit: git-add
	git commit -m "$(commit-msg)"

git-push: git-commit
	git push origin main

git-pull:
	git pull origin main

# ============================================================
# Docker Registry Commands
# ============================================================

docker-login:
	docker login

docker-push:
	docker push snake-game-frontend:latest
	docker push snake-game-backend:latest
	docker push snake-game-devtools:latest

docker-pull:
	docker pull snake-game-frontend:latest
	docker pull snake-game-backend:latest
