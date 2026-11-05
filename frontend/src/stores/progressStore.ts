import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { LEVELS } from '@/game/levels'
import type { CameraMode } from '@/engine/Renderer'

export interface Settings {
  music: boolean
  sfx: boolean
  camera: CameraMode
  dpad: boolean
  fpsCounter: boolean
  highPerformance: boolean
}

// Lectura de variables de entorno (Vite / Docker)
const envUnlock =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_UNLOCK_ALL_LEVELS === 'true') ||
  (typeof process !== 'undefined' && process.env?.VITE_UNLOCK_ALL_LEVELS === 'true')

export interface ProgressState {
  /** nivel más alto desbloqueado en campaña normal */
  unlocked: number
  best: Record<number, number>
  stars: Record<number, number>
  endlessBest: number
  gamesPlayed: number
  /** Modo desarrollador: desbloquea todos los niveles para testing */
  devUnlockAll: boolean
  settings: Settings

  toggleDevUnlockAll: () => void
  completeLevel: (id: number, score: number, stars: number) => { newBest: boolean }
  recordEndless: (score: number) => { newBest: boolean }
  recordGame: () => void
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  resetProgress: () => void
}

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      unlocked: 1,
      best: {},
      stars: {},
      endlessBest: 0,
      gamesPlayed: 0,
      devUnlockAll: envUnlock ?? true,
      settings: {
        music: true,
        sfx: true,
        camera: 'tilt',
        dpad: !!isTouch,
        fpsCounter: true,
        highPerformance: true,
      },

      toggleDevUnlockAll: () => set((s) => ({ devUnlockAll: !s.devUnlockAll })),

      completeLevel: (id, score, stars) => {
        const s = get()
        const newBest = score > (s.best[id] ?? 0)
        set({
          unlocked: Math.min(LEVELS.length, Math.max(s.unlocked, id + 1)),
          best: { ...s.best, [id]: Math.max(score, s.best[id] ?? 0) },
          stars: { ...s.stars, [id]: Math.max(stars, s.stars[id] ?? 0) },
        })
        return { newBest }
      },

      recordEndless: (score) => {
        const newBest = score > get().endlessBest
        if (newBest) set({ endlessBest: score })
        return { newBest }
      },

      recordGame: () => set((s) => ({ gamesPlayed: s.gamesPlayed + 1 })),

      setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),

      resetProgress: () => set({ unlocked: 1, best: {}, stars: {}, endlessBest: 0 }),
    }),
    {
      name: 'snake3d-progress-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export const isLevelUnlocked = (id: number, unlocked: number, devUnlockAll: boolean): boolean => {
  if (devUnlockAll) return true
  if (id === 0) return true // Modo infinito siempre disponible
  return id <= unlocked
}

export const totalStars = (stars: Record<number, number>) => Object.values(stars).reduce((a, b) => a + b, 0)
