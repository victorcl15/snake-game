import React from 'react'
import { LevelDef } from '@/game/types'
import { CameraMode } from '@/engine/Renderer'
import { COMBO_WINDOW } from '@/game/SnakeGame'

interface HUDProps {
  level: LevelDef
  score: number
  eaten: number
  combo: number
  comboRemaining: number
  effects: { slow: number; ghost: number; double: number }
  isPaused: boolean
  cameraMode: CameraMode
  soundOn: boolean
  musicOn: boolean
  showDpad: boolean
  fps: number
  devUnlockAll: boolean
  onTogglePause: () => void
  onToggleCamera: () => void
  onToggleSound: () => void
  onToggleMusic: () => void
  onToggleDpad: () => void
  onOpenLevelSelect: () => void
}

export const HUD: React.FC<HUDProps> = ({
  level,
  score,
  eaten,
  combo,
  comboRemaining,
  effects,
  isPaused,
  cameraMode,
  soundOn,
  musicOn,
  showDpad,
  fps,
  devUnlockAll,
  onTogglePause,
  onToggleCamera,
  onToggleSound,
  onToggleMusic,
  onToggleDpad,
  onOpenLevelSelect,
}) => {
  const isEndless = !!level.endless
  const goalProgress = isEndless ? 1 : Math.min(1, eaten / Math.max(1, level.goal))
  const comboRatio = Math.max(0, Math.min(1, comboRemaining / COMBO_WINDOW))

  return (
    <div className="game-hud">
      {/* Barra superior izquierda: Nivel, Indicador Dev y Botón de selección */}
      <div className="hud-group hud-left">
        <button
          className="btn-hud level-selector-btn"
          onClick={onOpenLevelSelect}
          title="Cambiar Nivel / Modo Desarrollador"
        >
          <span className="level-badge">{isEndless ? '∞' : `LVL ${level.id}`}</span>
          {devUnlockAll && <span className="dev-pill-hud" title="Modo Desarrollador activo">DEV</span>}
          <span className="level-name-hud">{level.name}</span>
          <span className="change-icon">▼</span>
        </button>

        {/* Progreso de la meta */}
        <div className="hud-goal-box">
          <div className="hud-goal-header">
            <span className="hud-label">{isEndless ? 'FRUTAS' : 'META'}</span>
            <span className="hud-value">
              {eaten} {isEndless ? '' : `/ ${level.goal}`}
            </span>
          </div>
          {!isEndless && (
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${goalProgress * 100}%`,
                  backgroundColor: level.theme.accent,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Barra central: Puntuación y Combo activo */}
      <div className="hud-group hud-center">
        <div className="score-display">
          <span className="score-label">SCORE</span>
          <span className="score-num">{score.toLocaleString()}</span>
        </div>

        {combo > 1 && (
          <div className="combo-container animate-pulse">
            <div className="combo-badge">COMBO x{combo}</div>
            <div className="combo-bar-bg">
              <div
                className="combo-bar-fill"
                style={{ width: `${comboRatio * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Powerups activos */}
        <div className="active-powerups">
          {effects.slow > 0 && (
            <div className="powerup-badge powerup-slow">
              ⏱ LENTO ({Math.ceil(effects.slow / 1000)}s)
            </div>
          )}
          {effects.ghost > 0 && (
            <div className="powerup-badge powerup-ghost">
              👻 FANTASMA ({Math.ceil(effects.ghost / 1000)}s)
            </div>
          )}
          {effects.double > 0 && (
            <div className="powerup-badge powerup-double">
              ✨ PUNTOS x2 ({Math.ceil(effects.double / 1000)}s)
            </div>
          )}
        </div>
      </div>

      {/* Barra superior derecha: FPS Counter, Controles y Ajustes */}
      <div className="hud-group hud-right">
        {/* Contador de FPS en tiempo real */}
        <div className={`fps-badge ${fps >= 55 ? 'fps-high' : fps >= 30 ? 'fps-med' : 'fps-low'}`} title="Tasa de cuadros por segundo">
          {fps} FPS
        </div>

        <button
          className={`btn-hud-icon ${cameraMode === 'top' ? 'active' : ''}`}
          onClick={onToggleCamera}
          title={cameraMode === 'top' ? 'Cámara: Superior (C)' : 'Cámara: Dinámica 3D (C)'}
        >
          {cameraMode === 'top' ? '📐 2D' : '🎥 3D'}
        </button>

        <button
          className={`btn-hud-icon ${soundOn ? 'active' : 'muted'}`}
          onClick={onToggleSound}
          title="Efectos de Sonido"
        >
          {soundOn ? '🔊' : '🔇'}
        </button>

        <button
          className={`btn-hud-icon ${musicOn ? 'active' : 'muted'}`}
          onClick={onToggleMusic}
          title="Música Procedural"
        >
          {musicOn ? '🎵' : '🎼'}
        </button>

        <button
          className={`btn-hud-icon ${showDpad ? 'active' : ''}`}
          onClick={onToggleDpad}
          title="Controles táctiles en pantalla"
        >
          🎮
        </button>

        <button
          className={`btn-hud-icon pause-btn ${isPaused ? 'paused' : ''}`}
          onClick={onTogglePause}
          title="Pausa (Espacio / P)"
        >
          {isPaused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  )
}
