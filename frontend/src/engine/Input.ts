import { Dir } from '../game/types'

export interface InputHandlers {
  dir: (d: Dir) => void
  pause: () => void
  camera: () => void
  restart: () => void
  confirm: () => void
  back: () => void
  any: () => void
}

/**
 * Input - teclado, gestos táctiles (swipe) y gamepad.
 */
export class Input {
  private handlers: InputHandlers
  private target: HTMLElement
  private touchStart: { x: number; y: number } | null = null
  private padPrev: Record<string, boolean> = {}

  constructor(target: HTMLElement, handlers: InputHandlers) {
    this.target = target
    this.handlers = handlers
    window.addEventListener('keydown', this.onKey)
    target.addEventListener('touchstart', this.onTouchStart, { passive: false })
    target.addEventListener('touchmove', this.onTouchMove, { passive: false })
    target.addEventListener('touchend', this.onTouchEnd)
  }

  private onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    this.handlers.any()
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault()
        this.handlers.dir('up')
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault()
        this.handlers.dir('down')
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault()
        this.handlers.dir('left')
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault()
        this.handlers.dir('right')
        break
      case ' ':
      case 'p':
      case 'P':
        e.preventDefault()
        if (!e.repeat) this.handlers.pause()
        break
      case 'Escape':
        if (!e.repeat) this.handlers.back()
        break
      case 'Enter':
        if (!e.repeat) this.handlers.confirm()
        break
      case 'c':
      case 'C':
        if (!e.repeat) this.handlers.camera()
        break
      case 'r':
      case 'R':
        if (!e.repeat) this.handlers.restart()
        break
    }
  }

  private onTouchStart = (e: TouchEvent) => {
    this.handlers.any()
    const t = e.touches[0]
    this.touchStart = { x: t.clientX, y: t.clientY }
  }

  private onTouchMove = (e: TouchEvent) => {
    if (!this.touchStart) return
    e.preventDefault()
    const t = e.touches[0]
    const dx = t.clientX - this.touchStart.x
    const dy = t.clientY - this.touchStart.y
    const threshold = 22
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return
    if (Math.abs(dx) > Math.abs(dy)) this.handlers.dir(dx > 0 ? 'right' : 'left')
    else this.handlers.dir(dy > 0 ? 'down' : 'up')
    // permitir encadenar gestos sin levantar el dedo
    this.touchStart = { x: t.clientX, y: t.clientY }
  }

  private onTouchEnd = () => {
    this.touchStart = null
  }

  /** Llamar cada frame para leer el gamepad */
  pollGamepad(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    const pad = pads && Array.from(pads).find((p) => p)
    if (!pad) return
    const ax = pad.axes[0] ?? 0
    const ay = pad.axes[1] ?? 0
    const state: Record<string, boolean> = {
      up: !!pad.buttons[12]?.pressed || ay < -0.6,
      down: !!pad.buttons[13]?.pressed || ay > 0.6,
      left: !!pad.buttons[14]?.pressed || ax < -0.6,
      right: !!pad.buttons[15]?.pressed || ax > 0.6,
      a: !!pad.buttons[0]?.pressed,
      b: !!pad.buttons[1]?.pressed,
      start: !!pad.buttons[9]?.pressed,
    }
    const pressed = (k: string) => state[k] && !this.padPrev[k]
    ;(['up', 'down', 'left', 'right'] as Dir[]).forEach((d) => pressed(d) && this.handlers.dir(d))
    if (pressed('a')) this.handlers.confirm()
    if (pressed('b')) this.handlers.back()
    if (pressed('start')) this.handlers.pause()
    this.padPrev = state
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey)
    this.target.removeEventListener('touchstart', this.onTouchStart)
    this.target.removeEventListener('touchmove', this.onTouchMove)
    this.target.removeEventListener('touchend', this.onTouchEnd)
  }
}

