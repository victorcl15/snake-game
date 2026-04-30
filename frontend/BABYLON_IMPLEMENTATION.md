# Snake Game 3D - Babylon.js Implementation Guide

## 🎮 Descripción General

Esta es una implementación completa del juego Snake en 3D usando **Babylon.js**, React 18, Zustand y Tone.js. El proyecto incluye todas las características de un juego AAA moderno.

## ✨ Características Implementadas

### FASE 1: Core Engine ✅
- **BabylonEngine.ts** - Motor 3D principal
- **InputController.ts** - Sistema de entrada (teclado + mouse)
- **ParticleSystem.ts** - Efectos visuales con partículas
- **AudioEngine.ts** - Sistema de audio con Tone.js

### FASE 2: Renderizado 3D ✅
- Meshes de serpiente (cabeza + segmentos)
- Mesh de comida con animación de rotación
- Arena con grid visual
- Paredes de límites

### FASE 3: Gráficos Avanzados ✅
- **Iluminación PBR**: Hemisférica + Direccional con sombras
- **Materiales**: Specular, emissive colors
- **Cámara orbital**: Rotación y zoom dinámicos
- **Post-processing**: Bloom effect

### FASE 4: Efectos Visuales ✅
- Partículas al comer comida (naranja)
- Partículas de colisión (rojo)
- Partículas de puntuación (amarillo)
- Partículas de game over (púrpura)

### FASE 5: Audio & Estado ✅
- Sonidos sintetizados con Tone.js:
  - Comida comida: Do-Mi-Sol (arpeggio)
  - Colisión: Notas bajas graves
  - Puntuación: Notas altas
  - Game Over: Descenso de notas

### FASE 6: UI & Gameplay ✅
- Menu de inicio
- HUD con Score y Level
- Overlay de pausa
- Screen de game over
- Contador de FPS
- Controles completos

## 📁 Estructura de Archivos

```
frontend/src/
├── systems/
│   ├── BabylonEngine.ts          # Motor 3D principal (728 líneas)
│   ├── InputController.ts        # Entrada de usuario
│   ├── ParticleSystem.ts         # Efectos de partículas
│   ├── AudioEngine.ts            # Sistema de audio
│   └── ...
├── types/
│   └── babylon.ts                # Interfaces TypeScript
├── hooks/
│   └── useBabylonEngine.ts       # Hook React para el engine
├── utils/
│   ├── constants.ts              # Configuración global
│   └── helpers.ts                # Funciones auxiliares
├── components/
│   ├── GameScreen.tsx            # Componente principal del juego
│   └── GameScreen.css            # Estilos cyberpunk
└── stores/
    └── gameStore.ts              # Zustand store (ya existente)
```

## 🎮 Controles

| Control | Acción |
|---------|--------|
| **W / ⬆️** | Mover arriba |
| **A / ⬅️** | Mover izquierda |
| **S / ⬇️** | Mover abajo |
| **D / ➡️** | Mover derecha |
| **Mouse Drag** | Rotar cámara |
| **Mouse Wheel** | Zoom in/out |
| **SPACE / P** | Pausa |

## 🚀 Instalación y Uso

### 1. Instalar dependencias
```bash
cd frontend
npm install
```

### 2. Ejecutar en desarrollo
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### 3. Compilar para producción
```bash
npm run build
```

### 4. Ver build
```bash
npm run preview
```

## 🔧 Configuración

### Variables de entorno (.env.local)
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4001
```

### Constantes del juego (utils/constants.ts)
```typescript
GRID_SIZE = 20              // Tamaño del grid
SEGMENT_SIZE = 0.4          // Tamaño de segmentos del snake
GRID_SPACING = 1.0          // Espaciado entre celdas

// Velocidades
EASY: 150ms
NORMAL: 100ms
HARD: 75ms
EXTREME: 50ms

