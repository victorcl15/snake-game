#!/usr/bin/env bash
# Snake Game 3D - Git Bash / Linux wrapper
TARGET="${1:-help}"

case "$TARGET" in
  help)
    echo "🐍 Snake Game 3D - Comandos Disponibles"
    echo ""
    echo "  ./make up             - Iniciar todos los servicios (docker compose up -d)"
    echo "  ./make down           - Detener todos los servicios (docker compose down)"
    echo "  ./make restart        - Reiniciar servicios"
    echo "  ./make dev            - Iniciar servicios con Docker"
    echo "  ./make dev-frontend   - Iniciar servidor Vite de desarrollo"
    echo "  ./make dev-backend    - Iniciar servidor Express de desarrollo"
    echo "  ./make dev-db         - Iniciar solo MongoDB"
    echo "  ./make build          - Compilar imágenes Docker"
    echo "  ./make status         - Ver estado de contenedores y URLs"
    echo "  ./make ps             - Ver contenedores activos"
    echo "  ./make logs           - Ver logs en vivo"
    echo "  ./make health         - Verificar salud de los servicios"
    echo "  ./make install        - Instalar dependencias npm"
    echo "  ./make clean          - Limpiar carpetas dist"
    ;;
  up|dev)
    docker compose up -d
    ;;
  down)
    docker compose down
    ;;
  restart)
    docker compose down && docker compose up -d
    ;;
  dev-frontend)
    cd frontend && npm run dev
    ;;
  dev-backend)
    cd backend && npm run dev
    ;;
  dev-db)
    docker compose up mongodb -d
    ;;
  build)
    docker compose build
    ;;
  build-frontend)
    docker compose build frontend && docker compose up -d --no-deps frontend
    ;;
  build-backend)
    docker compose build backend && docker compose up -d --no-deps backend
    ;;
  ps)
    docker compose ps
    ;;
  status)
    docker compose ps
    echo ""
    echo "Frontend:  http://localhost:3000/"
    echo "Nginx:     http://localhost:8080/"
    echo "Backend:   http://localhost:4000/health"
    ;;
  logs)
    docker compose logs -f
    ;;
  health)
    curl -s http://localhost:4000/health
    echo ""
    curl -I -s http://localhost:3000/ | head -n 1
    curl -I -s http://localhost:8080/ | head -n 1
    ;;
  install)
    (cd frontend && npm install) && (cd backend && npm install)
    ;;
  clean)
    rm -rf frontend/dist backend/dist
    ;;
  *)
    echo "Comando desconocido: $TARGET"
    echo "Ejecuta ./make help para ver los comandos disponibles."
    ;;
esac

