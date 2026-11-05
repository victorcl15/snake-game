# Snake Game 3D - PowerShell Task Runner (Windows)
# Uso: .\make.ps1 [comando]  o  .\make.bat [comando]

param (
    [Parameter(Position=0)]
    [string]$Target = "help",

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$ExtraArgs
)

$ErrorActionPreference = "Stop"

function Show-Help {
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  SNAKE GAME 3D - Comandos Disponibles (PowerShell / Windows)" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Comandos Docker:" -ForegroundColor Yellow
    Write-Host "  .\make.bat up            - Iniciar todos los servicios en segundo plano"
    Write-Host "  .\make.bat down          - Detener todos los servicios"
    Write-Host "  .\make.bat restart       - Reiniciar todos los contenedores"
    Write-Host "  .\make.bat dev           - Alias de 'up'"
    Write-Host "  .\make.bat build         - Reconstruir imagenes Docker"
    Write-Host "  .\make.bat build-frontend- Reconstruir solo la imagen frontend"
    Write-Host "  .\make.bat build-backend - Reconstruir solo la imagen backend"
    Write-Host ""
    Write-Host "Estado y Monitoreo:" -ForegroundColor Yellow
    Write-Host "  .\make.bat status        - Ver estado y URLs de acceso"
    Write-Host "  .\make.bat ps            - Ver estado de contenedores (docker compose ps)"
    Write-Host "  .\make.bat logs          - Ver logs en tiempo real"
    Write-Host "  .\make.bat health        - Verificar endpoints HTTP"
    Write-Host ""
    Write-Host "Desarrollo Local (sin Docker):" -ForegroundColor Yellow
    Write-Host "  .\make.bat dev-frontend  - Iniciar servidor Vite (npm run dev)"
    Write-Host "  .\make.bat dev-backend   - Iniciar servidor Express (npm run dev)"
    Write-Host "  .\make.bat install       - Instalar dependencias npm"
    Write-Host ""
    Write-Host "Nota para Windows:" -ForegroundColor Magenta
    Write-Host "  Tambien puedes usar directamente: docker compose up -d"
    Write-Host "  O si deseas 'make' nativo: winget install GnuWin32.Make"
    Write-Host ""
}

$cmd = $Target.ToLower()

if ($cmd -eq "help") {
    Show-Help
}
elseif ($cmd -eq "up" -or $cmd -eq "dev") {
    Write-Host "[OK] Iniciando servicios de Docker..." -ForegroundColor Green
    docker compose up -d
    Write-Host "[OK] Servicios iniciados:" -ForegroundColor Green
    Write-Host "   Frontend: http://localhost:3000/" -ForegroundColor Cyan
    Write-Host "   Nginx:    http://localhost:8080/" -ForegroundColor Cyan
    Write-Host "   Backend:  http://localhost:4000/health" -ForegroundColor Cyan
}
elseif ($cmd -eq "down") {
    Write-Host "[OK] Deteniendo servicios Docker..." -ForegroundColor Yellow
    docker compose down
    Write-Host "[OK] Servicios detenidos." -ForegroundColor Green
}
elseif ($cmd -eq "restart") {
    Write-Host "[OK] Reiniciando servicios..." -ForegroundColor Yellow
    docker compose down
    docker compose up -d
    Write-Host "[OK] Servicios reiniciados." -ForegroundColor Green
}
elseif ($cmd -eq "dev-frontend") {
    Write-Host "[OK] Iniciando servidor Vite..." -ForegroundColor Cyan
    Set-Location "$PSScriptRoot\frontend"
    npm run dev
}
elseif ($cmd -eq "dev-backend") {
    Write-Host "[OK] Iniciando servidor Backend..." -ForegroundColor Cyan
    Set-Location "$PSScriptRoot\backend"
    npm run dev
}
elseif ($cmd -eq "dev-db") {
    docker compose up mongodb -d
}
elseif ($cmd -eq "build") {
    Write-Host "[OK] Compilando imagenes Docker..." -ForegroundColor Cyan
    docker compose build
}
elseif ($cmd -eq "build-frontend") {
    Write-Host "[OK] Compilando Frontend..." -ForegroundColor Cyan
    docker compose build frontend
    docker compose up -d --no-deps frontend
}
elseif ($cmd -eq "build-backend") {
    Write-Host "[OK] Compilando Backend..." -ForegroundColor Cyan
    docker compose build backend
    docker compose up -d --no-deps backend
}
elseif ($cmd -eq "ps") {
    docker compose ps
}
elseif ($cmd -eq "status") {
    Write-Host "=== ESTADO DE CONTENEDORES ===" -ForegroundColor Cyan
    docker compose ps
    Write-Host ""
    Write-Host "URLs de acceso:" -ForegroundColor Yellow
    Write-Host "   Frontend directo:    http://localhost:3000/" -ForegroundColor White
    Write-Host "   Nginx (Proxy):       http://localhost:8080/" -ForegroundColor White
    Write-Host "   Backend API (Salud): http://localhost:4000/health" -ForegroundColor White
    Write-Host "   MongoDB:             mongodb://localhost:27017" -ForegroundColor White
}
elseif ($cmd -eq "logs") {
    docker compose logs -f
}
elseif ($cmd -eq "logs-frontend") {
    docker compose logs -f frontend
}
elseif ($cmd -eq "logs-backend") {
    docker compose logs -f backend
}
elseif ($cmd -eq "health") {
    Write-Host "Verificando endpoints..." -ForegroundColor Cyan
    try {
        $fe = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        Write-Host "   [OK] Frontend (3000): Activo" -ForegroundColor Green
    } catch {
        Write-Host "   [FALLO] Frontend (3000): Inaccesible" -ForegroundColor Red
    }

    try {
        $nx = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        Write-Host "   [OK] Nginx Proxy (8080): Activo" -ForegroundColor Green
    } catch {
        Write-Host "   [FALLO] Nginx Proxy (8080): Inaccesible" -ForegroundColor Red
    }

    try {
        $be = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        Write-Host "   [OK] Backend (4000): Activo (MongoDB: $($be.mongodb))" -ForegroundColor Green
    } catch {
        Write-Host "   [FALLO] Backend (4000): Inaccesible" -ForegroundColor Red
    }
}
elseif ($cmd -eq "install") {
    Write-Host "Instalando dependencias en frontend y backend..." -ForegroundColor Cyan
    npm install --prefix "$PSScriptRoot\frontend"
    npm install --prefix "$PSScriptRoot\backend"
    Write-Host "[OK] Instalacion completada." -ForegroundColor Green
}
elseif ($cmd -eq "clean") {
    Remove-Item -Recurse -Force "$PSScriptRoot\frontend\dist" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "$PSScriptRoot\backend\dist" -ErrorAction SilentlyContinue
    Write-Host "[OK] Limpieza completada." -ForegroundColor Green
}
else {
    Write-Host "[AVISO] Comando desconocido: '$Target'" -ForegroundColor Red
    Write-Host "Ejecuta '.\make.bat help' para ver la lista de comandos disponibles." -ForegroundColor Yellow
}
