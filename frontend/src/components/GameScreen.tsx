import { useEffect, useRef } from 'react'
import { useGameStore } from '@/stores/gameStore'
import './GameScreen.css'

export default function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isRunning, score, level, startGame } = useGameStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Babylon.js engine will be initialized here
    // For now, show placeholder
    ctx.fillStyle = '#0a0e27'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.fillStyle = '#00ff00'
    ctx.font = '24px monospace'
    ctx.fillText('Snake Game 3D - Babylon.js Engine Loading...', 50, 50)
  }, [])

  return (
    <div className="game-screen">
      <canvas ref={canvasRef} className="game-canvas" />
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
      {!isRunning && (
        <button className="start-btn" onClick={() => startGame()}>
          START GAME
        </button>
      )}
    </div>
  )
}
