# 🐍 Snake Game 3D - Complete Setup Guide

## 🎯 Overview

This is a **production-ready** Snake Game with Triple-A quality graphics using:
- **Frontend**: React 18 + Babylon.js 3D + Zustand
- **Backend**: Express + Socket.io + Mongoose
- **Database**: MongoDB 7 Alpine
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel (Frontend) + Docker (Backend)

## 📋 Prerequisites

### Required
- Docker & Docker Compose
- Node.js 18+ (for local development)
- npm or yarn
- Git

### Optional (for development)
- Visual Studio Code
- MongoDB Compass (database UI)
- Postman (API testing)

## 🚀 Quick Start (5 minutes)

### 1. Iniciar el Proyecto (Docker)

El proyecto cuenta con wrappers listos para usar en cualquier terminal:

#### En Windows (PowerShell / CMD):
```powershell
# Iniciar todos los servicios
.\make.bat up
# o directamente con Docker Compose:
docker compose up -d
```

#### En Git Bash / Linux / macOS:
```bash
# Iniciar todos los servicios
./make up
# o con Make clásico (si está instalado):
make up
```

### 2. Comandos Útiles Disponibles

| Acción | Windows (PowerShell / CMD) | Git Bash / Linux | Comando Directo |
|---|---|---|---|
| Iniciar contenedores | `.\make.bat up` | `./make up` | `docker compose up -d` |
| Detener contenedores | `.\make.bat down` | `./make down` | `docker compose down` |
| Reiniciar contenedores | `.\make.bat restart` | `./make restart` | `docker compose down && docker compose up -d` |
| Ver estado y URLs | `.\make.bat status` | `./make status` | `docker compose ps` |
| Ver logs en vivo | `.\make.bat logs` | `./make logs` | `docker compose logs -f` |
| Reconstruir frontend | `.\make.bat build-frontend` | `./make build-frontend` | `docker compose build frontend` |
| Verificar salud de APIs | `.\make.bat health` | `./make health` | `curl http://localhost:4000/health` |

> **Nota para Windows:**
> Windows no incluye la utilidad GNU Make por defecto. Por eso creamos `make.bat` y `make.ps1` (para PowerShell y CMD) y `./make` (para Git Bash). Si deseas usar `make` a secas de forma global en cualquier terminal de Windows, puedes instalarlo con:
> `winget install GnuWin32.Make` (o `choco install make`).

### 3. Acceso a las Aplicaciones

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **WebSocket**: http://localhost:4001
- **MongoDB**: mongodb://admin:admin-password@localhost:27017/snake_game

## 📁 Project Structure

```
snake-game/
├── .docker/                    # Docker configurations
│   ├── Dockerfile.frontend     # React + Babylon.js
│   ├── Dockerfile.backend      # Express + Socket.io
│   └── Dockerfile.devtools     # ESLint, Vitest, Playwright
│
├── .github/workflows/          # CI/CD Automation
│   ├── test.yml               # Linting + Unit Tests
│   ├── build.yml              # Docker Image Build
│   └── deploy.yml             # Deploy to Vercel
│
├── frontend/                   # React 18 Application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── stores/            # Zustand state management
│   │   ├── systems/           # Babylon.js engine (to be created)
│   │   └── utils/             # Helper functions
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts         # Build configuration
│
├── backend/                    # Express.js Application
│   ├── src/
│   │   ├── routes/            # API endpoints (to be created)
│   │   ├── services/          # Business logic (to be created)
│   │   └── utils/             # Logger, helpers
│   ├── package.json
│   └── tsconfig.json
│
├── database/                   # MongoDB
│   └── init/
│       ├── 01-collections.js  # Schema definitions
│       ├── 02-indexes.js      # Performance indexes
│       └── 03-seed.js         # Initial data
│
├── nginx/                      # Reverse Proxy
│   ├── nginx.conf             # Main configuration
│   └── conf.d/
│       ├── frontend.conf      # SPA routing
│       ├── api.conf           # API proxy
│       └── pwa.conf           # WebSocket proxy
│
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production overrides
├── Makefile                    # Convenience commands
├── .env.example                # Environment template
└── .backup/                    # Backup of original files
```

## 🐳 Docker Commands

### Development Mode

```bash
# Start all services
make up

# Stop all services
make down

# View logs
make logs
make logs-frontend
make logs-backend
make logs-db

# Check status
make ps
make status
make health-check
```

### Production Mode

```bash
# Deploy production stack
make deploy-prod

# Using docker-compose directly
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔨 Development Commands

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format

# Testing
npm run test
npm run test:ui
npm run test:coverage
```

### Backend

```bash
cd backend

# Development server
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

### All Projects

```bash
# Run all linters
make lint

