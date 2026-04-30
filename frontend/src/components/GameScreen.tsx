import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { BabylonEngine } from '@/systems/BabylonEngine'
import { InputController } from '@/systems/InputController'
import './GameScreen.css'

export default function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<BabylonEngine | null>(null)
  const inputRef = useRef<InputController | null>(null)
  const [isEngineReady, setIsEngineReady] = useState(false)
  const [engineError, setEngineError] = useState<string | null>(null)
  const [stats, setStats] = useState({ fps: 0 })

  const {
    isRunning,
    score,
    level,
    gameOver,
    isPaused,
    startGame,
    moveSnake,
    setDirection,
    togglePause,
    resetGame,
    snake,
    food,
    foodsEaten,
  } = useGameStore()

  // Inicializar engine
  useEffect(() => {
    if (!canvasRef.current || engineRef.current) return

    const initializeEngine = async () => {
      try {
        const engine = new BabylonEngine(canvasRef.current!)
        await engine.initialize()

        engineRef.current = engine
        setIsEngineReady(true)
        console.log('[GameScreen] Babylon.js engine inicializado')

        // Crear malla inicial
        if (snake && snake.length > 0) {
          engine.createSnakeMesh(snake)
        }
        if (food) {
          engine.createFoodMesh(food)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        setEngineError(message)
        console.error('[GameScreen] Error iniciando engine:', message)
      }
    }

    initializeEngine()

    // Cleanup
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose()
        engineRef.current = null
      }
    }
  }, [])

  // Actualizar snake en la escena 3D
  useEffect(() => {
    if (!engineRef.current || !snake) return
    engineRef.current.updateSnakeMesh(snake)
  }, [snake])

  // Actualizar comida en la escena 3D y reproducir efectos
  useEffect(() => {
    if (!engineRef.current || !food) return
    engineRef.current.updateFoodMesh(food)
  }, [food])

  // Reproducir efectos cuando se come comida
  const prevFoodsRef = useRef(0)
  useEffect(() => {
    if (foodsEaten > prevFoodsRef.current && engineRef.current && food) {
      engineRef.current.playFoodEatenEffect(food).catch(() => {})
      engineRef.current.playScoreEffect()
      prevFoodsRef.current = foodsEaten
    }
  }, [foodsEaten, food])

  // Manejar pausa/reanudación
  useEffect(() => {
    if (!engineRef.current) return

    if (gameOver) {
      engineRef.current.pauseRendering()
      engineRef.current.playGameOverEffect()
    } else if (!isRunning) {
      engineRef.current.pauseRendering()
    } else {
      engineRef.current.resumeRendering()
    }
  }, [isRunning, gameOver])

  // Configurar input controller
  useEffect(() => {
    if (!isEngineReady) return

    if (!inputRef.current) {
      inputRef.current = new InputController()

      // Configurar callbacks
      inputRef.current.onDirection((direction) => {
        setDirection(direction)
      })

      inputRef.current.onCameraRotationChange((angle) => {
        engineRef.current?.rotateCameraAround(angle)
      })

      inputRef.current.onZoomChange((factor) => {
        engineRef.current?.setCameraZoom(factor)
      })

      inputRef.current.onPauseToggle(() => {
        if (isRunning && !gameOver) {
          togglePause()
        }
      })
    }

    return () => {
      // No disponer aquí porque los listeners globales deben continuar
    }
  }, [isEngineReady, setDirection, togglePause, isRunning, gameOver])

  // Game loop - mover serpiente
  useEffect(() => {
    if (!isRunning || isPaused || gameOver) return

    const interval = setInterval(() => {
      moveSnake()
    }, 100)

    return () => clearInterval(interval)
  }, [isRunning, isPaused, gameOver, moveSnake])

  // Actualizar stats
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current && isEngineReady) {
        const state = engineRef.current.getRenderState()
        setStats({ fps: state.fps })
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isEngineReady])

  if (engineError) {
    return (
      <div className="game-screen error">
        <div className="error-message">
          <h2>Error al inicializar Babylon.js</h2>
          <p>{engineError}</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {!isEngineReady && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <p>Inicializando Babylon.js 3D Engine...</p>
        </div>
      )}

      <div className="hud">
        <div className="stat-box">
          <span className="stat-label">SCORE</span>
          <span className="stat-value">{score.toString().padStart(6, '0')}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">LEVEL</span>
          <span className="stat-value">{level}</span>
        </div>
      </div>

      {isRunning && (
        <div className="game-info">
          <span className="fps-counter">FPS: {stats.fps}</span>
          {isPaused && <span className="pause-indicator">PAUSED</span>}
        </div>
      )}

      {!isRunning && isEngineReady && (
        <div className="menu-overlay">
          <div className="menu-content">
            <h1>Snake Game 3D</h1>
            <p className="subtitle">Babylon.js Edition</p>
            <button className="start-btn" onClick={() => startGame()}>
              {gameOver ? 'RESTART GAME' : 'START GAME'}
            </button>
            <div className="controls-info">
              <p>Controls:</p>
              <ul>
                <li>WASD or Arrow Keys - Move Snake</li>
                <li>Mouse Drag - Rotate Camera</li>
                <li>Mouse Wheel - Zoom Camera</li>
                <li>SPACE or P - Pause Game</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {gameOver && !isPaused && (
        <div className="gameover-overlay">
          <div className="gameover-content">
            <h2>GAME OVER</h2>
            <p className="final-score">Final Score: {score}</p>
            <button className="restart-btn" onClick={() => resetGame()}>
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
