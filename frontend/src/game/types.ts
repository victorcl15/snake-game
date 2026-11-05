/**
 * Tipos base del juego Snake 3D
 */

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface Cell {
  x: number
  y: number
}

export const DIR_VEC: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export type FoodKind = 'apple' | 'golden' | 'slow' | 'ghost' | 'double' | 'shrink'

export const POWERUP_KINDS: FoodKind[] = ['slow', 'ghost', 'double', 'shrink']

export interface FoodItem {
  id: number
  kind: FoodKind
  x: number
  y: number
  spawnedAt: number
  /** tiempo de juego (ms) en que desaparece; undefined = permanente */
  expiresAt?: number
}

export interface Portal {
  a: Cell
  b: Cell
  color: string
}

export interface SentinelDef {
  path: Cell[]
  /** se mueve una casilla cada N ticks */
  every: number
}

export interface Sentinel {
  id: number
  path: Cell[]
  index: number
  step: 1 | -1
  every: number
  counter: number
  x: number
  y: number
  prevX: number
  prevY: number
}

export interface Theme {
  bg: string
  ground1: string
  ground2: string
  gridLine: string
  wall: string
  wallGlow: string
  snakeHead: string
  snakeBody1: string
  snakeBody2: string
  accent: string
}

export interface LevelDef {
  id: number
  name: string
  subtitle: string
  description: string
  gridW: number
  gridH: number
  /** true = los bordes teletransportan al lado opuesto; false = bordes mortales */
  wrap: boolean
  /** ms por paso al iniciar */
  startSpeed: number
  /** ms por paso mínimo */
  minSpeed: number
  /** ms que se reducen por cada fruta */
  speedStep: number
  /** frutas necesarias para completar (Infinity = modo infinito) */
  goal: number
  start: { x: number; y: number; dir: Dir }
  walls: Cell[]
  portals: Portal[]
  sentinels: SentinelDef[]
  powerups: boolean
  /** puntuación necesaria para 2 y 3 estrellas */
  stars: [number, number]
  theme: Theme
  endless?: boolean
}

export type GameStatus = 'countdown' | 'playing' | 'paused' | 'dead' | 'won'

export type DeathCause = 'wall' | 'self' | 'sentinel'

export const cellKey = (x: number, y: number, w: number) => y * w + x

