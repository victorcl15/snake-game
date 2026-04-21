import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useGameStore } from '@/stores/gameStore'
import GameScreen from '@/components/GameScreen'
import MenuScreen from '@/components/MenuScreen'
import './App.css'

function App() {
  const [isInitialized, setIsInitialized] = useState(false)
  const { initializeGame } = useGameStore()

  useEffect(() => {
    initializeGame()
    setIsInitialized(true)
  }, [initializeGame])

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <h1>Loading Snake Game 3D...</h1>
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <div className="app">
      <GameScreen />
    </div>
  )
}

export default App
