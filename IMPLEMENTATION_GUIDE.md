# Guía Práctica: Migración Snake Game a Triple-A

**Ejemplos de Código Implementables**

---

## 1. SETUP INICIAL DEL PROYECTO

### 1.1 Crear proyecto con Vite + React

```bash
npm create vite@latest snake-game-aaa -- --template react
cd snake-game-aaa
npm install

# Instalar dependencias principales
npm install @babylonjs/core @babylonjs/inspector
npm install zustand
npm install tone
npm install @dimforge/rapier3d-compat

npm run dev
```

### 1.2 Estructura de Carpetas

```
snake-game-aaa/
├── src/
│   ├── components/
│   │   ├── GameCanvas.tsx
│   │   ├── GameUI.tsx
│   │   ├── HUD.tsx
│   │   └── PauseMenu.tsx
│   ├── stores/
│   │   └── gameStore.ts
│   ├── systems/
│   │   ├── BabylonEngine.ts
│   │   ├── PhysicsEngine.ts
│   │   ├── AudioEngine.ts
│   │   └── ParticleEffects.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── assets/
│   │   ├── particles/
│   │   ├── textures/
│   │   └── sounds/
├── vite.config.ts
└── package.json
```

---

## 2. STORE CON ZUSTAND

### 2.1 gameStore.ts

```typescript
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';

export interface SnakeSegment {
  x: number;
  y: number;
  z: number;
}

export interface Food {
  x: number;
  y: number;
  z: number;
}

export interface GameState {
  // State
  snake: SnakeSegment[];
  food: Food;
  direction: 'up' | 'down' | 'left' | 'right';
  nextDirection: 'up' | 'down' | 'left' | 'right';
  score: number;
  level: number;
  highScore: number;
  gameOver: boolean;
  isPaused: boolean;
  isRunning: boolean;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  
  // Game Stats
  foodsEaten: number;
  gamesPlayed: number;
  totalScore: number;
  
  // Multiplayer (futuro)
  players: Record<string, SnakeSegment[]>;
  
  // Actions
  moveSnake: () => void;
  setDirection: (dir: 'up' | 'down' | 'left' | 'right') => void;
  eatFood: () => void;
  generateNewFood: () => void;
  resetGame: () => void;
  nextLevel: () => void;
  togglePause: () => void;
  startGame: () => void;
  endGame: () => void;
  setDifficulty: (diff: 'easy' | 'normal' | 'hard' | 'extreme') => void;
}

const GRID_SIZE = 20;
const INITIAL_SNAKE: SnakeSegment[] = [
  { x: 10, y: 10, z: 0 },
  { x: 9, y: 10, z: 0 },
  { x: 8, y: 10, z: 0 },
];

const generateRandomPosition = () => ({
  x: Math.floor(Math.random() * GRID_SIZE),
  y: Math.floor(Math.random() * GRID_SIZE),
  z: 0,
});

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // Initial State
        snake: INITIAL_SNAKE,
        food: { x: 15, y: 15, z: 0 },
        direction: 'right',
        nextDirection: 'right',
        score: 0,
        level: 1,
        highScore: 0,
        gameOver: false,
        isPaused: false,
        isRunning: false,
        difficulty: 'normal',
        
        foodsEaten: 0,
        gamesPlayed: 0,
        totalScore: 0,
        
        players: {},
        
        // Actions
        moveSnake: () => set((state) => {
          const state_data = get();
          
          if (state_data.gameOver || !state_data.isRunning) {
            return state;
          }

          // Aplicar dirección en cola
          const currentDirection = state_data.nextDirection;
          
          const head = state_data.snake[0];
          let newHead: SnakeSegment = { ...head };

          // Calcular nueva posición
          switch (currentDirection) {
            case 'up':
              newHead.y = (newHead.y - 1 + GRID_SIZE) % GRID_SIZE;
              break;
            case 'down':
              newHead.y = (newHead.y + 1) % GRID_SIZE;
              break;
            case 'left':
              newHead.x = (newHead.x - 1 + GRID_SIZE) % GRID_SIZE;
              break;
            case 'right':
              newHead.x = (newHead.x + 1) % GRID_SIZE;
              break;
          }

          // Verificar colisión con snake
          const collidedWithSelf = state_data.snake.some(
            (segment) => segment.x === newHead.x && segment.y === newHead.y
          );

          if (collidedWithSelf) {
            return { ...state, gameOver: true, isRunning: false };
          }

          let newSnake = [newHead, ...state_data.snake];

          // Verificar comida
          if (newHead.x === state_data.food.x && newHead.y === state_data.food.y) {
            return {
              ...state,
              snake: newSnake,
              direction: currentDirection,
              score: state_data.score + 10 * state_data.level,
              foodsEaten: state_data.foodsEaten + 1,
              // generateNewFood será llamado por efecto
            };
          } else {
            // Quitar último segmento si no comió
            newSnake = newSnake.slice(0, -1);
          }

          return {
            ...state,
            snake: newSnake,
            direction: currentDirection,
          };
        }),

        setDirection: (dir) => set((state) => {
          // Prevenir reverse direction
          const current = state.nextDirection;
          if (
            (current === 'up' && dir === 'down') ||
            (current === 'down' && dir === 'up') ||
            (current === 'left' && dir === 'right') ||
            (current === 'right' && dir === 'left')
          ) {
            return state;
          }
          return { nextDirection: dir };
        }),

        eatFood: () => set((state) => ({
          score: state.score + 10 * state.level,
          foodsEaten: state.foodsEaten + 1,
        })),

        generateNewFood: () => set(() => ({
          food: generateRandomPosition(),
        })),

        resetGame: () => set((state) => {
          const gamesPlayed = state.gamesPlayed + 1;
          const totalScore = state.totalScore + state.score;
          const highScore = Math.max(state.highScore, state.score);

          return {
            snake: INITIAL_SNAKE,
            food: generateRandomPosition(),
            direction: 'right',
            nextDirection: 'right',
            score: 0,
            level: 1,
            gameOver: false,
            isPaused: false,
            isRunning: false,
            gamesPlayed,
            totalScore,
            highScore,
          };
        }),

        nextLevel: () => set((state) => ({
          level: state.level + 1,
          score: state.score + 100,
        })),

        togglePause: () => set((state) => ({
          isPaused: !state.isPaused,
        })),

        startGame: () => set(() => ({
          isRunning: true,
          gameOver: false,
        })),

        endGame: () => set(() => ({
          isRunning: false,
          gameOver: true,
        })),

        setDifficulty: (diff) => set(() => ({
          difficulty: diff,
        })),
      })),
      {
        name: 'snake-game-store',
        storage: localStorage,
        partialize: (state) => ({
          highScore: state.highScore,
          gamesPlayed: state.gamesPlayed,
          totalScore: state.totalScore,
          difficulty: state.difficulty,
        }),
      }
    ),
    { name: 'SnakeGameStore' }
  )
);
```

