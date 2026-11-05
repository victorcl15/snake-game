/**
 * Audio - sintetizador ligero con Web Audio API (efectos + música procedural)
 */
export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null

  private sfxOn = true
  private musicOn = true

  private musicTimer: number | null = null
  private nextNoteTime = 0
  private step = 0
  private tempo = 112
  private intensity = 0

  /** Debe llamarse tras un gesto del usuario */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.55
      this.master.connect(this.ctx.destination)
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = this.sfxOn ? 0.8 : 0
      this.sfxGain.connect(this.master)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = this.musicOn ? 0.32 : 0
      this.musicGain.connect(this.master)

      const len = this.ctx.sampleRate * 0.5
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
  }

  setSfx(on: boolean): void {
    this.sfxOn = on
    if (this.sfxGain && this.ctx) this.sfxGain.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.02)
  }

  setMusic(on: boolean): void {
    this.musicOn = on
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.1)
  }

  /* ---------------- primitivas ---------------- */

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number; out?: GainNode | null } = {}
  ): void {
    if (!this.ctx) return
    const out = opts.out ?? this.sfxGain
    if (!out) return
    const t = this.ctx.currentTime + (opts.delay ?? 0)
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = opts.type ?? 'square'
    osc.frequency.setValueAtTime(freq, t)
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur)
    const vol = opts.vol ?? 0.2
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(out)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  private noise(dur: number, opts: { vol?: number; freq?: number; delay?: number; out?: GainNode | null; type?: BiquadFilterType } = {}): void {
    if (!this.ctx || !this.noiseBuffer) return
    const out = opts.out ?? this.sfxGain
    if (!out) return
    const t = this.ctx.currentTime + (opts.delay ?? 0)
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = opts.type ?? 'lowpass'
    filter.frequency.value = opts.freq ?? 1200
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(opts.vol ?? 0.3, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(out)
    src.start(t)
    src.stop(t + dur + 0.05)
  }

  /* ---------------- efectos ---------------- */

  eat(combo: number): void {
    const base = 523.25 * Math.pow(2, ((combo - 1) * 2) / 12)
    this.tone(base, 0.09, { type: 'square', vol: 0.14 })
    this.tone(base * 1.5, 0.12, { type: 'triangle', vol: 0.18, delay: 0.05 })
  }

  golden(): void {
    ;[0, 4, 7, 12, 16].forEach((s, i) =>
      this.tone(659.25 * Math.pow(2, s / 12), 0.12, { type: 'triangle', vol: 0.17, delay: i * 0.05 })
    )
  }

  powerUp(): void {
    this.tone(300, 0.35, { type: 'sawtooth', vol: 0.1, slide: 1400 })
    this.tone(450, 0.35, { type: 'triangle', vol: 0.14, slide: 1800, delay: 0.04 })
  }

  turn(): void {
    this.tone(1800, 0.025, { type: 'sine', vol: 0.025 })
  }

  grace(): void {
    this.tone(220, 0.08, { type: 'square', vol: 0.08 })
  }

  teleport(): void {
    this.tone(1600, 0.25, { type: 'sine', vol: 0.15, slide: 200 })
    this.tone(400, 0.25, { type: 'triangle', vol: 0.1, slide: 1800, delay: 0.05 })
  }

  expire(): void {
    this.tone(500, 0.15, { type: 'sine', vol: 0.06, slide: 250 })
  }

  wallSpawn(): void {
    this.noise(0.25, { vol: 0.2, freq: 400 })
    this.tone(90, 0.25, { type: 'square', vol: 0.12, slide: 60 })
  }

  die(): void {
    this.noise(0.6, { vol: 0.45, freq: 900 })
    this.tone(320, 0.7, { type: 'sawtooth', vol: 0.22, slide: 40 })
    this.tone(160, 0.9, { type: 'square', vol: 0.12, slide: 30, delay: 0.08 })
  }

  win(): void {
    const notes = [0, 4, 7, 12, 7, 12, 16, 19]
    notes.forEach((s, i) => this.tone(523.25 * Math.pow(2, s / 12), 0.22, { type: 'square', vol: 0.12, delay: i * 0.09 }))
    notes.forEach((s, i) => this.tone(261.63 * Math.pow(2, s / 12), 0.22, { type: 'triangle', vol: 0.12, delay: i * 0.09 }))
  }

  countdown(n: number): void {
    if (n > 0) this.tone(440, 0.12, { type: 'square', vol: 0.15 })
    else this.tone(880, 0.3, { type: 'square', vol: 0.18 })
  }

  click(): void {
    this.tone(900, 0.04, { type: 'triangle', vol: 0.1 })
  }

  hover(): void {
    this.tone(1300, 0.025, { type: 'sine', vol: 0.04 })
  }

  /* ---------------- música procedural ---------------- */

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v))
    this.tempo = 108 + this.intensity * 40
  }

  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return
    this.nextNoteTime = this.ctx.currentTime + 0.1
    this.step = 0
    this.musicTimer = window.setInterval(() => this.scheduler(), 25)
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private scheduler(): void {
    if (!this.ctx) return
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextNoteTime - this.ctx.currentTime)
      this.nextNoteTime += 60 / this.tempo / 4
      this.step = (this.step + 1) % 64
    }
  }

  private playStep(step: number, delay: number): void {
    const out = this.musicGain
    // progresión: Am - F - C - G
    const roots = [220, 174.61, 261.63, 196]
    const bar = Math.floor(step / 16)
    const root = roots[bar]
    const s = step % 16
    const minorPent = [0, 3, 5, 7, 10, 12]

    // bajo
    if (s % 4 === 0) this.tone(root / 2, 0.22, { type: 'triangle', vol: 0.35, delay, out })
    if (s % 4 === 2 && this.intensity > 0.3) this.tone(root / 2, 0.1, { type: 'triangle', vol: 0.2, delay, out })

    // arpegio
    if (s % 2 === 0) {
      const idx = (s / 2 + bar) % minorPent.length
      const f = root * 2 * Math.pow(2, minorPent[idx] / 12)
      this.tone(f, 0.12, { type: 'square', vol: 0.045 + this.intensity * 0.03, delay, out })
    }

    // percusión
    if (s % 8 === 0) {
      this.tone(120, 0.15, { type: 'sine', vol: 0.5, slide: 45, delay, out })
    }
    if (s % 8 === 4) this.noise(0.12, { vol: 0.18, freq: 2500, type: 'bandpass', delay, out })
    if (s % 2 === 1 && this.intensity > 0.15) this.noise(0.03, { vol: 0.06, freq: 8000, type: 'highpass', delay, out })
  }

  dispose(): void {
    this.stopMusic()
    this.ctx?.close().catch(() => {})
    this.ctx = null
  }
}

export const audio = new SoundEngine()
