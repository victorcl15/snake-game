import { Cell, LevelDef, Portal, SentinelDef, Theme } from './types'

/* ============================================================
 * Helpers para construir mapas
 * ============================================================ */

const hline = (x1: number, x2: number, y: number): Cell[] => {
  const out: Cell[] = []
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) out.push({ x, y })
  return out
}

const vline = (x: number, y1: number, y2: number): Cell[] => {
  const out: Cell[] = []
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) out.push({ x, y })
  return out
}

const block = (x: number, y: number, w: number, h: number): Cell[] => {
  const out: Cell[] = []
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push({ x: x + i, y: y + j })
  return out
}

/** Anillo rectangular con huecos (lista de celdas a excluir) */
const ring = (x1: number, y1: number, x2: number, y2: number, gaps: Cell[] = []): Cell[] => {
  const cells = [...hline(x1, x2, y1), ...hline(x1, x2, y2), ...vline(x1, y1 + 1, y2 - 1), ...vline(x2, y1 + 1, y2 - 1)]
  return cells.filter((c) => !gaps.some((g) => g.x === c.x && g.y === c.y))
}

/** Camino de ida para un centinela */
const path = (cells: Cell[], every = 2): SentinelDef => ({ path: cells, every })

const portal = (ax: number, ay: number, bx: number, by: number, color: string): Portal => ({
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  color,
})

const stars = (goal: number): [number, number] => [goal * 18, goal * 32]

/* ============================================================
 * Temas visuales
 * ============================================================ */

const T = {
  garden: {
    bg: '#050d14', ground1: '#0c2a24', ground2: '#0f3029', gridLine: '#1d5c4c',
    wall: '#1f6f5c', wallGlow: '#39ffb0', snakeHead: '#b4ff6a', snakeBody1: '#2ee86b', snakeBody2: '#1fb85a', accent: '#39ffb0',
  },
  glass: {
    bg: '#04081a', ground1: '#0b1a3a', ground2: '#0e2046', gridLine: '#2a4f8f',
    wall: '#2c6cff', wallGlow: '#5ad1ff', snakeHead: '#ffe45a', snakeBody1: '#ffc53d', snakeBody2: '#ff9d2e', accent: '#5ad1ff',
  },
  pillars: {
    bg: '#0b0518', ground1: '#1d1036', ground2: '#23143f', gridLine: '#4a2f80',
    wall: '#6b3fd1', wallGlow: '#c48bff', snakeHead: '#8affe6', snakeBody1: '#2ee0c0', snakeBody2: '#1aa894', accent: '#c48bff',
  },
  sunset: {
    bg: '#140806', ground1: '#2c140c', ground2: '#33180e', gridLine: '#6b3420',
    wall: '#c2552b', wallGlow: '#ff9a4d', snakeHead: '#a8f7ff', snakeBody1: '#3ccfff', snakeBody2: '#2a8fe0', accent: '#ff9a4d',
  },
  portal: {
    bg: '#06070f', ground1: '#141a2b', ground2: '#182033', gridLine: '#34406a',
    wall: '#3d4b7a', wallGlow: '#ff5ad1', snakeHead: '#d4ff8a', snakeBody1: '#8be63a', snakeBody2: '#5fb82a', accent: '#ff5ad1',
  },
  alert: {
    bg: '#0f0405', ground1: '#241012', ground2: '#2a1316', gridLine: '#5a2a30',
    wall: '#7a2a33', wallGlow: '#ff4d5e', snakeHead: '#fff8a0', snakeBody1: '#e8d63a', snakeBody2: '#b8a52a', accent: '#ff4d5e',
  },
  jungle: {
    bg: '#0a0b04', ground1: '#1f240e', ground2: '#252b11', gridLine: '#4d5a22',
    wall: '#6b7a2a', wallGlow: '#e6ff5a', snakeHead: '#ffa8e2', snakeBody1: '#ff4fb8', snakeBody2: '#c83a8f', accent: '#e6ff5a',
  },
  ice: {
    bg: '#030a10', ground1: '#0d2230', ground2: '#102838', gridLine: '#2a5a78',
    wall: '#5fb8e6', wallGlow: '#c8f4ff', snakeHead: '#ff9a9a', snakeBody1: '#ff4a4a', snakeBody2: '#c83030', accent: '#c8f4ff',
  },
  storm: {
    bg: '#07031a', ground1: '#160d33', ground2: '#1b103d', gridLine: '#3d2a80',
    wall: '#4a2fbf', wallGlow: '#ffe65a', snakeHead: '#a0ffd4', snakeBody1: '#2ee88f', snakeBody2: '#1fb86a', accent: '#ffe65a',
  },
  core: {
    bg: '#120300', ground1: '#2a0d05', ground2: '#321007', gridLine: '#6e2810',
    wall: '#a8360f', wallGlow: '#ffb347', snakeHead: '#ffffff', snakeBody1: '#9af0ff', snakeBody2: '#5ac8ff', accent: '#ffb347',
  },
  inferno: {
    bg: '#0a0003', ground1: '#1e0207', ground2: '#2c040c', gridLine: '#800615',
    wall: '#d60029', wallGlow: '#ff003c', snakeHead: '#ffffff', snakeBody1: '#ff0044', snakeBody2: '#ff6600', accent: '#ff003c',
  },
  endless: {
    bg: '#05030f', ground1: '#120f24', ground2: '#16122c', gridLine: '#332a66',
    wall: '#5a3fd1', wallGlow: '#ff5af0', snakeHead: '#a0fff8', snakeBody1: '#3ae0ff', snakeBody2: '#2a9cff', accent: '#ff5af0',
  },
} satisfies Record<string, Theme>