---

## 3. BABYLON.JS ENGINE

### 3.1 BabylonEngine.ts

```typescript
import * as BABYLON from '@babylonjs/core';
import { SnakeSegment, Food } from '../stores/gameStore';

export class BabylonEngine {
  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private camera: BABYLON.UniversalCamera;
  private snakeMeshes: BABYLON.Mesh[] = [];
  private foodMesh: BABYLON.Mesh;
  private ground: BABYLON.Mesh;
  private lights: BABYLON.Light[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    this.setupScene();
    this.setupLighting();
    this.setupCamera();
    this.createGround();
    this.setupPostProcessing();

    // Resize handler
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupScene(): void {
    // Antialiasing
    this.scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.15);
    this.scene.collisionsEnabled = true;

    // Enable shadows
    this.scene.shadowsEnabled = true;
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = 0.5;

    // Main directional light
    const dirLight = new BABYLON.DirectionalLight(
      'dirLight',
      new BABYLON.Vector3(-1, 1, -1),
      this.scene
    );
    dirLight.intensity = 0.8;
    dirLight.shadowMinZ = 1;
    dirLight.shadowMaxZ = 100;
    dirLight.shadowOrthoScale = 20;

    // Shadow generator
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 16;

    // Spotlight para efecto dinámico
    const spotLight = new BABYLON.SpotLight(
      'spotLight',
      new BABYLON.Vector3(10, 20, 10),
      new BABYLON.Vector3(0, -1, -1),
      Math.PI / 3,
      2,
      this.scene
    );
    spotLight.intensity = 0.3;
    spotLight.range = 50;

    this.lights = [ambientLight, dirLight, spotLight];
  }

  private setupCamera(): void {
    this.camera = new BABYLON.UniversalCamera(
      'camera',
      new BABYLON.Vector3(10, 15, 20),
      this.scene
    );
    this.camera.attachControl(null, true);
    this.camera.setTarget(new BABYLON.Vector3(10, 10, 0));
    this.camera.inertia = 0.8;
    this.camera.angularSensibility = 1000;
  }

  private createGround(): void {
    this.ground = BABYLON.MeshBuilder.CreateBox(
      'ground',
      { width: 20, height: 1, depth: 20 },
      this.scene
    );
    this.ground.position.y = -1;

    // Material para el suelo
    const groundMaterial = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMaterial.diffuse = new BABYLON.Color3(0.2, 0.2, 0.25);
    groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    this.ground.material = groundMaterial;
  }

  private setupPostProcessing(): void {
    // Bloom effect
    const pipeline = new BABYLON.StandardRenderingPipeline(
      'standard',
      this.scene,
      [this.camera]
    );
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.8;
    pipeline.bloomKernel = 64;

    // Depth of Field
    const dof = new BABYLON.DepthOfFieldEffect(
      this.scene,
      this.camera,
      {
        focusDistance: 1000,
        focalLength: 50,
        cocScale: 2.0,
      }
    );

    // Grain (opcional)
    const grain = new BABYLON.GrainEffect(this.scene, 0.5);
  }

  createSnakeSegment(position: SnakeSegment): BABYLON.Mesh {
    const segment = BABYLON.MeshBuilder.CreateBox(
      `snake-segment`,
      { size: 0.9 },
      this.scene
    );

    segment.position = new BABYLON.Vector3(position.x, position.z + 0.5, position.y);

    // Material PBR para realismo
    const material = new BABYLON.StandardMaterial('snakeMaterial', this.scene);
    material.diffuse = new BABYLON.Color3(0.1, 0.9, 0.2);
    material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    material.specularPower = 64;
    material.ambientColor = new BABYLON.Color3(0.1, 0.2, 0.1);

    segment.material = material;
    segment.receiveShadows = true;
    segment.castShadows = true;

    return segment;
  }

  createFoodMesh(position: Food): BABYLON.Mesh {
    const food = BABYLON.MeshBuilder.CreateSphere(
      'food',
      { diameter: 0.8, segments: 32 },
      this.scene
    );

    food.position = new BABYLON.Vector3(position.x, position.z + 0.5, position.y);

    // Material brillante para comida
    const foodMaterial = new BABYLON.StandardMaterial('foodMaterial', this.scene);
    foodMaterial.emissiveColor = new BABYLON.Color3(1, 0.8, 0);
    foodMaterial.diffuse = new BABYLON.Color3(1, 0.9, 0);
    foodMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
    foodMaterial.specularPower = 128;

    food.material = foodMaterial;
    food.receiveShadows = true;

    // Animación de rotación
    this.scene.registerBeforeRender(() => {
      food.rotation.x += 0.02;
      food.rotation.y += 0.03;
      food.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
    });

    return food;
  }

  updateSnake(snake: SnakeSegment[]): void {
    // Limpiar meshes viejos
    this.snakeMeshes.forEach((mesh) => mesh.dispose());
    this.snakeMeshes = [];

    // Crear nuevos
    snake.forEach((segment, index) => {
      const mesh = this.createSnakeSegment(segment);

      // Escala diferente para cabeza
      if (index === 0) {
        mesh.scaling = new BABYLON.Vector3(1.1, 1.1, 1.1);
        const headMaterial = new BABYLON.StandardMaterial(
          'headMaterial',
          this.scene
        );
        headMaterial.diffuse = new BABYLON.Color3(0, 1, 0.3);
        headMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        headMaterial.specularPower = 128;
        mesh.material = headMaterial;
      }

      this.snakeMeshes.push(mesh);
    });
  }

  updateFood(food: Food): void {
    if (this.foodMesh) {
      this.foodMesh.dispose();
    }
    this.foodMesh = this.createFoodMesh(food);
  }

  render(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }

  getScene(): BABYLON.Scene {
    return this.scene;
  }

  enableInspector(): void {
    if ((window as any).BABYLON) {
      (window as any).BABYLON.Inspector.Show(this.scene, {});
    }
  }
}
```

