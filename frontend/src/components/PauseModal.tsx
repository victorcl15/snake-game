import React from 'react'
import { LevelDef } from '@/game/types'

interface PauseModalProps {
  level: LevelDef
  onResume: () => void
  onRestart: () => void
  onOpenLevelSelect: () => void
}

export const PauseModal: React.FC<PauseModalProps> = ({
  level,
  onResume,
  onRestart,
  onOpenLevelSelect,
}) => {
  return (
    <div className="modal-backdrop" onClick={onResume}>
      <div className="modal-window pause-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pause-modal-header">
          <span className="pause-badge">EN PAUSA</span>
          <h2>{level.name}</h2>
          <p className="pause-subtitle">{level.subtitle}</p>
        </div>

        <div className="controls-cheat-sheet">
          <div className="control-row">
            <span className="control-key">W A S D / Flechas</span>
            <span className="control-desc">Mover Serpiente</span>
          </div>
          <div className="control-row">
            <span className="control-key">Espacio / P</span>
            <span className="control-desc">Pausar / Reanudar</span>
          </div>
          <div className="control-row">
            <span className="control-key">C</span>
            <span className="control-desc">Alternar Cámara (3D / 2D)</span>
          </div>
          <div className="control-row">
            <span className="control-key">R</span>
            <span className="control-desc">Reiniciar Nivel</span>
          </div>
        </div>

        <div className="pause-modal-actions">
          <button className="btn-primary-action" onClick={onResume}>
            Reanudar Juego ▶
          </button>
          <button className="btn-secondary-action" onClick={onRestart}>
            Reiniciar Nivel ↺
          </button>
          <button className="btn-secondary-action" onClick={onOpenLevelSelect}>
            Cambiar Nivel 📋
          </button>
        </div>
      </div>
    </div>
  )
}

