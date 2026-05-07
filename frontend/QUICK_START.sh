#!/bin/bash

# Snake Game 3D - Babylon.js Edition
# Quick Start Script

echo "🎮 Snake Game 3D - Babylon.js Implementation"
echo "=============================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

echo "✅ Node.js versión: $(node --version)"
echo "✅ NPM versión: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error en la instalación de dependencias"
    exit 1
fi

echo "✅ Dependencias instaladas correctamente"
echo ""

# Type check
echo "🔍 Verificando tipos TypeScript..."
npm run type-check

if [ $? -ne 0 ]; then
    echo "⚠️ Hay errores de tipos, pero continuando..."
fi

echo ""
echo "🚀 Iniciando servidor de desarrollo..."
echo "📍 Abre http://localhost:3000 en tu navegador"
echo ""
echo "Controles:"
echo "  WASD/Flechas - Mover serpiente"
echo "  Mouse Drag - Rotar cámara"
echo "  Mouse Wheel - Zoom"
echo "  SPACE/P - Pausa"
echo ""

npm run dev
