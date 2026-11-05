import React from 'react'
import { LevelDef, DeathCause } from '@/game/types'
import { LEVELS } from '@/game/levels'

interface EndModalProps {
  status: 'dead' | 'won'
  level: LevelDef
  score: number
  eaten: number
  bestCombo: number
  starsEarned: number
  isNewBest: boolean
  deathCause: DeathCause | null
  onRestart: () => void
  onNextLevel?: () => void
  onOpenLevelSelect: () => void
}

export const EndModal: React.FC<EndModalProps> = ({
  status,
  level,
  score,
  eaten,
  bestCombo,
  starsEarned,
  isNewBest,
  deathCause,
  onRestart,
  onNextLevel,
  onOpenLevelSelect,
}) => {
  const isWon = status === 'won'
  const isEndless = !!level.endless
  const nextLevel = LEVELS.find((l) => l.id === level.id + 1)
  const hasNext = isWon && !!nextLevel && !isEndless

  const deathMessage = () => {
    switch (deathCause) {
      case 'wall':
        return '¡Choque contra el muro perimetral!'
      case 'self':
        return '¡Te mordiste tu propia cola!'
      case 'sentinel':
        return '¡Interceptado por un dron centinela!'
      default:
        return '¡Fin de la partida!'
    }
  }

  return (
    <div className="modal-backdrop">
      <div className={`modal-window end-modal ${isWon ? 'victory-window' : 'gameover-window'}`}>
        <div className="end-modal-header">
          <div className="end-badge">{isWon ? '¡NIVEL COMPLETADO!' : 'FIN DEL JUEGO'}</div>
          <h2 className="end-title">
            {isWon ? '¡Victoria Rotunda!' : deathMessage()}
          </h2>
          <p className="end-subtitle">
            {isEndless
              ? 'Has demostrado gran destreza en el Modo Infinito.'
              : `${level.name} · Nivel ${level.id}`}
          </p>
        </div>

        {/* Estrellas (en niveles de campaña) */}
        {!isEndless && (
          <div className="stars-result-container">
            {[1, 2, 3].map((starIdx) => (
              <span
                key={starIdx}
                className={`star-large ${starIdx <= starsEarned ? 'star-gold' : 'star-dim'}`}
              >
                ★
              </span>
            ))}
          </div>
        )}

        {/* Resumen de estadísticas */}
        <div className="end-stats-grid">
          <div className="stat-card">
            <span className="stat-title">PUNTUACIÓN</span>
            <span className="stat-number score-accent">{score.toLocaleString()}</span>
            {isNewBest && <span className="new-record-pill">¡NUEVO RÉCORD!</span>}
          </div>

          <div className="stat-card">
            <span className="stat-title">FRUTAS COMIDAS</span>
            <span className="stat-number">{eaten}</span>
          </div>

          <div className="stat-card">
            <span className="stat-title">MEJOR COMBO</span>
            <span className="stat-number">x{bestCombo}</span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="end-modal-actions">
          {hasNext && onNextLevel && (
            <button className="btn-primary-action btn-next-level" onClick={onNextLevel}>
              Siguiente Nivel (Nivel {nextLevel?.id}) ▶
            </button>
          )}

          <button className="btn-primary-action" onClick={onRestart}>
            {isWon ? 'Repetir Nivel' : 'Jugar de Nuevo'} ↺
          </button>

          <button className="btn-secondary-action" onClick={onOpenLevelSelect}>
            Seleccionar Nivel 📋
          </button>
        </div>
      </div>
    </div>
  )
}