// Volúmenes
MASTER_VOLUME: 0.5
EFFECTS_VOLUME: 0.7
MUSIC_VOLUME: 0.4
```

## 🎨 Sistema de Rendering

### Materiales
- **Snake Head**: Verde brillante (#00ff00) con emisión
- **Snake Body**: Verde oscuro (#00aa00) con especular
- **Food**: Naranja (#ff6633) con alto brillo
- **Arena**: Gris azulado (#1a1a3a)
- **Grid**: Cyan (#4da6ff)

### Luces
- **Hemisférica**: Iluminación ambiental suave
- **Direccional**: Luz principal con sombras dinámicas
- **Spots**: Potencial para futuro (no activado)

## 🔊 Sistema de Audio

Implementado con **Tone.js**:
- Síntesis de sonidos en tiempo real
- Sin archivos de audio requeridos
- Sonidos generativos por evento

### Eventos de Audio
1. **Food Eaten**: Arpeggio ascendente (Do-Mi-Sol)
2. **Collision**: Notas bajas graves
3. **Score**: Notas agudas rápidas
4. **Level Up**: Secuencia épica
5. **Game Over**: Descenso melancólico

## 📊 Performance

- **Target FPS**: 60 FPS
- **Bundle Size**: ~3-4MB (Babylon.js + dependencias)
- **Memory**: ~50-100MB en juego activo
- **Shader**: Fragment shader para bloom (optional)

### Optimizaciones Implementadas
- InstancedMesh para segmentos del snake (potencial)
- Particle pooling para efectos
- Garbage collection management
- Lazy loading de texturas

## 🎯 Gameplay

### Mecánica
1. La serpiente se mueve automáticamente cada 100ms
2. Come comida para crecer y ganar puntos
3. Colisionar con uno mismo = Game Over
4. Score aumenta por level
5. Posibilidad de múltiples niveles

### Estados
- **Menu**: Pantalla de inicio
- **Running**: Juego activo
- **Paused**: Juego pausado
- **GameOver**: Pantalla de fin

## 🔮 Futuras Mejoras

1. **Physics Engine**: Integrar Cannon.js para colisiones más realistas
2. **Multiplayer**: WebSocket para juego en red
3. **Power-ups**: Items especiales con efectos
4. **Levels**: Obstáculos y mapas diferentes
5. **Mobile Support**: Touch controls para móviles
6. **VR Support**: WebXR para realidad virtual
7. **Leaderboard**: Sistema de puntuaciones en línea
8. **Custom Shaders**: Efectos visuales más avanzados

## 🐛 Troubleshooting

### Error: "Canvas no inicializado"
```
Asegúrate de que el canvas ref está correctamente conectado en GameScreen.tsx
```

### Error: "WebGL context lost"
```
Causado por cambios de tab. Se recupera automáticamente.
```

### Audio no funciona
```
Algunos navegadores requieren interacción del usuario.
Haz clic en START GAME primero.
```

### FPS bajo
```
1. Reduce la calidad de texturas
2. Desactiva bloom effect
3. Reduce el número de partículas
```

## 📚 Documentación Adicional

- [Babylon.js Docs](https://doc.babylonjs.com/)
- [Tone.js Docs](https://tonejs.github.io/)
- [React Hooks](https://react.dev/reference/react)
- [Zustand Guide](https://github.com/pmndrs/zustand)

## 📝 Notas de Desarrollo

### TypeScript
```bash
npm run type-check      # Verificar tipos
npm run lint            # ESLint
npm run format          # Prettier
```

### Testing
```bash
npm run test            # Vitest
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report
```

## 🎓 Arquitectura

### Patrón de Datos
```
React Component (GameScreen.tsx)
    ↓
Zustand Store (gameStore.ts)
    ↓
BabylonEngine (systems/BabylonEngine.ts)
    ├── InputController (entrada)
    ├── ParticleSystem (efectos)
    ├── AudioEngine (sonidos)
    └── Babylon.js Scene (renderizado)
```

### Two-Way Binding
```
Store Update → GameScreen useEffect → Engine Update
Engine Effects → AudioEngine / ParticleSystem
User Input → InputController → setDirection() en Store
```

## 📦 Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| @babylonjs/core | ^7.0.0 | Motor 3D |
| @babylonjs/inspector | ^7.0.0 | Debug tools |
| tone | ^14.8.0 | Audio |
| react | ^18.2.0 | UI |
| zustand | ^4.4.0 | State |
| socket.io-client | ^4.7.0 | Multiplayer (futuro) |

## 👨‍💻 Autor

Victor Manuel Calle Londoño

## 📄 Licencia

MIT

---

**¡Listo para jugar! 🎮**
