import React, { useState } from 'react'
import { LEVELS, ENDLESS_LEVEL, levelFeatures } from '@/game/levels'
import { LevelDef } from '@/game/types'
import { useProgress, totalStars, isLevelUnlocked } from '@/stores/progressStore'
import { audio } from '@/engine/Audio'

interface LevelSelectModalProps {
  currentLevelId: number
  onSelectLevel: (level: LevelDef) => void
  onClose: () => void
}

type TierFilter = 'all' | 'novice' | 'expert' | 'master' | 'demon' | 'endless'

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  onSelectLevel,
  onClose,
}) => {
  const { unlocked, best, stars, devUnlockAll, toggleDevUnlockAll } = useProgress()
  const [filter, setFilter] = useState<TierFilter>('all')

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

  // Lista unificada y predecible de niveles según el filtro seleccionado
  const displayLevels: LevelDef[] = []
  if (filter === 'all') {
    displayLevels.push(...LEVELS, ENDLESS_LEVEL)
  } else if (filter === 'novice') {
    displayLevels.push(...LEVELS.filter((lvl) => lvl.id >= 1 && lvl.id <= 3))
  } else if (filter === 'expert') {
    displayLevels.push(...LEVELS.filter((lvl) => lvl.id >= 4 && lvl.id <= 7))
  } else if (filter === 'master') {
    displayLevels.push(...LEVELS.filter((lvl) => lvl.id >= 8 && lvl.id <= 10))
  } else if (filter === 'demon') {
    displayLevels.push(...LEVELS.filter((lvl) => lvl.id === 11))
  } else if (filter === 'endless') {
    displayLevels.push(ENDLESS_LEVEL)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window level-select-modal" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado Principal Responsivo */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>SELECCIÓN DE NIVEL</h2>
            <p className="modal-subtitle">
              Elige tu desafío · {earnedStars}/{maxPossibleStars} ★ Obtenidas · 11 Niveles + Modo Infinito
            </p>
          </div>
          <div className="modal-header-actions">
            <button
              className={`btn-dev-toggle ${devUnlockAll ? 'dev-active' : ''}`}
              onClick={handleDevToggle}
              title="Alternar desbloqueo total de niveles para desarrollador"
            >
              🛠 {devUnlockAll ? 'MODO DEV: DESBLOQUEO TOTAL' : 'MODO DEV: NORMAL'}
            </button>
            <button className="btn-close" onClick={onClose} title="Cerrar (Esc)">
              ✕
            </button>
          </div>
        </div>

        {/* Barra de Filtros / Categorías Rápidas */}
        <div className="tier-filter-bar">
          <button
            className={`tier-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => {
              audio.hover()
              setFilter('all')
            }}
          >
            Todos ({LEVELS.length + 1})
          </button>
          <button
            className={`tier-btn ${filter === 'novice' ? 'active' : ''}`}
            onClick={() => {
              audio.hover()
              setFilter('novice')
            }}
          >
            🌱 Básico (1-3)
          </button>
          <button
            className={`tier-btn ${filter === 'expert' ? 'active' : ''}`}
            onClick={() => {
              audio.hover()
              setFilter('expert')
            }}
          >
            ⚡ Avanzado (4-7)
          </button>
          <button
            className={`tier-btn ${filter === 'master' ? 'active' : ''}`}
            onClick={() => {
              audio.hover()
              setFilter('master')
            }}
          >
            🔮 Maestría (8-10)
          </button>
          <button
            className={`tier-btn tier-demon-btn ${filter === 'demon' ? 'active' : ''}`}
            onClick={() => {
              audio.hover()
              setFilter('demon')
            }}
          >
            🔥 INFIERNO (11)
          </button>
          <button
            className={`tier-btn ${filter === 'endless' ? 'active' : ''}`}
            onClick={() => {
              audio.hover()
              setFilter('endless')
            }}
          >
            ∞ Infinito
          </button>
        </div>

        {/* Contenedor de Tarjetas con Scroll Fluido y Estructura 100% Homogénea */}
        <div className="level-grid-container">
          {displayLevels.map((level) => {
            const isEndless = level.id === 0
            const isUnlocked = isEndless || isLevelUnlocked(level.id, unlocked, devUnlockAll)
            const isLocked = !isUnlocked
            const isCurrent = level.id === currentLevelId
            const isDemon = level.id === 11
            const levelStars = stars[level.id] || 0
            const levelBest = best[level.id] || 0
            const features = isEndless
              ? ['Muros Dinámicos', 'Aceleración Continua', 'Power-ups']
              : levelFeatures(level)

            return (
              <div
                key={level.id}
                className={`level-card ${isLocked ? 'locked' : ''} ${isCurrent ? 'selected' : ''} ${isDemon ? 'demon-card' : ''} ${isEndless ? 'endless-card' : ''}`}
                style={{
                  borderColor: isCurrent ? level.theme.accent : undefined,
                }}
                onClick={() => handleSelect(level, isLocked)}
              >
                {isLocked ? (
                  <div className="lock-overlay">
                    <span className="lock-icon">🔒</span>
                    <span className="lock-text">Nivel {level.id} Bloqueado</span>
                    <span className="lock-hint">Completa el Nivel {level.id - 1}</span>
                  </div>
                ) : null}

                {/* Top header de la card: ID badge y etiquetas a la izquierda, estrellas a la derecha */}
                <div className="level-card-top">
                  <div className="level-badge-wrap">
                    <span className="level-id-badge">
                      {isEndless ? 'EXTRA' : `NIVEL ${level.id}`}
                    </span>
                    {devUnlockAll && !isEndless && level.id > unlocked && (
                      <span className="dev-tag">DEV</span>
                    )}
                    {isDemon && (
                      <span className="card-tag demon-tag">🔥 PESADILLA</span>
                    )}
                    {isEndless && (
                      <span className="card-tag endless-tag">SUPERVIVENCIA</span>
                    )}
                  </div>

                  <div className="level-card-top-right">
                    {!isEndless ? (
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
                    ) : (
                      <span className="endless-symbol">∞</span>
                    )}
                  </div>
                </div>

                {/* Cuerpo con texto elástico y alineación uniforme */}
                <div className="level-card-body">
                  <h3 className="level-title" style={{ color: level.theme.snakeHead }}>
                    {isEndless ? 'Modo Infinito' : level.name}
                  </h3>
                  <div className="level-subtitle-tag">{level.subtitle}</div>
                  <p className="level-desc">{level.description}</p>
                  <div className="level-features">
                    {features.map((f, i) => (
                      <span
                        key={i}
                        className={`feature-pill ${f.includes('BOSS') || f.includes('MÁXIMA') ? 'feature-boss' : ''}`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer siempre alineado al fondo */}
                <div className="level-card-footer">
                  <div className="goal-info">
                    Meta: <strong>{isEndless ? 'Supervivencia' : `${level.goal} frutas`}</strong>
                  </div>
                  <div className="best-info">
                    {levelBest > 0 ? (
                      <>Récord: <strong>{levelBest} pts</strong></>
                    ) : (
                      <span className="no-record">Sin récord</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer del Modal */}
        <div className="modal-footer">
          <div className="footer-tip">
            💡 <em>Consejo: Puedes alternar entre vista 3D y vista cenital con la tecla <strong>C</strong>.</em>
          </div>
          <button className="btn-secondary" onClick={onClose}>
            Regresar al juego
          </button>
        </div>
      </div>
    </div>
  )
}