---

## 4. AUDIO ENGINE CON TONE.JS

### 4.1 AudioEngine.ts

```typescript
import * as Tone from 'tone';

export class AudioEngine {
  private synth: Tone.PolySynth<Tone.Synth>;
  private bass: Tone.Synth;
  private drums: Tone.Sampler;
  private loop: Tone.Loop;
  private transport: Tone.Transport;
  private initialized = false;

  constructor() {
    this.transport = Tone.getTransport();

    // Synth para notas
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 0.1,
      },
    }).toDestination();

    // Bass sintetizado
    this.bass = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.2,
        release: 0.5,
      },
    });

    // Conectar a destination con volume
    const volume = new Tone.Volume(-10);
    this.bass.connect(volume);
    volume.toDestination();

    // Música de fondo generativa
    this.loop = new Tone.Loop((time) => {
      this.playBackgroundNote(time);
    }, '2n');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();
    this.initialized = true;
  }

  playEatSound(): void {
    if (!this.initialized) return;
    this.synth.triggerAttackRelease('C5', '16n');
    this.synth.triggerAttackRelease('E5', '16n', '+0.1');
    this.synth.triggerAttackRelease('G5', '16n', '+0.2');
  }

  playGameOverSound(): void {
    if (!this.initialized) return;
    this.bass.triggerAttackRelease('C2', '2n');
    setTimeout(() => {
      this.bass.triggerAttackRelease('G1', '2n');
    }, 300);
  }

  playLevelUp(): void {
    if (!this.initialized) return;
    this.synth.triggerAttackRelease('E5', '8n');
    this.synth.triggerAttackRelease('G5', '8n', '+0.1');
    this.synth.triggerAttackRelease('C6', '8n', '+0.2');
  }

  private playBackgroundNote(time: Tone.Time): void {
    const notes = ['C4', 'E4', 'G4', 'B4'];
    const randomNote = notes[Math.floor(Math.random() * notes.length)];

    this.synth.triggerAttackRelease(randomNote, '4n', time);

    // Bass alternado
    if (Math.random() > 0.5) {
      this.bass.triggerAttackRelease('C2', '2n', time);
    }
  }

  startBackgroundMusic(): void {
    if (!this.initialized) return;
    this.loop.start(0);
    this.transport.start();
  }

  stopBackgroundMusic(): void {
    this.loop.stop();
    this.transport.stop();
  }

  setVolume(level: number): void {
    Tone.Destination.volume.value = level;
  }
}
```

