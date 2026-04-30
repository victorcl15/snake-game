/**
 * InputController - Maneja entrada de usuario (teclado, mouse)
 */
export class InputController {
  private keys: Map<string, boolean> = new Map()
  private onDirectionChange: ((direction: 'up' | 'down' | 'left' | 'right') => void) | null = null
  private onCameraRotate: ((angle: number) => void) | null = null
  private onCameraZoom: ((factor: number) => void) | null = null
  private onPause: (() => void) | null = null

  private mouseX = 0
  private mouseY = 0
  private mouseDown = false

  constructor() {
    this.setupKeyboardListeners()
    this.setupMouseListeners()
  }

  /**
   * Configurar listeners de teclado
   */
  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase()
      this.keys.set(key, true)

      // Detectar dirección (WASD o Arrows)
      switch (key) {
        case 'w':
        case 'arrowup':
          e.preventDefault()
          this.onDirectionChange?.('up')
          break
        case 's':
        case 'arrowdown':
          e.preventDefault()
          this.onDirectionChange?.('down')
          break
        case 'a':
        case 'arrowleft':
          e.preventDefault()
          this.onDirectionChange?.('left')
          break
        case 'd':
        case 'arrowright':
          e.preventDefault()
          this.onDirectionChange?.('right')
          break
        case ' ':
          e.preventDefault()
          this.onPause?.()
          break
        case 'p':
          this.onPause?.()
          break
      }
    })

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.key.toLowerCase(), false)
    })
  }

  /**
   * Configurar listeners de mouse
   */
  private setupMouseListeners(): void {
    window.addEventListener('mousemove', (e) => {
      const deltaX = e.clientX - this.mouseX
      this.mouseX = e.clientX
      this.mouseY = e.clientY

      if (this.mouseDown) {
        this.onCameraRotate?.(deltaX * 0.005)
      }
    })

    window.addEventListener('mousedown', () => {
      this.mouseDown = true
    })

    window.addEventListener('mouseup', () => {
      this.mouseDown = false
    })

    window.addEventListener('wheel', (e) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
      this.onCameraZoom?.(zoomFactor)
    })
  }

  /**
   * Registrar callback de cambio de dirección
   */
  onDirection(callback: (direction: 'up' | 'down' | 'left' | 'right') => void): void {
    this.onDirectionChange = callback
  }

  /**
   * Registrar callback de rotación de cámara
   */
  onCameraRotationChange(callback: (angle: number) => void): void {
    this.onCameraRotate = callback
  }

  /**
   * Registrar callback de zoom
   */
  onZoomChange(callback: (factor: number) => void): void {
    this.onCameraZoom = callback
  }

  /**
   * Registrar callback de pausa
   */
  onPauseToggle(callback: () => void): void {
    this.onPause = callback
  }

  /**
   * Verificar si una tecla está presionada
   */
  isKeyPressed(key: string): boolean {
    return this.keys.get(key.toLowerCase()) || false
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.keys.clear()
    this.onDirectionChange = null
    this.onCameraRotate = null
    this.onCameraZoom = null
    this.onPause = null
  }
}
