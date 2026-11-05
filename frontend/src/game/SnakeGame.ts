import {
  Cell,
  DIR_VEC,
  DeathCause,
  Dir,
  FoodItem,
  FoodKind,
  GameStatus,
  LevelDef,
  OPPOSITE,
  POWERUP_KINDS,
  Portal,
  Sentinel,
  cellKey,
} from './types'

export interface GameEvents {
  onEat?: (food: FoodItem, points: number, combo: number) => void
  onDie?: (cause: DeathCause) => void
  onWin?: () => void
  onTeleport?: (from: Cell, to: Cell, color: string) => void
  onTurn?: () => void
  onGraceSave?: () => void
  onCountdown?: (n: number) => void
  onWallsAdded?: (cells: Cell[]) => void
  onFoodExpired?: (food: FoodItem) => void
}

export const COMBO_WINDOW = 3000
export const MAX_COMBO = 5
const COUNTDOWN_MS = 2400

export const EFFECT_DURATION: Record<'slow' | 'ghost' | 'double', number> = {
  slow: 6000,
  ghost: 5000,
  double: 8000,
}

/**
 * SnakeGame - lógica pura del juego (independiente del render).
 * Usa un paso fijo (tick) y expone posiciones previas para interpolar suavemente.
 */
export class SnakeGame {
  readonly level: LevelDef
  readonly w: number
  readonly h: number
  readonly demo: boolean

  walls = new Set<number>()
  wallList: Cell[] = []
  portals: Portal[] = []
  sentinels: Sentinel[] = []

  snake: Cell[] = []
  prevSnake: Cell[] = []
  dir: Dir = 'right'
  private queue: Dir[] = []

  foods: FoodItem[] = []
  private foodId = 1

  status: GameStatus = 'countdown'
  deathCause: DeathCause | null = null
  countdown = COUNTDOWN_MS
  private lastCountdownShown = 4

  score = 0
  eaten = 0
  combo = 1
  bestCombo = 1
  lastEatTime = -99999
  time = 0
  tickCount = 0
  tickMs: number
  private acc = 0
  private growPending = 0
  private graceUsed = false
  /** tiempo en que comenzó el estado final (muerte/victoria) */
  endTime = 0

  effects = { slow: 0, ghost: 0, double: 0 }

  events: GameEvents = {}

  constructor(level: LevelDef, opts: { demo?: boolean } = {}) {
    this.level = level
    this.w = level.gridW
    this.h = level.gridH
    this.demo = !!opts.demo
    this.tickMs = level.startSpeed

    level.walls.forEach((c) => this.addWall(c))
    this.portals = level.portals.map((p) => ({ ...p }))
    this.sentinels = level.sentinels.map((s, i) => ({
      id: i,
      path: s.path,
      index: 0,
      step: 1,
      every: s.every,
      counter: 0,
      x: s.path[0].x,
      y: s.path[0].y,
      prevX: s.path[0].x,
      prevY: s.path[0].y,
    }))

    const { x, y, dir } = level.start
    const back = DIR_VEC[OPPOSITE[dir]]
    this.dir = dir
    for (let i = 0; i < 3; i++) this.snake.push(this.wrapCell({ x: x + back.x * i, y: y + back.y * i }))
    this.prevSnake = this.snake.map((c) => ({ ...c }))

    this.spawnFood('apple')
    if (this.demo) {
      this.status = 'playing'
      this.countdown = 0
    }
  }

  /* ---------------- API pública ---------------- */

  queueDir(d: Dir): void {
    if (this.status !== 'playing' && this.status !== 'countdown') return
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir
    if (d === last || d === OPPOSITE[last]) return
    if (this.queue.length < 3) this.queue.push(d)
  }

  togglePause(): void {
    if (this.status === 'playing') this.status = 'paused'
    else if (this.status === 'paused') this.status = 'playing'
  }

  get interval(): number {
    return this.tickMs * (this.effects.slow > 0 ? 1.6 : 1)
  }

  /** progreso [0..1] dentro del tick actual, para interpolar */
  get alpha(): number {
    if (this.status !== 'playing') return this.status === 'paused' ? Math.min(1, this.acc / this.interval) : 1
    return Math.min(1, this.acc / this.interval)
  }

  get comboRemaining(): number {
    return Math.max(0, COMBO_WINDOW - (this.time - this.lastEatTime))
  }