---

## 5. COMPONENTE PRINCIPAL REACT

### 5.1 GameCanvas.tsx

```typescript
import React, { useEffect, useRef } from 'react';
import { BabylonEngine } from '../systems/BabylonEngine';
import { AudioEngine } from '../systems/AudioEngine';
import { useGameStore } from '../stores/gameStore';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BabylonEngine | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);

  const {
    snake,
    food,
    direction,
    score,
    level,
    moveSnake,
    setDirection,
    eatFood,
    generateNewFood,
    startGame,
    resetGame,
    isRunning,
    gameOver,
    isPaused,
  } = useGameStore();

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BabylonEngine(canvasRef.current);
    engineRef.current = engine;

    const audio = new AudioEngine();
    audioRef.current = audio;
    audio.initialize();

    engine.render();

    // Update initial state
    engine.updateSnake(snake);
    engine.updateFood(food);

    // Inspector (debug)
    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift' && e.ctrlKey && e.key === '\\') {
          engine.enableInspector();
        }
      });
    }

    return () => {
      engine.dispose();
    };
  }, []);

  // Update snake mesh
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateSnake(snake);
    }
  }, [snake]);

  // Update food mesh
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateFood(food);
    }
  }, [food]);

  // Game loop
  useEffect(() => {
    if (!isRunning || gameOver || isPaused) return;

    let difficulty = 200; // ms entre movimientos
    const difficultyMap: Record<string, number> = {
      easy: 300,
      normal: 200,
      hard: 100,
      extreme: 50,
    };

    const gameState = useGameStore.getState();
    difficulty = difficultyMap[gameState.difficulty];

    const interval = setInterval(() => {
      moveSnake();

      // Verificar comida
      const head = useGameStore.getState().snake[0];
      const currentFood = useGameStore.getState().food;

      if (head.x === currentFood.x && head.y === currentFood.y) {
        audioRef.current?.playEatSound();
        eatFood();
        generateNewFood();
      }

      // Verificar game over
      const newSnake = useGameStore.getState().snake;
      if (newSnake.length > 1) {
        const head = newSnake[0];
        const hitItself = newSnake.slice(1).some(
          (segment) => segment.x === head.x && segment.y === head.y
        );

        if (hitItself) {
          audioRef.current?.playGameOverSound();
          useGameStore.getState().endGame();
        }
      }
    }, difficulty);

    return () => clearInterval(interval);
  }, [isRunning, gameOver, isPaused]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          setDirection('up');
          e.preventDefault();
          break;
        case 'arrowdown':
        case 's':
          setDirection('down');
          e.preventDefault();
          break;
        case 'arrowleft':
        case 'a':
          setDirection('left');
          e.preventDefault();
          break;
        case 'arrowright':
        case 'd':
          setDirection('right');
          e.preventDefault();
          break;
        case 'enter':
          if (gameOver) {
            resetGame();
            startGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDirection, gameOver, resetGame, startGame]);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};
```

