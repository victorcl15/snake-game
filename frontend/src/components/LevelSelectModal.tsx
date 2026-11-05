import React from 'react'
import { LEVELS, ENDLESS_LEVEL, levelFeatures } from '@/game/levels'
import { LevelDef } from '@/game/types'
import { useProgress, totalStars, isLevelUnlocked } from '@/stores/progressStore'
import { audio } from '@/engine/Audio'

interface LevelSelectModalProps {
  currentLevelId: number
  onSelectLevel: (level: LevelDef) => void
  onClose: () => void
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  onSelectLevel,
  onClose,
}) => {
  const { unlocked, best, stars, devUnlockAll, toggleDevUnlockAll } = useProgress()
  const earnedStars = totalStars(stars)
  const maxPossibleStars = LEVELS.length * 3

  const handleSelect = (level: LevelDef, isLocked: boolean) => {
    if (isLocked) {
      audio.expire()
      return
    }
    audio.click()
    onSelectLevel(level)
  }

  const handleDevToggle = () => {
    audio.click()
    toggleDevUnlockAll()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window level-select-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>SELECCIÓN DE NIVEL</h2>
            <p className="modal-subtitle">
              Elige tu desafío · {earnedStars}/{maxPossibleStars} ★ Obtenidas
            </p>
          </div>
          <div className="modal-header-actions">
            {/* Botón de Modo Desarrollador para desbloquear todos los niveles */}
            <button
              className={`btn-dev-toggle ${devUnlockAll ? 'dev-active' : ''}`}
              onClick={handleDevToggle}
              title="Alternar desbloqueo total de niveles para desarrollador"
            >
              🛠 {devUnlockAll ? 'MODO DEV: TODOS DESBLOQUEADOS' : 'MODO DEV: DESACTIVADO'}
            </button>
            <button className="btn-close" onClick={onClose} title="Cerrar">
              ✕
            </button>
          </div>
        </div>

        <div className="level-grid-container">
          {/* Tarjeta de Modo Infinito */}
          <div
            className={`level-card endless-card ${currentLevelId === 0 ? 'selected' : ''}`}
            onClick={() => handleSelect(ENDLESS_LEVEL, false)}
          >
            <div className="card-badge endless-badge">SUPERVIVENCIA</div>
            <div className="level-card-body">
              <div className="level-number">∞</div>
              <h3 className="level-title">Modo Infinito</h3>
              <p className="level-desc">Obstáculos dinámicos y velocidad creciente sin fin.</p>
              <div className="level-features">
                <span className="feature-pill">Velocidad Progresiva</span>
                <span className="feature-pill">Muros Dinámicos</span>
              </div>
            </div>
            <div className="level-card-footer">
              <span className="best-score-label">Récord:</span>
              <span className="best-score-value">{best[0] || 0} pts</span>
            </div>
          </div>

          {/* Tarjetas de Niveles de Campaña */}
          {LEVELS.map((level) => {
            const isUnlocked = isLevelUnlocked(level.id, unlocked, devUnlockAll)
            const isLocked = !isUnlocked
            const isCurrent = level.id === currentLevelId
            const levelStars = stars[level.id] || 0
            const levelBest = best[level.id] || 0
            const features = levelFeatures(level)

            return (
              <div
                key={level.id}
                className={`level-card ${isLocked ? 'locked' : ''} ${isCurrent ? 'selected' : ''}`}
                style={{
                  borderColor: isCurrent ? level.theme.accent : undefined,
                }}
                onClick={() => handleSelect(level, isLocked)}
              >
                {isLocked ? (
                  <div className="lock-overlay">
                    <span className="lock-icon">🔒</span>
                    <span className="lock-text">Nivel {level.id}</span>
                  </div>
                ) : null}

                <div className="level-card-top">
                  <span className="level-id-badge">
                    NIVEL {level.id} {devUnlockAll && level.id > unlocked && <span className="dev-tag">DEV</span>}
                  </span>
                  <div className="stars-indicator">
                    {[1, 2, 3].map((starIdx) => (
                      <span
                        key={starIdx}
                        className={`star ${starIdx <= levelStars ? 'star-filled' : 'star-empty'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="level-card-body">
                  <h3 className="level-title" style={{ color: level.theme.snakeHead }}>
                    {level.name}
                  </h3>
                  <div className="level-subtitle-tag">{level.subtitle}</div>
                  <p className="level-desc">{level.description}</p>
                  <div className="level-features">
                    {features.map((f, i) => (
                      <span key={i} className="feature-pill">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="level-card-footer">
                  <div className="goal-info">
                    Meta: <strong>{level.goal}</strong> frutas
                  </div>
                  {levelBest > 0 && (
                    <div className="best-info">
                      Récord: <strong>{levelBest}</strong>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Regresar al juego
          </button>
        </div>
      </div>
    </div>
  )
}
