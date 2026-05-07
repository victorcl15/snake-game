import * as Tone from 'tone'

/**
 * AudioEngine - Gestiona todo el audio del juego
 */
export class AudioEngine {
  private initialized = false
  private masterVolume = 0.5
  private effectsVolume = 0.7
  private musicVolume = 0.4

  private synths: Map<string, Tone.PolySynth> = new Map()
  private now = Tone.now()

  async initialize(): Promise<void> {
    try {
      // No esperar Tone.start() aquí - requiere user gesture
      // Se inicializará lazy cuando se necesite audio
      this.initialized = true
      console.log('[AudioEngine] Inicializado (audio lazy)')
    } catch (error) {
      console.error('[AudioEngine] Error al inicializar:', error)
    }
  }

  /**
   * Garantizar que Tone está listo (lazy initialization)
   */
  private async ensureToneReady(): Promise<void> {
    if (Tone.context.state === 'suspended') {
      try {
        await Tone.start()
      } catch (error) {
        console.warn('[AudioEngine] No se pudo iniciar Tone (requerido: user gesture):', error)
      }
    }
  }

  /**
   * Sonido al comer comida
   */
  async playFoodEatenSound(): Promise<void> {
    if (!this.initialized) return
    await this.ensureToneReady()

    try {
      // Crear sintetizador si no existe
      if (!this.synths.has('foodEaten')) {
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
        }).toDestination()
        synth.volume.value = this.effectsVolume
        this.synths.set('foodEaten', synth)
      }

      const synth = this.synths.get('foodEaten')!
      // Secuencia de notas: Do-Mi-Sol (arpeggio ascendente)
      synth.triggerAttackRelease('C4', '16n', this.now)
      synth.triggerAttackRelease('E4', '16n', this.now + 0.1)
      synth.triggerAttackRelease('G4', '16n', this.now + 0.2)
    } catch (error) {
      console.error('[AudioEngine] Error en foodEatenSound:', error)
    }
  }

  /**
   * Sonido de colisión/game over
   */
  async playCollisionSound(): Promise<void> {
    if (!this.initialized) return
    await this.ensureToneReady()

    try {
      if (!this.synths.has('collision')) {
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
        }).toDestination()
        synth.volume.value = this.effectsVolume
        this.synths.set('collision', synth)
      }

      const synth = this.synths.get('collision')!
      // Nota baja grave
      synth.triggerAttackRelease('A1', '8n')
      synth.triggerAttackRelease('F1', '8n', this.now + 0.1)
    } catch (error) {
      console.error('[AudioEngine] Error en collisionSound:', error)
    }
  }

  /**
   * Sonido de levantamiento de puntuación
   */
  async playScoreSound(): Promise<void> {
    if (!this.initialized) return
    await this.ensureToneReady()

    try {
      if (!this.synths.has('score')) {
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 },
        }).toDestination()
        synth.volume.value = this.effectsVolume * 0.8
        this.synths.set('score', synth)
      }

      const synth = this.synths.get('score')!
      synth.triggerAttackRelease('G5', '32n')
      synth.triggerAttackRelease('D5', '32n', this.now + 0.05)
    } catch (error) {
      console.error('[AudioEngine] Error en scoreSound:', error)
    }
  }

  /**
   * Sonido de game over (nota larga y triste)
   */
  async playGameOverSound(): Promise<void> {
    if (!this.initialized) return
    await this.ensureToneReady()

    try {
      if (!this.synths.has('gameOver')) {
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.05, decay: 0.5, sustain: 0, release: 0.2 },
        }).toDestination()
        synth.volume.value = this.effectsVolume
        this.synths.set('gameOver', synth)
      }

      const synth = this.synths.get('gameOver')!
      // Descenso de notas (blues pentatónico)
      synth.triggerAttackRelease('D4', '4n')
      synth.triggerAttackRelease('C4', '4n', this.now + 0.5)
      synth.triggerAttackRelease('A3', '4n', this.now + 1)
    } catch (error) {
      console.error('[AudioEngine] Error en gameOverSound:', error)
    }
  }

  /**
   * Sonido de level up
   */
  async playLevelUpSound(): Promise<void> {
    if (!this.initialized) return
    await this.ensureToneReady()

    try {
      if (!this.synths.has('levelUp')) {
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
        }).toDestination()
        synth.volume.value = this.effectsVolume
        this.synths.set('levelUp', synth)
      }

      const synth = this.synths.get('levelUp')!
      // Secuencia ascendente épica
      synth.triggerAttackRelease('C4', '16n', this.now)
      synth.triggerAttackRelease('D4', '16n', this.now + 0.1)
      synth.triggerAttackRelease('E4', '16n', this.now + 0.2)
      synth.triggerAttackRelease('G4', '8n', this.now + 0.3)
    } catch (error) {
      console.error('[AudioEngine] Error en levelUpSound:', error)
    }
  }

  /**
   * Actualizar volumen general
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    Tone.Destination.volume.value = Tone.gainToDb(this.masterVolume)
  }

  /**
   * Actualizar volumen de efectos
   */
  setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume))
    this.synths.forEach((synth) => {
      synth.volume.value = this.effectsVolume
    })
  }

  /**
   * Limpiar recursos
   */
  dispose(): void {
    this.synths.forEach((synth) => synth.dispose())
    this.synths.clear()
  }
}