/* ============================================================
 * Niveles de campaña (1 al 11)
 * ============================================================ */

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: 'Jardín Neón',
    subtitle: 'El comienzo',
    description: 'Un campo abierto sin obstáculos. Los bordes te llevan al lado opuesto. Aprende a encadenar combos comiendo rápido.',
    gridW: 16, gridH: 16, wrap: true,
    startSpeed: 165, minSpeed: 115, speedStep: 4,
    goal: 8,
    start: { x: 4, y: 8, dir: 'right' },
    walls: [], portals: [], sentinels: [],
    powerups: false,
    stars: stars(8),
    theme: T.garden,
  },
  {
    id: 2,
    name: 'Caja de Cristal',
    subtitle: 'Bordes mortales',
    description: 'Las paredes exteriores ahora son sólidas. Un choque y se acabó. Aparecen los primeros power-ups.',
    gridW: 18, gridH: 18, wrap: false,
    startSpeed: 155, minSpeed: 105, speedStep: 4,
    goal: 10,
    start: { x: 4, y: 9, dir: 'right' },
    walls: [], portals: [], sentinels: [],
    powerups: true,
    stars: stars(10),
    theme: T.glass,
  },
  {
    id: 3,
    name: 'Pilares',
    subtitle: 'Esquiva y gira',
    description: 'Cuatro columnas bloquean el camino. Planea tus giros alrededor de ellas.',
    gridW: 18, gridH: 18, wrap: false,
    startSpeed: 150, minSpeed: 100, speedStep: 4,
    goal: 12,
    start: { x: 3, y: 9, dir: 'right' },
    walls: [...block(4, 4, 2, 2), ...block(12, 4, 2, 2), ...block(4, 12, 2, 2), ...block(12, 12, 2, 2)],
    portals: [], sentinels: [],
    powerups: true,
    stars: stars(12),
    theme: T.pillars,
  },
  {
    id: 4,
    name: 'Encrucijada',
    subtitle: 'Cruza el centro',
    description: 'Una gran cruz partida divide el mapa. Los bordes vuelven a envolverse: úsalos para atajar.',
    gridW: 20, gridH: 20, wrap: true,
    startSpeed: 145, minSpeed: 95, speedStep: 3,
    goal: 14,
    start: { x: 4, y: 1, dir: 'right' },
    walls: [...hline(3, 7, 10), ...hline(12, 16, 10), ...vline(10, 3, 7), ...vline(10, 12, 16)],
    portals: [], sentinels: [],
    powerups: true,
    stars: stars(14),
    theme: T.sunset,
  },
  {
    id: 5,
    name: 'Portales',
    subtitle: 'Piensa en otra dimensión',
    description: 'Un muro divide el mundo en dos. Atraviesa los portales de colores para llegar al otro lado.',
    gridW: 20, gridH: 20, wrap: false,
    startSpeed: 145, minSpeed: 95, speedStep: 3,
    goal: 14,
    start: { x: 2, y: 16, dir: 'up' },
    walls: vline(10, 0, 19),
    portals: [portal(4, 4, 15, 15, '#3df5ff'), portal(4, 15, 15, 4, '#ffae3d')],
    sentinels: [],
    powerups: true,
    stars: stars(14),
    theme: T.portal,
  },
  {
    id: 6,
    name: 'Centinelas',
    subtitle: 'Peligro en movimiento',
    description: 'Drones rojos patrullan el campo. Tocar uno con la cabeza es fatal. Observa su ritmo.',
    gridW: 20, gridH: 20, wrap: false,
    startSpeed: 140, minSpeed: 95, speedStep: 3,
    goal: 15,
    start: { x: 3, y: 12, dir: 'right' },
    walls: [],
    portals: [],
    sentinels: [path(hline(2, 17, 5)), path(hline(2, 17, 10).reverse()), path(hline(2, 17, 15))],
    powerups: true,
    stars: stars(15),
    theme: T.alert,
  },
  {
    id: 7,
    name: 'Laberinto',
    subtitle: 'Pasillos estrechos',
    description: 'Corredores y muros cortan el paso. A medida que creces, el espacio se vuelve tu enemigo.',
    gridW: 22, gridH: 22, wrap: false,
    startSpeed: 140, minSpeed: 90, speedStep: 3,
    goal: 16,
    start: { x: 3, y: 3, dir: 'right' },
    walls: [...hline(0, 13, 7), ...hline(8, 21, 14), ...vline(17, 0, 4), ...vline(4, 17, 21), ...block(10, 10, 2, 2)],
    portals: [], sentinels: [],
    powerups: true,
    stars: stars(16),
    theme: T.jungle,
  },
  {
    id: 8,
    name: 'Espiral',
    subtitle: 'Hacia el centro',
    description: 'Anillos concéntricos con pasajes ocultos. Los bordes envuelven el mapa: el exterior es tu atajo.',
    gridW: 22, gridH: 22, wrap: true,
    startSpeed: 135, minSpeed: 85, speedStep: 3,
    goal: 16,
    start: { x: 4, y: 1, dir: 'right' },
    walls: [
      ...ring(3, 3, 18, 18, [{ x: 10, y: 3 }, { x: 11, y: 3 }]),
      ...ring(7, 7, 14, 14, [{ x: 10, y: 14 }, { x: 11, y: 14 }]),
    ],
    portals: [], sentinels: [],
    powerups: true,
    stars: stars(16),
    theme: T.ice,
  },
  {
    id: 9,
    name: 'Tormenta',
    subtitle: 'Todo a la vez',
    description: 'Centinelas veloces, portales en las esquinas y un núcleo sólido. La velocidad aumenta rápido.',
    gridW: 24, gridH: 24, wrap: false,
    startSpeed: 125, minSpeed: 75, speedStep: 3,
    goal: 18,
    start: { x: 8, y: 20, dir: 'up' },
    walls: block(10, 10, 4, 4),
    portals: [portal(2, 2, 21, 21, '#3df5ff'), portal(21, 2, 2, 21, '#ff5ad1')],
    sentinels: [path(vline(5, 2, 21)), path(vline(18, 2, 21).reverse())],
    powerups: true,
    stars: stars(18),
    theme: T.storm,
  },
  {
    id: 10,
    name: 'Núcleo',
    subtitle: 'El bastión de choque',
    description: 'La prueba definitiva de reflejos: un anillo fortificado, centinelas en tres frentes y portales internos.',
    gridW: 24, gridH: 24, wrap: true,
    startSpeed: 120, minSpeed: 70, speedStep: 3,
    goal: 22,
    start: { x: 1, y: 12, dir: 'up' },
    walls: [
      ...ring(4, 4, 19, 19, [
        { x: 11, y: 4 }, { x: 12, y: 4 }, { x: 11, y: 19 }, { x: 12, y: 19 },
        { x: 4, y: 11 }, { x: 4, y: 12 }, { x: 19, y: 11 }, { x: 19, y: 12 },
      ]),
      ...block(11, 11, 2, 2),
    ],
    portals: [portal(7, 7, 16, 16, '#3df5ff')],
    sentinels: [path(hline(2, 21, 2)), path(hline(2, 21, 21).reverse()), path(hline(6, 17, 8), 3)],
    powerups: true,
    stars: stars(22),
    theme: T.core,
  },
  {
    id: 11,
    name: 'Infierno Carmesí',
    subtitle: 'Pesadilla Demoníaca',
    description: 'El reino del averno. Velocidad brutal, muros perimetrales mortales, 4 centinelas demoníacos ultra veloces y portales de fuego cruzado.',
    gridW: 26, gridH: 26, wrap: false,
    startSpeed: 105, minSpeed: 50, speedStep: 2.2,
    goal: 25,
    start: { x: 2, y: 13, dir: 'up' },
    walls: [
      // 4 altares demoníacos en las esquinas
      ...block(5, 5, 3, 3),
      ...block(18, 5, 3, 3),
      ...block(5, 18, 3, 3),
      ...block(18, 18, 3, 3),
      // Columnas y barreras de lava
      ...hline(9, 16, 8),
      ...hline(9, 16, 17),
      ...vline(12, 11, 14),
      ...vline(13, 11, 14),
    ],
    portals: [
      portal(3, 3, 22, 22, '#ff003c'), // Portal de Sangre
      portal(22, 3, 3, 22, '#ff6600'), // Portal de Magma
      portal(8, 13, 17, 13, '#b200ff'), // Portal del Vacío
    ],
    sentinels: [
      path(hline(2, 23, 3), 1),
      path(hline(2, 23, 22).reverse(), 1),
      path(vline(3, 2, 23), 2),
      path(vline(22, 2, 23).reverse(), 2),
    ],
    powerups: true,
    stars: [25 * 22, 25 * 38],
    theme: T.inferno,
  },
]

