import React from 'react'
import { Dir } from '@/game/types'

interface TouchControlsProps {
  onDir: (d: Dir) => void
  onPause: () => void
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onDir, onPause }) => {
  const handleTouch = (d: Dir, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    onDir(d)
  }

  return (
    <div className="touch-controls-overlay">
      <div className="touch-dpad">
        <button
          className="dpad-btn dpad-up"
          onTouchStart={(e) => handleTouch('up', e)}
          onMouseDown={(e) => handleTouch('up', e)}
          aria-label="Arriba"
        >
          ▲
        </button>
        <div className="dpad-row">
          <button
            className="dpad-btn dpad-left"
            onTouchStart={(e) => handleTouch('left', e)}
            onMouseDown={(e) => handleTouch('left', e)}
            aria-label="Izquierda"
          >
            ◀
          </button>
          <button
            className="dpad-btn dpad-center"
            onTouchStart={(e) => {
              e.preventDefault()
              onPause()
            }}
            onClick={() => onPause()}
            aria-label="Pausa"
          >
            ⏸
          </button>
          <button
            className="dpad-btn dpad-right"
            onTouchStart={(e) => handleTouch('right', e)}
            onMouseDown={(e) => handleTouch('right', e)}
            aria-label="Derecha"
          >
            ▶
          </button>
        </div>
        <button
          className="dpad-btn dpad-down"
          onTouchStart={(e) => handleTouch('down', e)}
          onMouseDown={(e) => handleTouch('down', e)}
          aria-label="Abajo"
        >
          ▼
        </button>
      </div>
    </div>
  )
}