# Run all tests
make test

# Format all code
make format

# Type check everything
make type-check
```

## 🗄️ Database Management

### Initialize MongoDB

```bash
# Automatic on first docker-compose up
# Manual initialization:
make db-init
make db-seed

# Open MongoDB shell
make db-shell
```

### Data Structure

**Collections Created:**
1. `players` - User accounts and statistics
2. `games` - Game records and replays
3. `rooms` - Multiplayer game rooms
4. `cosmetics` - Avatar customization items
5. `player_cosmetics` - User-owned cosmetics
6. `leaderboard` - Cached rankings

**Indexes:** 25+ performance indexes created automatically

**Seed Data:** 12 cosmetics pre-loaded (4 skins, 3 trails, 3 mice, 2 effects)

## 🧪 Testing & Quality

### Run Tests

```bash
# Frontend + Backend
make test

# Frontend only
make test-frontend

# Backend only
make test-backend

# Coverage reports
make test-coverage
```

### Code Quality

```bash
# Lint all code
make lint

# Format all code
make format

# Type checking
make type-check
```

## 🚢 Deployment

### Frontend Deployment (Vercel)

```bash
# Prerequisites
export VERCEL_TOKEN=<your-token>
export VERCEL_ORG_ID=<your-org-id>
export VERCEL_PROJECT_ID=<your-project-id>

# Deploy via GitHub Actions (automatic on push to main)
# Or manual:
make deploy-frontend
```

### Backend Deployment Options

#### Option 1: Docker Hub + Deploy Service

```bash
# Login to Docker
make docker-login

# Build and push images
make build
make docker-push

# Deploy on your infrastructure
docker pull <your-registry>/snake-game-backend:latest
docker run -d \
  -p 4000:4000 \
  -e MONGODB_URI=<your-mongodb-uri> \
  <your-registry>/snake-game-backend:latest
```

#### Option 2: DigitalOcean App Platform

```bash
# Configuration in .github/workflows/deploy.yml
# Push to main branch to trigger
```

#### Option 3: Heroku

```bash
heroku create snake-game-backend
heroku config:set NODE_ENV=production MONGODB_URI=<uri>
git push heroku main
```

## 📝 Environment Variables

### Development (.env.development)

```
NODE_ENV=development
MONGODB_URI=mongodb://admin:admin-password@mongodb:27017/snake_game_dev
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

### Production (.env.production)

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/snake_game_prod
PORT=4000
CORS_ORIGIN=https://snake-game.vercel.app
JWT_SECRET=<strong-random-key>
```

## 🔐 Security Best Practices

### For Production

1. **Change default MongoDB credentials**
2. **Generate strong JWT_SECRET**
3. **Enable HTTPS in Nginx**
4. **Setup SSL certificates**
5. **Configure firewall rules**
6. **Use environment-specific secrets**
7. **Enable CORS only for trusted origins**
8. **Rate limit aggressively**

### GitHub Secrets Setup

```bash
# In GitHub repository settings, add:
DOCKER_USERNAME=<docker-hub-username>
DOCKER_PASSWORD=<docker-hub-token>
VERCEL_TOKEN=<vercel-token>
VERCEL_ORG_ID=<vercel-org-id>
VERCEL_PROJECT_ID=<vercel-project-id>
```

## 📊 Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# With timestamps
docker-compose logs -f --timestamps
```

### Health Checks

```bash
# Check all services health
make health-check

# Check backend API
curl http://localhost:4000/health | jq

# Check frontend
curl -s http://localhost:3000 | head
```

## 🧹 Cleanup & Maintenance

### Clean Build Artifacts

```bash
# Remove built files
make clean

# Remove Docker volumes
make clean-docker

# Complete cleanup
make clean-all
```

### Database Backup

```bash
# Backup MongoDB
make db-backup

# Restore from backup
make db-restore
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or change port in .env
```

### MongoDB Connection Failed

```bash
# Check MongoDB is running
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Docker Build Fails

```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache
```

### Node Modules Issues

```bash
# Clear node_modules
make clean

# Reinstall dependencies
make install
```

## 📚 Additional Resources

- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [Express.js Guide](https://expressjs.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Docker Documentation](https://docs.docker.com/)
- [Vercel Documentation](https://vercel.com/docs)

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Run tests and linting
4. Create a pull request

```bash
git checkout -b feature/amazing-feature
# ... make changes ...
make lint
make test
git push origin feature/amazing-feature
```

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review GitHub Issues
3. Consult documentation files
4. Open a new issue with details

---

**Last Updated:** April 21, 2026
**Version:** 1.0.0-alpha
**Status:** Ready for Development

🚀 Happy Gaming!