  get isEndless(): boolean {
    return !!this.level.endless
  }

  update(dtMs: number): void {
    const dt = Math.min(dtMs, 100)

    if (this.status === 'countdown') {
      this.countdown -= dt
      const n = Math.ceil(this.countdown / (COUNTDOWN_MS / 3))
      if (n !== this.lastCountdownShown) {
        this.lastCountdownShown = n
        this.events.onCountdown?.(Math.max(0, n))
      }
      if (this.countdown <= 0) {
        this.status = 'playing'
        this.acc = this.interval * 0.5
      }
      return
    }

    if (this.status !== 'playing') {
      if (this.status === 'dead' || this.status === 'won') this.time += dt
      return
    }

    this.time += dt
    this.effects.slow = Math.max(0, this.effects.slow - dt)
    this.effects.ghost = Math.max(0, this.effects.ghost - dt)
    this.effects.double = Math.max(0, this.effects.double - dt)
    if (this.comboRemaining <= 0) this.combo = 1

    // expiración de comidas temporales
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i]
      if (f.expiresAt !== undefined && this.time >= f.expiresAt) {
        this.foods.splice(i, 1)
        this.events.onFoodExpired?.(f)
      }
    }

    this.acc += dt
    let guard = 0
    while (this.acc >= this.interval && this.status === 'playing' && guard++ < 5) {
      this.acc -= this.interval
      this.tick()
    }
  }

  /* ---------------- Lógica de paso ---------------- */

  private tick(): void {
    this.tickCount++
    this.prevSnake = this.snake.map((c) => ({ ...c }))

    if (this.demo) {
      const d = this.aiChoose()
      if (d) this.queue = [d]
    }

    if (this.queue.length) {
      const nd = this.queue.shift()!
      if (nd !== OPPOSITE[this.dir] && nd !== this.dir) {
        this.dir = nd
        this.events.onTurn?.()
      }
    }

    this.stepSentinels()
    if (this.status !== 'playing') return

    const head = this.snake[0]
    const res = this.nextCell(head, this.dir, this.effects.ghost > 0)
    const cause = res.cause ?? this.collisionAt(res.cell, head, true)

    if (cause) {
      // Gracia: un tick extra para reaccionar antes de chocar
      if (!this.graceUsed && !this.demo && cause !== 'sentinel') {
        this.graceUsed = true
        this.prevSnake = this.snake.map((c) => ({ ...c }))
        this.events.onGraceSave?.()
        return
      }
      this.die(cause)
      return
    }
    this.graceUsed = false

    if (res.portal) this.events.onTeleport?.(res.portal.from, res.cell, res.portal.color)

    const newHead = res.cell
    this.snake.unshift(newHead)

    const fi = this.foods.findIndex((f) => f.x === newHead.x && f.y === newHead.y)
    if (fi >= 0) this.eat(this.foods[fi])

    if (this.growPending > 0) this.growPending--
    else this.snake.pop()
  }

  /** Calcula la siguiente celda desde `from` en dirección `d` (bordes y portales) */
  nextCell(
    from: Cell,
    d: Dir,
    ghost: boolean
  ): { cell: Cell; cause?: DeathCause; portal?: { from: Cell; color: string } } {
    const v = DIR_VEC[d]
    let x = from.x + v.x
    let y = from.y + v.y
    const out = x < 0 || y < 0 || x >= this.w || y >= this.h
    if (out) {
      if (this.level.wrap || ghost) {
        x = (x + this.w) % this.w
        y = (y + this.h) % this.h
      } else {
        return { cell: { x, y }, cause: 'wall' }
      }
    }
    for (const p of this.portals) {
      if (p.a.x === x && p.a.y === y) return { cell: { ...p.b }, portal: { from: { x, y }, color: p.color } }
      if (p.b.x === x && p.b.y === y) return { cell: { ...p.a }, portal: { from: { x, y }, color: p.color } }
    }
    return { cell: { x, y } }
  }

  private collisionAt(c: Cell, oldHead: Cell, ignoreTail: boolean): DeathCause | null {
    const ghost = this.effects.ghost > 0
    if (!ghost && this.walls.has(cellKey(c.x, c.y, this.w))) return 'wall'
    if (!ghost) {
      const len = this.snake.length - (ignoreTail && this.growPending === 0 ? 1 : 0)
      for (let i = 0; i < len; i++) {
        const s = this.snake[i]
        if (s.x === c.x && s.y === c.y) return 'self'
      }
    }
    for (const s of this.sentinels) {
      if (s.x === c.x && s.y === c.y) return ghost ? null : 'sentinel'
      // intercambio de posiciones (cruzarse de frente)
      if (!ghost && s.x === oldHead.x && s.y === oldHead.y && s.prevX === c.x && s.prevY === c.y) return 'sentinel'
    }
    return null
  }

  private stepSentinels(): void {
    for (const s of this.sentinels) {
      s.prevX = s.x
      s.prevY = s.y
      s.counter++
      if (s.counter < s.every) continue
      s.counter = 0
      let ni = s.index + s.step
      if (ni < 0 || ni >= s.path.length) {
        s.step = (s.step * -1) as 1 | -1
        ni = s.index + s.step
      }
      s.index = ni
      s.x = s.path[ni].x
      s.y = s.path[ni].y
    }
    // Un centinela que embiste la cabeza
    const head = this.snake[0]
    if (this.effects.ghost <= 0 && this.sentinels.some((s) => s.x === head.x && s.y === head.y)) {
      this.die('sentinel')
    }
  }

  private eat(f: FoodItem): void {
    this.foods = this.foods.filter((x) => x.id !== f.id)
    let pts = 0
    const counts = f.kind === 'apple' || f.kind === 'golden'

    if (counts) {
      this.combo = this.time - this.lastEatTime <= COMBO_WINDOW ? Math.min(this.combo + 1, MAX_COMBO) : 1
      this.bestCombo = Math.max(this.bestCombo, this.combo)
      this.lastEatTime = this.time
    }

    switch (f.kind) {
      case 'apple':
        pts = 10 * this.combo
        this.growPending += 1
        break
      case 'golden':
        pts = 50 * this.combo
        this.growPending += 2
        break
      case 'slow':
        this.effects.slow = EFFECT_DURATION.slow
        pts = 15
        break
      case 'ghost':
        this.effects.ghost = EFFECT_DURATION.ghost
        pts = 15
        break
      case 'double':
        this.effects.double = EFFECT_DURATION.double
        pts = 15
        break
      case 'shrink': {
        const remove = Math.min(4, this.snake.length - 3)
        for (let i = 0; i < remove; i++) this.snake.pop()
        pts = 25
        break
      }
    }
    if (this.effects.double > 0 && f.kind !== 'double') pts *= 2
    this.score += pts

    if (counts) {
      this.eaten++
      this.tickMs = Math.max(this.level.minSpeed, this.tickMs - this.level.speedStep)
    }

    this.events.onEat?.(f, pts, this.combo)

    if (!this.isEndless && this.eaten >= this.level.goal) {
      this.status = 'won'
      this.endTime = this.time
      this.events.onWin?.()
      return
    }

    if (f.kind === 'apple' || f.kind === 'golden') {
      if (!this.foods.some((x) => x.kind === 'apple')) this.spawnFood('apple')
      if (!this.foods.some((x) => x.kind === 'golden') && Math.random() < 0.16) this.spawnFood('golden', 6500)
      if (this.level.powerups && !this.foods.some((x) => POWERUP_KINDS.includes(x.kind)) && Math.random() < 0.2) {
        const kind = POWERUP_KINDS[Math.floor(Math.random() * POWERUP_KINDS.length)]
        if (kind !== 'shrink' || this.snake.length > 8) this.spawnFood(kind, 9000)
      }
      if (this.isEndless && f.kind === 'apple' && this.eaten % 5 === 0) this.spawnRandomWalls()
    }
  }

  private die(cause: DeathCause): void {
    if (this.status === 'dead') return
    this.status = 'dead'
    this.deathCause = cause
    this.endTime = this.time
    this.prevSnake = this.snake.map((c) => ({ ...c }))
    this.events.onDie?.(cause)
  }

  /* ---------------- Utilidades ---------------- */

  private addWall(c: Cell): void {
    const k = cellKey(c.x, c.y, this.w)
    if (this.walls.has(k)) return
    this.walls.add(k)
    this.wallList.push({ x: c.x, y: c.y })
  }

  private wrapCell(c: Cell): Cell {
    return { x: (c.x + this.w) % this.w, y: (c.y + this.h) % this.h }
  }

  isBlocked(x: number, y: number): boolean {
    if (this.walls.has(cellKey(x, y, this.w))) return true
    if (this.snake.some((s) => s.x === x && s.y === y)) return true
    if (this.foods.some((f) => f.x === x && f.y === y)) return true
    if (this.portals.some((p) => (p.a.x === x && p.a.y === y) || (p.b.x === x && p.b.y === y))) return true
    if (this.sentinels.some((s) => s.x === x && s.y === y)) return true
    return false
  }

  private randomFreeCell(minHeadDist = 3): Cell | null {
    const head = this.snake[0]
    const free: Cell[] = []
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.isBlocked(x, y)) continue
        if (Math.abs(x - head.x) + Math.abs(y - head.y) < minHeadDist) continue
        free.push({ x, y })
      }
    }
    if (!free.length) return null
    return free[Math.floor(Math.random() * free.length)]
  }

  private spawnFood(kind: FoodKind, life?: number): void {
    const c = this.randomFreeCell(kind === 'apple' ? 3 : 4) ?? this.randomFreeCell(1)
    if (!c) return
    this.foods.push({
      id: this.foodId++,
      kind,
      x: c.x,
      y: c.y,
      spawnedAt: this.time,
      expiresAt: life ? this.time + life : undefined,
    })
  }

  private spawnRandomWalls(): void {
    const head = this.snake[0]
    for (let attempt = 0; attempt < 30; attempt++) {
      const horizontal = Math.random() < 0.5
      const len = 2 + Math.floor(Math.random() * 3)
      const x0 = Math.floor(Math.random() * (this.w - (horizontal ? len : 1)))
      const y0 = Math.floor(Math.random() * (this.h - (horizontal ? 1 : len)))
      const cells: Cell[] = []
      for (let i = 0; i < len; i++) cells.push({ x: x0 + (horizontal ? i : 0), y: y0 + (horizontal ? 0 : i) })
      const ok = cells.every(
        (c) => !this.isBlocked(c.x, c.y) && Math.abs(c.x - head.x) + Math.abs(c.y - head.y) > 5
      )
      if (ok) {
        cells.forEach((c) => this.addWall(c))
        this.events.onWallsAdded?.(cells)
        return
      }
    }
  }

  /* ---------------- IA para la demo del menú ---------------- */

  private aiChoose(): Dir | null {
    const head = this.snake[0]
    const target = this.foods.find((f) => f.kind === 'golden') ?? this.foods.find((f) => f.kind === 'apple')
    const options: { d: Dir; score: number }[] = []
    for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
      if (d === OPPOSITE[this.dir]) continue
      const res = this.nextCell(head, d, false)
      if (res.cause || this.collisionAt(res.cell, head, true)) continue
      const space = this.floodCount(res.cell, this.snake.length + 4)
      let dist = 0
      if (target) {
        let dx = Math.abs(res.cell.x - target.x)
        let dy = Math.abs(res.cell.y - target.y)
        if (this.level.wrap) {
          dx = Math.min(dx, this.w - dx)
          dy = Math.min(dy, this.h - dy)
        }
        dist = dx + dy
      }
      const roomy = space >= this.snake.length + 2 ? 1000 : space * 10
      options.push({ d, score: roomy - dist * 3 + (d === this.dir ? 1 : 0) + Math.random() })
    }
    if (!options.length) return null
    options.sort((a, b) => b.score - a.score)
    return options[0].d
  }

  private floodCount(start: Cell, limit: number): number {
    const seen = new Set<number>([cellKey(start.x, start.y, this.w)])
    const body = new Set(this.snake.slice(0, -1).map((s) => cellKey(s.x, s.y, this.w)))
    const stack = [start]
    let count = 0
    while (stack.length && count < limit) {
      const c = stack.pop()!
      count++
      for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
        const v = DIR_VEC[d]
        let x = c.x + v.x
        let y = c.y + v.y
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) {
          if (!this.level.wrap) continue
          x = (x + this.w) % this.w
          y = (y + this.h) % this.h
        }
        const k = cellKey(x, y, this.w)
        if (seen.has(k) || this.walls.has(k) || body.has(k)) continue
        seen.add(k)
        stack.push({ x, y })
      }
    }
    return count
  }

  starsFor(score: number): number {
    if (this.isEndless) return 0
    const [two, three] = this.level.stars
    return score >= three ? 3 : score >= two ? 2 : 1
  }
}
