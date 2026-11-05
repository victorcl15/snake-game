import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Renderer } from '@/engine/Renderer'
import { SnakeGame } from '@/game/SnakeGame'
import { Input } from '@/engine/Input'
import { audio } from '@/engine/Audio'
import { getLevel, LEVELS } from '@/game/levels'
import { LevelDef, DeathCause } from '@/game/types'
import { useProgress, isLevelUnlocked } from '@/stores/progressStore'
import { HUD } from './HUD'
import { LevelSelectModal } from './LevelSelectModal'
import { PauseModal } from './PauseModal'
import { EndModal } from './EndModal'
import { TouchControls } from './TouchControls'
import './GameScreen.css'

export default function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const rendererRef = useRef<Renderer | null>(null)
  const gameRef = useRef<SnakeGame | null>(null)
  const inputRef = useRef<Input | null>(null)

  const {
    unlocked,
    devUnlockAll,
    settings,
    setSetting,
    completeLevel,
    recordEndless,
    recordGame,
  } = useProgress()

  const [currentLevel, setCurrentLevel] = useState<LevelDef>(() => getLevel(unlocked || 1))
  const [score, setScore] = useState(0)
  const [eaten, setEaten] = useState(0)
  const [combo, setCombo] = useState(1)
  const [comboRemaining, setComboRemaining] = useState(0)
  const [effects, setEffects] = useState({ slow: 0, ghost: 0, double: 0 })
  const [gameStatus, setGameStatus] = useState<'countdown' | 'playing' | 'paused' | 'dead' | 'won'>('countdown')
  const [countdownNum, setCountdownNum] = useState<number | null>(3)
  const [deathCause, setDeathCause] = useState<DeathCause | null>(null)
  const [isNewBest, setIsNewBest] = useState(false)
  const [bestCombo, setBestCombo] = useState(1)
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false)
  const [isEngineReady, setIsEngineReady] = useState(false)
  const [fps, setFps] = useState(60)

  // Desbloqueo de audio por primer gesto
  const ensureAudioUnlocked = useCallback(() => {
    audio.unlock()
    audio.setSfx(settings.sfx)
    audio.setMusic(settings.music)
  }, [settings.sfx, settings.music])

  // Inicializar o reiniciar partida en un nivel
  const startNewGame = useCallback((level: LevelDef) => {
    if (!rendererRef.current) return
    ensureAudioUnlocked()
    recordGame()

    const newGame = new SnakeGame(level)
    gameRef.current = newGame
    setScore(0)
    setEaten(0)
    setCombo(1)
    setComboRemaining(0)
    setEffects({ slow: 0, ghost: 0, double: 0 })
    setGameStatus('countdown')
    setCountdownNum(3)
    setDeathCause(null)
    setIsNewBest(false)
    setBestCombo(1)
    setIsLevelSelectOpen(false)

    // Configurar eventos del juego con actualizaciones reactivas eficientes
    newGame.events = {
      onEat: (food, points, curCombo) => {
        rendererRef.current?.onEat(food, points, curCombo)
        if (food.kind === 'golden') audio.golden()
        else if (food.kind === 'apple') audio.eat(curCombo)
        else audio.powerUp()
        audio.setIntensity(Math.min(1, newGame.eaten / (level.goal === Infinity ? 30 : level.goal)))

        // Actualizar estado de React SOLO en eventos (no en cada frame)
        setScore(newGame.score)
        setEaten(newGame.eaten)
        setCombo(curCombo)
        setBestCombo(newGame.bestCombo)
        setEffects({ ...newGame.effects })
      },
      onTurn: () => {
        audio.turn()
      },
      onGraceSave: () => {
        rendererRef.current?.onGrace()
        audio.grace()
      },
      onTeleport: (from, to, color) => {
        rendererRef.current?.onTeleport(from, to, color)
        audio.teleport()
      },
      onCountdown: (n) => {
        setCountdownNum(n)
        audio.countdown(n)
        if (n <= 0) setGameStatus('playing')
      },
      onWallsAdded: (cells) => {
        rendererRef.current?.onWallsAdded(cells)
        audio.wallSpawn()
      },
      onFoodExpired: (f) => {
        rendererRef.current?.floatText(rendererRef.current.cellToWorld(f), 'EXPIRADO', '#888888')
        audio.expire()
      },
      onDie: (cause) => {
        setDeathCause(cause)
        setGameStatus('dead')
        rendererRef.current?.onDie()
        audio.die()
        audio.setIntensity(0)

        const finalScore = newGame.score
        if (newGame.isEndless) {
          const res = recordEndless(finalScore)
          setIsNewBest(res.newBest)
        }
      },
      onWin: () => {
        setGameStatus('won')
        rendererRef.current?.onWin()
        audio.win()
        audio.setIntensity(0)

        const finalScore = newGame.score
        const stars = newGame.starsFor(finalScore)
        const res = completeLevel(level.id, finalScore, stars)
        setIsNewBest(res.newBest)
      },
    }

    rendererRef.current.setGame(newGame, { intro: true })
    if (settings.music) {
      audio.startMusic()
    }
  }, [ensureAudioUnlocked, recordGame, recordEndless, completeLevel, settings.music])

  // Montar Renderer e Input
  useEffect(() => {
    if (!canvasRef.current || !overlayRef.current || !containerRef.current) return

    const renderer = new Renderer(canvasRef.current, overlayRef.current)
    rendererRef.current = renderer
    renderer.setCameraMode(settings.camera)
    renderer.setHighPerformance(settings.highPerformance)

    // Render loop ultra-fluido a 60-120 FPS sin saturar React
    renderer.onFrame((dt) => {
      const g = gameRef.current
      if (!g) return

      g.update(dt)

      // Polling de gamepad
      inputRef.current?.pollGamepad()
    })

    // Configurar Input
    const input = new Input(containerRef.current, {
      dir: (d) => {
        ensureAudioUnlocked()
        gameRef.current?.queueDir(d)
      },
      pause: () => {
        ensureAudioUnlocked()
        const g = gameRef.current
        if (g) {
          g.togglePause()
          setGameStatus(g.status)
        }
      },
      camera: () => {
        setSetting('camera', renderer.cameraMode === 'tilt' ? 'top' : 'tilt')
      },
      restart: () => {
        startNewGame(currentLevel)
      },
      confirm: () => {
        const g = gameRef.current
        if (g?.status === 'dead' || g?.status === 'won') {
          startNewGame(currentLevel)
        }
      },
      back: () => {
        setIsLevelSelectOpen((prev) => !prev)
      },
      any: () => {
        ensureAudioUnlocked()
      },
    })
    inputRef.current = input

    setIsEngineReady(true)
    startNewGame(currentLevel)

    return () => {
      input.dispose()
      renderer.dispose()
      audio.dispose()
      rendererRef.current = null
      gameRef.current = null
      inputRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Temporizador desacoplado de baja frecuencia (100ms) para barras de tiempo regresivo y FPS
  useEffect(() => {
    const timer = setInterval(() => {
      const g = gameRef.current
      if (!g) return

      if (g.status === 'playing') {
        setComboRemaining(g.comboRemaining)
        if (g.effects.slow > 0 || g.effects.ghost > 0 || g.effects.double > 0) {
          setEffects({ ...g.effects })
        }
      }

      if (rendererRef.current) {
        setFps(rendererRef.current.getFps())
      }
    }, 100)

    return () => clearInterval(timer)
  }, [])

  // Sincronizar ajustes de cámara
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setCameraMode(settings.camera)
    }
  }, [settings.camera])

  // Sincronizar ajustes de alto rendimiento
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setHighPerformance(settings.highPerformance)
    }
  }, [settings.highPerformance])

  // Sincronizar música
  useEffect(() => {
    audio.setMusic(settings.music)
    if (settings.music && gameStatus === 'playing') {
      audio.startMusic()
    } else if (!settings.music) {
      audio.stopMusic()
    }
  }, [settings.music, gameStatus])

  // Sincronizar SFX
  useEffect(() => {
    audio.setSfx(settings.sfx)
  }, [settings.sfx])

  const handleSelectLevel = (newLevel: LevelDef) => {
    setCurrentLevel(newLevel)
    startNewGame(newLevel)
  }

  const handleNextLevel = () => {
    const next = LEVELS.find((l) => l.id === currentLevel.id + 1)
    if (next && isLevelUnlocked(next.id, unlocked, devUnlockAll)) {
      setCurrentLevel(next)
      startNewGame(next)
    }
  }

  const handleTogglePause = () => {
    ensureAudioUnlocked()
    const g = gameRef.current
    if (g) {
      g.togglePause()
      setGameStatus(g.status)
    }
  }

  return (
    <div className="game-wrapper" ref={containerRef} tabIndex={0}>
      <canvas ref={canvasRef} className="babylon-canvas" />
      <div ref={overlayRef} className="floating-text-container" />

      {/* Pantalla de carga mientras se prepara Babylon */}
      {!isEngineReady && (
        <div className="loading-overlay">
          <div className="cyber-spinner" />
          <p>Iniciando Motor 3D Babylon.js...</p>
        </div>
      )}

      {/* HUD principal superior */}
      <HUD
        level={currentLevel}
        score={score}
        eaten={eaten}
        combo={combo}
        comboRemaining={comboRemaining}
        effects={effects}
        isPaused={gameStatus === 'paused'}
        cameraMode={settings.camera}
        soundOn={settings.sfx}
        musicOn={settings.music}
        showDpad={settings.dpad}
        fps={fps}
        devUnlockAll={devUnlockAll}
        onTogglePause={handleTogglePause}
        onToggleCamera={() => {
          setSetting('camera', settings.camera === 'tilt' ? 'top' : 'tilt')
        }}
        onToggleSound={() => {
          setSetting('sfx', !settings.sfx)
        }}
        onToggleMusic={() => {
          setSetting('music', !settings.music)
        }}
        onToggleDpad={() => {
          setSetting('dpad', !settings.dpad)
        }}
        onOpenLevelSelect={() => {
          ensureAudioUnlocked()
          setIsLevelSelectOpen(true)
        }}
      />

      {/* Cuenta regresiva antes de arrancar */}
      {gameStatus === 'countdown' && countdownNum !== null && (
        <div className="countdown-overlay">
          <span className="countdown-number" key={countdownNum}>
            {countdownNum > 0 ? countdownNum : '¡YA!'}
          </span>
        </div>
      )}

      {/* Controles táctiles / D-pad virtual */}
      {settings.dpad && (
        <TouchControls
          onDir={(d) => {
            ensureAudioUnlocked()
            gameRef.current?.queueDir(d)
          }}
          onPause={handleTogglePause}
        />
      )}

      {/* Modal de Pausa */}
      {gameStatus === 'paused' && !isLevelSelectOpen && (
        <PauseModal
          level={currentLevel}
          onResume={handleTogglePause}
          onRestart={() => startNewGame(currentLevel)}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        />
      )}

      {/* Modal de Fin de Partida (Muerte o Victoria) */}
      {(gameStatus === 'dead' || gameStatus === 'won') && !isLevelSelectOpen && (
        <EndModal
          status={gameStatus}
          level={currentLevel}
          score={score}
          eaten={eaten}
          bestCombo={bestCombo}
          starsEarned={gameRef.current ? gameRef.current.starsFor(score) : 0}
          isNewBest={isNewBest}
          deathCause={deathCause}
          onRestart={() => startNewGame(currentLevel)}
          onNextLevel={handleNextLevel}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        />
      )}

      {/* Modal de Selección de Nivel */}
      {isLevelSelectOpen && (
        <LevelSelectModal
          currentLevelId={currentLevel.id}
          onSelectLevel={handleSelectLevel}
          onClose={() => setIsLevelSelectOpen(false)}
        />
      )}
    </div>
  )
}