---

## 6. COMPONENTE UI

### 6.1 HUD.tsx

```typescript
import React from 'react';
import { useGameStore } from '../stores/gameStore';
import './HUD.css';

export const HUD: React.FC = () => {
  const { score, level, highScore, foodsEaten, isRunning, gameOver, isPaused } =
    useGameStore();

  return (
    <div className="hud">
      <div className="hud-container">
        <div className="stat-box">
          <label>SCORE</label>
          <value>{score.toString().padStart(6, '0')}</value>
        </div>

        <div className="stat-box">
          <label>LEVEL</label>
          <value>{level}</value>
        </div>

        <div className="stat-box">
          <label>HIGH SCORE</label>
          <value>{highScore.toString().padStart(6, '0')}</value>
        </div>

        <div className="stat-box">
          <label>FOOD</label>
          <value>{foodsEaten}</value>
        </div>

        <div className="status-indicator">
          {isPaused && <div className="status paused">PAUSED</div>}
          {gameOver && <div className="status game-over">GAME OVER</div>}
          {isRunning && <div className="status running">PLAYING</div>}
        </div>
      </div>
    </div>
  );
};
```

### 6.2 HUD.css

```css
.hud {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 20px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent);
  z-index: 100;
  font-family: 'Courier New', monospace;
  color: #0f0;
  text-shadow: 0 0 10px #0f0;
}

.hud-container {
  display: flex;
  gap: 30px;
  max-width: 800px;
  margin: 0 auto;
  justify-content: center;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-box label {
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 2px;
  opacity: 0.7;
}

.stat-box value {
  font-size: 24px;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  animation: glow 0.5s ease-in-out;
}

@keyframes glow {
  0% {
    text-shadow: 0 0 5px #0f0, 0 0 10px #0f0;
  }
  50% {
    text-shadow: 0 0 15px #0f0, 0 0 20px #0f0;
  }
  100% {
    text-shadow: 0 0 5px #0f0, 0 0 10px #0f0;
  }
}

.status-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 2px;
}

.status {
  padding: 8px 16px;
  border: 2px solid;
  border-radius: 4px;
  animation: pulse 1s infinite;
}

.status.paused {
  color: #ffff00;
  border-color: #ffff00;
}

.status.game-over {
  color: #ff0000;
  border-color: #ff0000;
}

.status.running {
  color: #00ff00;
  border-color: #00ff00;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

## 7. VITE CONFIGURATION

### 7.1 vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ['@babylonjs/core'],
          tone: ['tone'],
        },
      },
    },
  },
  server: {
    host: 'localhost',
    port: 3000,
    hmr: true,
    open: true,
  },
  optimizeDeps: {
    include: ['@babylonjs/core', 'tone', 'zustand'],
  },
});
```

---

## 8. PACKAGE.JSON

### 8.1 Dependencias Necesarias

```json
{
  "name": "snake-game-aaa",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@babylonjs/core": "^6.0.0",
    "@babylonjs/inspector": "^6.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tone": "^14.8.0",
    "zustand": "^4.4.0",
    "@react-three/rapier": "^1.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## 9. CSS GLOBAL

### 9.1 index.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: 'Courier New', monospace;
  background: linear-gradient(135deg, #0a0e27 0%, #1a0033 100%);
  color: #0f0;
}

#root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.game-canvas {
  width: 100% !important;
  height: 100% !important;
}

/* Scroll bar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a0033;
}

::-webkit-scrollbar-thumb {
  background: #0f0;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #0f0;
  opacity: 0.7;
}
```

---

## 10. PRÓXIMOS PASOS DE IMPLEMENTACIÓN

1. **Crear estructura de proyecto** con Vite
2. **Implementar Babylon.js engine** básico
3. **Configurar store con Zustand**
4. **Agregar Tone.js audio**
5. **Crear componentes UI React**
6. **Agregar efectos de partículas**
7. **Optimizar performance**
8. **Agregar más niveles y power-ups**
9. **Implementar leaderboard**
10. **Deploy en Netlify/Vercel**

---

**¡Listo para comenzar a migrar tu Snake Game a Triple-A!** 🚀

