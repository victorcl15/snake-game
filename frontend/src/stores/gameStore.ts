import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'

export interface SnakeSegment {
  x: number
  y: number
  z: number
}

export interface Food {
  x: number
  y: number
  z: number
}

export interface GameState {
  // State
  snake: SnakeSegment[]
  food: Food
  direction: 'up' | 'down' | 'left' | 'right'
  nextDirection: 'up' | 'down' | 'left' | 'right'
  score: number
  level: number
  highScore: number
  gameOver: boolean
  isPaused: boolean
  isRunning: boolean
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme'
  
  // Game Stats
  foodsEaten: number
  gamesPlayed: number
  totalScore: number
  
  // Multiplayer
  isMultiplayer: boolean
  players: Record<string, SnakeSegment[]>
  playerId: string | null
  
  // Actions
  initializeGame: () => void
  moveSnake: () => void
  setDirection: (dir: 'up' | 'down' | 'left' | 'right') => void
  eatFood: () => void
  generateNewFood: () => void
  resetGame: () => void
  nextLevel: () => void
  togglePause: () => void
  startGame: () => void
  endGame: () => void
  setDifficulty: (diff: 'easy' | 'normal' | 'hard' | 'extreme') => void
  setMultiplayer: (enabled: boolean) => void
  updatePlayerSnake: (playerId: string, snake: SnakeSegment[]) => void
}

const GRID_SIZE = 20
const INITIAL_SNAKE: SnakeSegment[] = [
  { x: 10, y: 10, z: 0 },
  { x: 9, y: 10, z: 0 },
  { x: 8, y: 10, z: 0 },
]

const generateRandomPosition = () => ({
  x: Math.floor(Math.random() * GRID_SIZE),
  y: Math.floor(Math.random() * GRID_SIZE),
  z: 0,
})

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // Initial State
        snake: INITIAL_SNAKE,
        food: { x: 15, y: 15, z: 0 },
        direction: 'right',
        nextDirection: 'right',
        score: 0,
        level: 1,
        highScore: 0,
        gameOver: false,
        isPaused: false,
        isRunning: false,
        difficulty: 'normal',
        
        foodsEaten: 0,
        gamesPlayed: 0,
        totalScore: 0,
        
        isMultiplayer: false,
        players: {},
        playerId: null,
        
        // Actions
        initializeGame: () => set((state) => {
          const playerId = `player_${Date.now()}_${Math.random()}`
          return { playerId }
        }),
        
        moveSnake: () => set((state) => {
          const currentState = get()
          
          if (currentState.gameOver || !currentState.isRunning) {
            return state
          }

          const currentDirection = currentState.nextDirection
          const head = currentState.snake[0]
          let newHead: SnakeSegment = { ...head }

          switch (currentDirection) {
            case 'up':
              newHead.y = (newHead.y - 1 + GRID_SIZE) % GRID_SIZE
              break
            case 'down':
              newHead.y = (newHead.y + 1) % GRID_SIZE
              break
            case 'left':
              newHead.x = (newHead.x - 1 + GRID_SIZE) % GRID_SIZE
              break
            case 'right':
              newHead.x = (newHead.x + 1) % GRID_SIZE
              break
          }

          const collidedWithSelf = currentState.snake.some(
            (segment) => segment.x === newHead.x && segment.y === newHead.y
          )

          if (collidedWithSelf) {
            return { ...state, gameOver: true, isRunning: false }
          }

          let newSnake = [newHead, ...currentState.snake]

          if (newHead.x === currentState.food.x && newHead.y === currentState.food.y) {
            return {
              ...state,
              snake: newSnake,
              direction: currentDirection,
              score: currentState.score + 10 * currentState.level,
              foodsEaten: currentState.foodsEaten + 1,
            }
          } else {
            newSnake = newSnake.slice(0, -1)
          }

          return {
            ...state,
            snake: newSnake,
            direction: currentDirection,
          }
        }),

        setDirection: (dir) => set((state) => {
          const current = state.nextDirection
          if (
            (current === 'up' && dir === 'down') ||
            (current === 'down' && dir === 'up') ||
            (current === 'left' && dir === 'right') ||
            (current === 'right' && dir === 'left')
          ) {
            return state
          }
          return { nextDirection: dir }
        }),

        eatFood: () => set((state) => ({
          score: state.score + 10 * state.level,
          foodsEaten: state.foodsEaten + 1,
        })),

        generateNewFood: () => set(() => ({
          food: generateRandomPosition(),
        })),

        resetGame: () => set((state) => {
          const gamesPlayed = state.gamesPlayed + 1
          const totalScore = state.totalScore + state.score
          const highScore = Math.max(state.highScore, state.score)

          return {
            snake: INITIAL_SNAKE,
            food: generateRandomPosition(),
            direction: 'right',
            nextDirection: 'right',
            score: 0,
            level: 1,
            gameOver: false,
            isPaused: false,
            isRunning: false,
            gamesPlayed,
            totalScore,
            highScore,
          }
        }),

        nextLevel: () => set((state) => ({
          level: state.level + 1,
          score: state.score + 100,
        })),

        togglePause: () => set((state) => ({
          isPaused: !state.isPaused,
        })),

        startGame: () => set(() => ({
          isRunning: true,
          gameOver: false,
        })),

        endGame: () => set(() => ({
          isRunning: false,
          gameOver: true,
        })),

        setDifficulty: (diff) => set(() => ({
          difficulty: diff,
        })),

        setMultiplayer: (enabled) => set(() => ({
          isMultiplayer: enabled,
        })),

        updatePlayerSnake: (playerId, snake) => set((state) => ({
          players: {
            ...state.players,
            [playerId]: snake,
          },
        })),
      })),
      {
        name: 'snake-game-store',
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        partialize: (state) => ({
          highScore: state.highScore,
          gamesPlayed: state.gamesPlayed,
          totalScore: state.totalScore,
          difficulty: state.difficulty,
        }),
      }
    ),
    { name: 'SnakeGameStore' }
  )
)