/* ============================================================
 * Modo infinito
 * ============================================================ */

export const ENDLESS_LEVEL: LevelDef = {
  id: 0,
  name: 'Infinito',
  subtitle: 'Sobrevive todo lo que puedas',
  description: 'Sin meta. Cada 5 frutas aparece un nuevo obstáculo y la velocidad no deja de subir.',
  gridW: 20, gridH: 20, wrap: true,
  startSpeed: 150, minSpeed: 55, speedStep: 2,
  goal: Infinity,
  start: { x: 4, y: 10, dir: 'right' },
  walls: [], portals: [], sentinels: [],
  powerups: true,
  stars: [0, 0],
  theme: T.endless,
  endless: true,
}

export const getLevel = (id: number): LevelDef =>
  id === 0 ? ENDLESS_LEVEL : LEVELS.find((l) => l.id === id) ?? LEVELS[0]

export const levelFeatures = (l: LevelDef): string[] => {
  const f: string[] = []
  f.push(l.wrap ? 'Bordes envolventes' : 'Bordes mortales')
  if (l.walls.length) f.push('Muros')
  if (l.portals.length) f.push(`${l.portals.length} Portales`)
  if (l.sentinels.length) f.push(`${l.sentinels.length} Centinelas`)
  if (l.powerups) f.push('Power-ups')
  if (l.id === 11) f.push('BOSS / MÁXIMA DIFICULTAD')
  return f
}
