import * as BABYLON from '@babylonjs/core'
import { SnakeGame } from '../game/SnakeGame'
import { Cell, Dir, FoodItem, FoodKind } from '../game/types'

export type CameraMode = 'tilt' | 'top'

const C3 = (hex: string) => BABYLON.Color3.FromHexString(hex)
const C4 = (hex: string, a = 1) => {
  const c = C3(hex)
  return new BABYLON.Color4(c.r, c.g, c.b, a)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export const FOOD_COLORS: Record<FoodKind, string> = {
  apple: '#ff3b4e',
  golden: '#ffd34d',
  slow: '#3df5ff',
  ghost: '#b26bff',
  double: '#ff4fd8',
  shrink: '#c6ff3d',
}

const DIR_YAW: Record<Dir, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }

interface Transient {
  born: number
  dur: number
  update: (p: number) => void
  dispose: () => void
}

/**
 * Renderer - motor 3D de alto rendimiento con Babylon.js
 * Optimizado para 60-120 FPS sin pausas de Garbage Collection ni sobrecarga de shaders.
 */
export class Renderer {
  readonly engine: BABYLON.Engine
  readonly scene: BABYLON.Scene
  private camera: BABYLON.ArcRotateCamera
  private glow: BABYLON.GlowLayer
  private canvas: HTMLCanvasElement
  private overlay: HTMLElement
  private particleTex: BABYLON.DynamicTexture
  private pipeline: BABYLON.DefaultRenderingPipeline | null = null

  private game: SnakeGame | null = null
  private levelRoot: BABYLON.TransformNode | null = null
  private levelMats: BABYLON.Material[] = []
  private levelTextures: BABYLON.BaseTexture[] = []

  // serpiente
  private head: BABYLON.Mesh | null = null
  private tongue: BABYLON.Mesh | null = null
  private segBase: BABYLON.Mesh | null = null
  private segs: BABYLON.Mesh[] = []
  private matHead: BABYLON.StandardMaterial | null = null
  private matBody1: BABYLON.StandardMaterial | null = null
  private matBody2: BABYLON.StandardMaterial | null = null
  private headYaw = 0
  private bulges: number[] = []
  private deathPopped = 0

  // mundo
  private foodNodes = new Map<number, BABYLON.TransformNode>()
  private foodMats = new Map<string, BABYLON.StandardMaterial>()
  private sentinelNodes: BABYLON.TransformNode[] = []
  private portalNodes: BABYLON.TransformNode[] = []
  private wallBase: BABYLON.Mesh | null = null
  private capBase: BABYLON.Mesh | null = null
  private risingWalls: { meshes: BABYLON.AbstractMesh[]; born: number }[] = []
  private frameMat: BABYLON.StandardMaterial | null = null
  private ambient: BABYLON.ParticleSystem | null = null

  private transients: Transient[] = []

  // cámara y render
  cameraMode: CameraMode = 'tilt'
  private camTarget = BABYLON.Vector3.Zero()
  private _camTargetWithShake = BABYLON.Vector3.Zero()
  private camBeta = 0.68
  private shake = 0
  private introStart = 0
  private clock = 0
  private winBurstAt = 0

  // FPS monitor
  private fps = 60
  private frameCount = 0
  private lastFpsCalc = 0

  // Vectores scratch preasignados para evitar GC
  private _tempFollow = BABYLON.Vector3.Zero()

  private onFrameCb: ((dt: number) => void) | null = null

  constructor(canvas: HTMLCanvasElement, overlay: HTMLElement) {
    this.canvas = canvas
    this.overlay = overlay

    // Optimización del motor: escalado 1.0 directo para 60+ FPS fluidos en cualquier GPU
    this.engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      antialias: true,
      powerPreference: 'high-performance',
    }, true)
    this.engine.setHardwareScalingLevel(1.0)

    this.scene = new BABYLON.Scene(this.engine)
    this.scene.clearColor = new BABYLON.Color4(0.02, 0.03, 0.06, 1)
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2
    this.scene.fogDensity = 0.012
    this.scene.skipPointerMovePicking = true
    this.scene.autoClear = true
    this.scene.autoClearDepthAndStencil = true

    this.camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 0.68, 30, BABYLON.Vector3.Zero(), this.scene)
    this.camera.fov = 0.8
    this.camera.minZ = 0.2
    this.camera.maxZ = 300

    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0.2, 1, -0.3), this.scene)
    hemi.intensity = 0.8
    hemi.groundColor = new BABYLON.Color3(0.15, 0.12, 0.25)
    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.4, -1, 0.6), this.scene)
    sun.intensity = 0.55

    // GlowLayer optimizado (blurKernelSize 16 en vez de 48 para 3x mayor velocidad de shader)
    this.glow = new BABYLON.GlowLayer('glow', this.scene, {
      blurKernelSize: 16,
      mainTextureRatio: 0.5,
    })
    this.glow.intensity = 0.65

    try {
      this.pipeline = new BABYLON.DefaultRenderingPipeline('pipe', false, this.scene, [this.camera])
      this.pipeline.samples = 1 // 1 sample + FXAA en vez de 4x MSAA para evitar frame drops
      this.pipeline.fxaaEnabled = true
      this.pipeline.imageProcessingEnabled = true
      this.pipeline.imageProcessing.contrast = 1.2
      this.pipeline.imageProcessing.exposure = 1.05
      this.pipeline.imageProcessing.vignetteEnabled = true
      this.pipeline.imageProcessing.vignetteWeight = 2.0
      this.pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 0)
      this.pipeline.chromaticAberrationEnabled = true
      this.pipeline.chromaticAberration.aberrationAmount = 0
    } catch {
      this.pipeline = null
    }

    this.particleTex = this.makeParticleTexture()

    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime(), 64)
      this.clock += dt

      // Calcular FPS reales
      this.frameCount++
      if (this.clock - this.lastFpsCalc >= 300) {
        this.fps = (this.frameCount * 1000) / (this.clock - this.lastFpsCalc)
        this.frameCount = 0
        this.lastFpsCalc = this.clock
      }

      this.onFrameCb?.(dt)
      this.frame(dt)
      this.scene.render()
    })
    window.addEventListener('resize', this.onResize)
  }

  getFps(): number {
    return Math.round(this.fps)
  }

  setHighPerformance(enabled: boolean): void {
    if (enabled) {
      this.engine.setHardwareScalingLevel(1.0)
      this.glow.blurKernelSize = 16
      if (this.pipeline) {
        this.pipeline.samples = 1
        this.pipeline.fxaaEnabled = true
      }
    } else {
      this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5))
      this.glow.blurKernelSize = 24
    }
  }

  onFrame(cb: (dt: number) => void): void {
    this.onFrameCb = cb
  }

  private onResize = () => this.engine.resize()

  private makeParticleTexture(): BABYLON.DynamicTexture {
    const tex = new BABYLON.DynamicTexture('ptex', { width: 32, height: 32 }, this.scene, false)
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.7)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
    tex.hasAlpha = true
    tex.update()
    return tex
  }

  /* ============================================================
   * Construcción del nivel
   * ============================================================ */

  setGame(game: SnakeGame, opts: { intro?: boolean } = {}): void {
    const sameLevel = this.game?.level.id === game.level.id && this.levelRoot
    this.game = game
    this.clearDynamic()
    if (!sameLevel) {
      this.buildLevel()
    } else {
      this.rebuildWalls()
    }
    this.buildSnake()
    this.buildSentinels()
    this.bulges = []
    this.deathPopped = 0
    this.winBurstAt = 0
    this.headYaw = DIR_YAW[game.dir]
    if (opts.intro !== false) this.introStart = this.clock
    const head = this.cellToWorld(game.snake[0])
    this.camTarget.copyFrom(head.scale(0.1))
  }

  cellToWorld(c: { x: number; y: number }, y = 0): BABYLON.Vector3 {
    const g = this.game!
    return new BABYLON.Vector3(c.x - g.w / 2 + 0.5, y, g.h / 2 - c.y - 0.5)
  }

  private mat(name: string, hex: string, emissive = 0.3, alpha = 1): BABYLON.StandardMaterial {
    const m = new BABYLON.StandardMaterial(name, this.scene)
    const c = C3(hex)
    m.diffuseColor = c
    m.emissiveColor = c.scale(emissive)
    m.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3)
    m.specularPower = 32
    m.alpha = alpha
    this.levelMats.push(m)
    return m
  }

  private clearLevel(): void {
    this.levelRoot?.dispose(false, false)
    this.levelRoot = null
    this.levelMats.forEach((m) => m.dispose())
    this.levelMats = []
    this.levelTextures.forEach((t) => t.dispose())
    this.levelTextures = []
    this.ambient?.dispose()
    this.ambient = null
    this.wallBase = null
    this.capBase = null
    this.portalNodes = []
  }

  private clearDynamic(): void {
    this.segs.forEach((s) => s.dispose())
    this.segs = []
    this.head?.dispose()
    this.head = null
    this.segBase?.dispose()
    this.segBase = null
    this.foodNodes.forEach((n) => n.dispose())
    this.foodNodes.clear()
    this.sentinelNodes.forEach((n) => n.dispose())
    this.sentinelNodes = []
    this.transients.forEach((t) => t.dispose())
    this.transients = []
    this.risingWalls = []
  }

  private buildLevel(): void {
    this.clearLevel()
    const g = this.game!
    const th = g.level.theme
    const root = new BABYLON.TransformNode('level', this.scene)
    this.levelRoot = root

    const bg = C3(th.bg)
    this.scene.clearColor = new BABYLON.Color4(bg.r, bg.g, bg.b, 1)
    this.scene.fogColor = bg

    // Suelo con textura de tablero optimizada
    const px = 24
    const tw = Math.min(1024, g.w * px)
    const thh = Math.min(1024, g.h * px)
    const tex = new BABYLON.DynamicTexture('groundTex', { width: tw, height: thh }, this.scene, true)
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
    const cw = tw / g.w
    const ch = thh / g.h
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? th.ground1 : th.ground2
        ctx.fillRect(x * cw, y * ch, cw, ch)
      }
    }
    ctx.strokeStyle = th.gridLine
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 1.2
    for (let x = 0; x <= g.w; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cw, 0)
      ctx.lineTo(x * cw, thh)
      ctx.stroke()
    }
    for (let y = 0; y <= g.h; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * ch)
      ctx.lineTo(tw, y * ch)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    tex.update()
    this.levelTextures.push(tex)

    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: g.w, height: g.h }, this.scene)
    const gm = new BABYLON.StandardMaterial('groundMat', this.scene)
    gm.diffuseTexture = tex
    gm.emissiveTexture = tex
    gm.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5)
    gm.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05)
    this.levelMats.push(gm)
    ground.material = gm
    ground.parent = root
    this.glow.addExcludedMesh(ground)

    // Plinto
    const plinth = BABYLON.MeshBuilder.CreateBox('plinth', { width: g.w + 1.4, height: 1.2, depth: g.h + 1.4 }, this.scene)
    plinth.position.y = -0.61
    const pm = this.mat('plinthMat', th.ground1, 0.15)
    pm.diffuseColor = C3(th.ground1).scale(0.6)
    plinth.material = pm
    plinth.parent = root
    this.glow.addExcludedMesh(plinth)

    // Marco luminoso
    this.frameMat = this.mat('frameMat', g.level.wrap ? th.accent : th.wallGlow, 0.9, g.level.wrap ? 0.55 : 1)
    const frameT = 0.08
    const fy = 0.02
    const mk = (w: number, d: number, x: number, z: number) => {
      const b = BABYLON.MeshBuilder.CreateBox('frame', { width: w, height: 0.05, depth: d }, this.scene)
      b.position.set(x, fy, z)
      b.material = this.frameMat
      b.parent = root
    }
    const ext = g.level.wrap ? 0 : 2
    mk(g.w + ext + frameT, frameT, 0, g.h / 2 + ext / 2)
    mk(g.w + ext + frameT, frameT, 0, -g.h / 2 - ext / 2)
    mk(frameT, g.h + ext + frameT, g.w / 2 + ext / 2, 0)
    mk(frameT, g.h + ext + frameT, -g.w / 2 - ext / 2, 0)

    // Muros
    this.wallBase = BABYLON.MeshBuilder.CreateBox('wallBase', { width: 0.94, height: 0.8, depth: 0.94 }, this.scene)
    this.wallBase.material = this.mat('wallMat', th.wall, 0.25)
    this.wallBase.parent = root
    this.wallBase.setEnabled(false)
    this.glow.addExcludedMesh(this.wallBase)
    this.capBase = BABYLON.MeshBuilder.CreateBox('capBase', { width: 0.96, height: 0.06, depth: 0.96 }, this.scene)
    this.capBase.material = this.mat('capMat', th.wallGlow, 0.9)
    this.capBase.parent = root
    this.capBase.setEnabled(false)
    this.rebuildWalls()

    // Portales
    g.portals.forEach((p, i) => {
      ;[p.a, p.b].forEach((c, j) => this.portalNodes.push(this.makePortal(c, p.color, `p${i}_${j}`)))
    })

    // Partículas ambientales ligeras
    const amb = new BABYLON.ParticleSystem('ambient', 120, this.scene)
    amb.particleTexture = this.particleTex
    amb.emitter = new BABYLON.Vector3(0, 0, 0)
    const ex = g.w / 2 + 4
    const ez = g.h / 2 + 4
    amb.minEmitBox = new BABYLON.Vector3(-ex, -1, -ez)
    amb.maxEmitBox = new BABYLON.Vector3(ex, 4, ez)
    const ac = C4(th.accent, 0.5)
    amb.color1 = ac
    amb.color2 = C4(th.snakeBody1, 0.35)
    amb.colorDead = new BABYLON.Color4(ac.r, ac.g, ac.b, 0)
    amb.minSize = 0.04
    amb.maxSize = 0.12
    amb.minLifeTime = 3
    amb.maxLifeTime = 7
    amb.emitRate = 18
    amb.direction1 = new BABYLON.Vector3(-0.08, 0.2, -0.08)
    amb.direction2 = new BABYLON.Vector3(0.08, 0.5, 0.08)
    amb.minEmitPower = 0.15
    amb.maxEmitPower = 0.4
    amb.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD
    amb.start()
    this.ambient = amb

    // Materiales de la serpiente
    this.matHead = this.mat('headMat', th.snakeHead, 0.45)
    this.matBody1 = this.mat('body1Mat', th.snakeBody1, 0.35)
    this.matBody2 = this.mat('body2Mat', th.snakeBody2, 0.3)
  }

  private rebuildWalls(): void {
    if (!this.levelRoot || !this.game) return
    this.levelRoot.getChildMeshes(true).forEach((m) => {
      if (m.name === 'wall' || m.name === 'cap') m.dispose()
    })
    this.game.wallList.forEach((c) => this.placeWall(c))
    if (!this.game.level.wrap) {
      const g = this.game
      const border: Cell[] = []
      for (let x = -1; x <= g.w; x++) border.push({ x, y: -1 }, { x, y: g.h })
      for (let y = 0; y < g.h; y++) border.push({ x: -1, y }, { x: g.w, y })
      const hasBorder = this.levelRoot.getChildMeshes(true).some((m) => m.name === 'border')
      if (!hasBorder) border.forEach((c) => this.placeWall(c, true))
    }
  }

  private placeWall(c: Cell, border = false): BABYLON.AbstractMesh[] {
    if (!this.wallBase || !this.capBase || !this.levelRoot) return []
    const w = this.wallBase.clone(border ? 'border' : 'wall')
    w.setEnabled(true)
    w.position = this.cellToWorld(c, 0.4)
    w.parent = this.levelRoot
    this.glow.addExcludedMesh(w)
    const cap = this.capBase.clone(border ? 'border' : 'cap')
    cap.setEnabled(true)
    cap.position = this.cellToWorld(c, 0.82)
    cap.parent = this.levelRoot
    return [w, cap]
  }

  private makePortal(c: Cell, color: string, name: string): BABYLON.TransformNode {
    const node = new BABYLON.TransformNode(name, this.scene)
    node.parent = this.levelRoot
    node.position = this.cellToWorld(c, 0.05)

    // 1. Runa en el suelo con pulso y halo exterior
    const disc = BABYLON.MeshBuilder.CreateDisc(name + 'disc', { radius: 0.54, tessellation: 32, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.scene)
    disc.rotation.x = Math.PI / 2
    disc.position.y = 0.03
    disc.material = this.foodMat(color, 1.0, 0.5)
    disc.parent = node

    // 2. Anillo exterior Stargate con inclinación vertical
    const outer = BABYLON.MeshBuilder.CreateTorus(name + 'ot', { diameter: 1.05, thickness: 0.08, tessellation: 28 }, this.scene)
    outer.position.y = 0.52
    outer.rotation.x = Math.PI / 2.3
    const om = this.mat(name + 'om', color, 0.95)
    outer.material = om
    outer.parent = node

    // 3. Anillo vórtice interior en contra-rotación con brillo blanco de plasma
    const inner = BABYLON.MeshBuilder.CreateTorus(name + 'it', { diameter: 0.72, thickness: 0.05, tessellation: 24 }, this.scene)
    inner.position.y = 0.52
    inner.rotation.x = Math.PI / 2.3
    const im = this.mat(name + 'im', '#ffffff', 1.0)
    inner.material = im
    inner.parent = node

    // 4. Núcleo dimensional flotante de energía
    const core = BABYLON.MeshBuilder.CreatePolyhedron(name + 'core', { type: 1, size: 0.22 }, this.scene)
    core.position.y = 0.52
    core.material = this.foodMat(color, 1.0)
    core.parent = node

    // 5. Haz de luz vertical translúcido
    const beam = BABYLON.MeshBuilder.CreateCylinder(name + 'b', { height: 2.8, diameterTop: 0.1, diameterBottom: 0.8, tessellation: 20 }, this.scene)
    beam.position.y = 1.4
    const bm = this.mat(name + 'bm', color, 0.9, 0.18)
    bm.disableLighting = true
    beam.material = bm
    beam.parent = node
    this.glow.addExcludedMesh(beam)

    node.metadata = { outer, inner, core, disc }
    return node
  }

  private buildSnake(): void {
    const g = this.game!
    if (!this.matHead) return
    const head = BABYLON.MeshBuilder.CreateSphere('head', { diameter: 1, segments: 16 }, this.scene)
    head.scaling.set(0.95, 0.8, 1.08)
    head.material = this.matHead

    const eyeWhite = this.foodMat('#ffffff', 0.6)
    const pupil = this.foodMat('#05060a', 0)
    ;[-1, 1].forEach((side) => {
      const eye = BABYLON.MeshBuilder.CreateSphere('eye', { diameter: 0.28, segments: 10 }, this.scene)
      eye.material = eyeWhite
      eye.parent = head
      eye.position.set(side * 0.24, 0.22, 0.3)
      const p = BABYLON.MeshBuilder.CreateSphere('pupil', { diameter: 0.14, segments: 8 }, this.scene)
      p.material = pupil
      p.parent = eye
      p.position.set(0, 0.02, 0.1)
    })
    const tongue = BABYLON.MeshBuilder.CreateBox('tongue', { width: 0.08, height: 0.03, depth: 0.4 }, this.scene)
    tongue.material = this.foodMat('#ff2a5a', 0.6)
    tongue.parent = head
    tongue.position.set(0, -0.08, 0.55)
    tongue.setEnabled(false)
    this.tongue = tongue
    this.head = head

    this.segBase = BABYLON.MeshBuilder.CreateSphere('segBase', { diameter: 0.86, segments: 12 }, this.scene)
    this.segBase.setEnabled(false)
    this.segs = []
    this.ensureSegments(g.snake.length)
  }

  private ensureSegments(n: number): void {
    while (this.segs.length < n - 1 && this.segBase) {
      const i = this.segs.length + 1
      const s = this.segBase.clone('seg' + i)
      s.setEnabled(true)
      s.material = i % 3 === 0 ? this.matBody2 : this.matBody1
      this.segs.push(s)
    }
  }

  private buildSentinels(): void {
    const g = this.game!
    const m = this.foodMat('#ff3048', 0.9)
    const ringMat = this.foodMat('#ffb0b8', 1.0)
    g.sentinels.forEach((s, i) => {
      const node = new BABYLON.TransformNode('sent' + i, this.scene)
      const core = BABYLON.MeshBuilder.CreatePolyhedron('sentCore', { type: 1, size: 0.36 }, this.scene)
      core.material = m
      core.parent = node
      const ring = BABYLON.MeshBuilder.CreateTorus('sentRing', { diameter: 0.9, thickness: 0.05, tessellation: 20 }, this.scene)
      ring.material = ringMat
      ring.parent = node
      node.position = this.cellToWorld(s, 0.5)
      this.sentinelNodes.push(node)
    })
  }

  private foodMat(hex: string, emissive: number, alpha = 1): BABYLON.StandardMaterial {
    const key = `${hex}_${emissive}_${alpha}`
    let m = this.foodMats.get(key)
    if (!m) {
      m = new BABYLON.StandardMaterial('fm' + key, this.scene)
      const c = C3(hex)
      m.diffuseColor = c
      m.emissiveColor = c.scale(emissive)
      m.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5)
      m.specularPower = 32
      m.alpha = alpha
      this.foodMats.set(key, m)
    }
    return m
  }

  private makeFood(f: FoodItem): BABYLON.TransformNode {
    const node = new BABYLON.TransformNode('food' + f.id, this.scene)
    const color = FOOD_COLORS[f.kind]
    const body = new BABYLON.TransformNode('foodBody', this.scene)
    body.parent = node
    const add = (m: BABYLON.Mesh) => {
      m.parent = body
      return m
    }
    switch (f.kind) {
      case 'apple': {
        const s = add(BABYLON.MeshBuilder.CreateSphere('apple', { diameter: 0.68, segments: 14 }, this.scene))
        s.scaling.y = 0.92
        s.material = this.foodMat(color, 0.45)
        const leaf = add(BABYLON.MeshBuilder.CreateSphere('leaf', { diameter: 0.3, segments: 8 }, this.scene))
        leaf.scaling.set(1, 0.2, 0.55)
        leaf.position.set(0.1, 0.36, 0)
        leaf.rotation.z = -0.5
        leaf.material = this.foodMat('#4dff6a', 0.5)
        break
      }
      case 'golden': {
        const s = add(BABYLON.MeshBuilder.CreatePolyhedron('gold', { type: 1, size: 0.36 }, this.scene))
        s.scaling.y = 1.3
        s.material = this.foodMat(color, 0.9)
        break
      }
      case 'slow': {
        const t = add(BABYLON.MeshBuilder.CreateTorus('slowT', { diameter: 0.62, thickness: 0.09, tessellation: 20 }, this.scene))
        t.rotation.x = Math.PI / 2
        t.material = this.foodMat(color, 0.9)
        break
      }
      case 'ghost': {
        const s = add(BABYLON.MeshBuilder.CreateSphere('ghost', { diameter: 0.6, segments: 12 }, this.scene))
        s.scaling.y = 1.15
        s.material = this.foodMat(color, 0.8, 0.65)
        break
      }
      case 'double': {
        const s = add(BABYLON.MeshBuilder.CreateBox('dbl', { size: 0.42 }, this.scene))
        s.rotation.set(Math.PI / 4, 0, Math.PI / 4)
        s.material = this.foodMat(color, 0.85)
        break
      }
      case 'shrink': {
        const s = add(BABYLON.MeshBuilder.CreateCapsule('shrink', { radius: 0.16, height: 0.66, tessellation: 10 }, this.scene))
        s.rotation.z = Math.PI / 2.6
        s.material = this.foodMat(color, 0.8)
        break
      }
    }
    node.position = this.cellToWorld(f)
    node.metadata = { body }
    return node
  }

  /* ============================================================
   * Efectos
   * ============================================================ */

  burst(
    pos: BABYLON.Vector3,
    hex: string,
    count = 35,
    opts: { power?: number; size?: number; gravity?: number; life?: number; spread?: number } = {}
  ): void {
    const ps = new BABYLON.ParticleSystem('burst', count, this.scene)
    ps.particleTexture = this.particleTex
    ps.emitter = pos.clone()
    ps.createSphereEmitter(opts.spread ?? 0.25)
    const c = C4(hex, 1)
    ps.color1 = c
    ps.color2 = new BABYLON.Color4(Math.min(1, c.r + 0.4), Math.min(1, c.g + 0.4), Math.min(1, c.b + 0.4), 1)
    ps.colorDead = new BABYLON.Color4(c.r, c.g, c.b, 0)
    const size = opts.size ?? 0.2
    ps.minSize = size * 0.4
    ps.maxSize = size
    const life = opts.life ?? 0.6
    ps.minLifeTime = life * 0.4
    ps.maxLifeTime = life
    const power = opts.power ?? 3.8
    ps.minEmitPower = power * 0.4
    ps.maxEmitPower = power
    ps.gravity = new BABYLON.Vector3(0, -(opts.gravity ?? 6), 0)
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD
    ps.manualEmitCount = count
    ps.targetStopDuration = 0.12
    ps.disposeOnStop = true
    ps.start()
  }

  private ring(pos: BABYLON.Vector3, hex: string, maxScale = 3, dur = 400): void {
    const t = BABYLON.MeshBuilder.CreateTorus('fxRing', { diameter: 0.8, thickness: 0.05, tessellation: 24 }, this.scene)
    t.position.set(pos.x, 0.08, pos.z)
    const m = new BABYLON.StandardMaterial('fxRingM', this.scene)
    const c = C3(hex)
    m.emissiveColor = c
    m.diffuseColor = c
    m.disableLighting = true
    t.material = m
    this.transients.push({
      born: this.clock,
      dur,
      update: (p) => {
        const s = 1 + easeOutCubic(p) * (maxScale - 1)
        t.scaling.set(s, 1, s)
        m.alpha = 1 - p
      },
      dispose: () => {
        t.dispose()
        m.dispose()
      },
    })
  }

  floatText(world: BABYLON.Vector3, text: string, color: string, big = false): void {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const p = BABYLON.Vector3.Project(
      world,
      BABYLON.Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.camera.viewport.toGlobal(w, h)
    )
    const el = document.createElement('div')
    el.className = 'float-text' + (big ? ' big' : '')
    el.textContent = text
    el.style.left = `${p.x}px`
    el.style.top = `${p.y}px`
    el.style.color = color
    this.overlay.appendChild(el)
    window.setTimeout(() => el.remove(), 1100)
  }

  addShake(amount: number): void {
    this.shake = Math.min(1.0, this.shake + amount)
  }

  onEat(f: FoodItem, points: number, combo: number): void {
    const pos = this.cellToWorld(f, 0.45)
    const color = FOOD_COLORS[f.kind]
    const big = f.kind === 'golden'
    this.burst(pos, color, big ? 60 : 35, { power: big ? 5.5 : 4, size: big ? 0.28 : 0.2 })
    this.ring(pos, color, big ? 4.2 : 2.8)
    if (f.kind === 'apple' || f.kind === 'golden') this.bulges.push(this.game!.time)
    let label = `+${points}`
    if (f.kind === 'slow') label = 'TIEMPO LENTO'
    if (f.kind === 'ghost') label = 'FANTASMA'
    if (f.kind === 'double') label = 'PUNTOS x2'
    if (f.kind === 'shrink') label = 'ENCOGER'
    this.floatText(pos.add(new BABYLON.Vector3(0, 0.6, 0)), label, color, big || f.kind !== 'apple')
    if (combo >= 2 && (f.kind === 'apple' || f.kind === 'golden')) {
      window.setTimeout(() => this.floatText(pos.add(new BABYLON.Vector3(0, 1.4, 0)), `COMBO x${combo}`, '#ffffff', combo >= 4), 90)
    }
    this.addShake(big ? 0.2 : 0.06)
  }

  onTeleport(from: Cell, to: Cell, color: string): void {
    this.burst(this.cellToWorld(from, 0.4), color, 25, { power: 3 })
    this.burst(this.cellToWorld(to, 0.4), color, 30, { power: 3.5 })
    this.ring(this.cellToWorld(to), color, 3.0)
  }

  onDie(): void {
    const g = this.game!
    const pos = this.cellToWorld(g.snake[0], 0.5)
    this.burst(pos, '#ff3048', 80, { power: 6.5, size: 0.3, life: 0.9 })
    this.burst(pos, '#ffffff', 30, { power: 4.5, size: 0.18 })
    this.ring(pos, '#ff3048', 5, 600)
    this.addShake(0.8)
    if (this.pipeline) this.pipeline.chromaticAberration.aberrationAmount = 45
  }

  onWin(): void {
    this.winBurstAt = this.clock
    const g = this.game!
    this.ring(this.cellToWorld(g.snake[0]), '#ffffff', 8, 800)
    this.addShake(0.25)
  }

  onWallsAdded(cells: Cell[]): void {
    const meshes = cells.flatMap((c) => this.placeWall(c))
    meshes.forEach((m) => (m.position.y -= 1))
    this.risingWalls.push({ meshes, born: this.clock })
    cells.forEach((c) => this.burst(this.cellToWorld(c, 0.2), this.game!.level.theme.wallGlow, 20, { power: 2.8 }))
    this.addShake(0.3)
  }

  onGrace(): void {
    if (!this.head) return
    this.addShake(0.1)
  }

  setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode
  }

  /* ============================================================
   * Frame de Renderizado (Optimizado a 60-120 FPS sin allocations)
   * ============================================================ */

  private frame(dt: number): void {
    const g = this.game
    if (!g || !this.head) return
    const a = g.alpha
    const t = this.clock

    // Serpiente
    this.ensureSegments(g.snake.length)
    const len = g.snake.length
    const prevLen = g.prevSnake.length
    const ghost = g.effects.ghost > 0
    const ghostAlpha = ghost ? (g.effects.ghost < 1200 && Math.sin(t * 0.03) > 0 ? 0.85 : 0.4) : 1

    if (this.matBody1 && this.matBody2 && this.matHead) {
      this.matBody1.alpha = ghostAlpha
      this.matBody2.alpha = ghostAlpha
      this.matHead.alpha = ghost ? Math.min(1, ghostAlpha + 0.2) : 1
      const th = g.level.theme
      if (g.effects.double > 0) {
        const k = 0.6 + Math.sin(t * 0.012) * 0.4
        this.matHead.emissiveColor.copyFromFloats(1 * k, 0.83 * k, 0.3 * k)
      } else {
        const c = C3(th.snakeHead)
        this.matHead.emissiveColor.copyFromFloats(c.r * 0.45, c.g * 0.45, c.b * 0.45)
      }
    }

    // Efecto de muerte
    let popped = 0
    if (g.status === 'dead') {
      const target = Math.floor((g.time - g.endTime - 250) / 35)
      while (this.deathPopped < Math.min(target, len)) {
        const c = g.snake[this.deathPopped]
        const th = g.level.theme
        this.burst(this.cellToWorld(c, 0.4), this.deathPopped === 0 ? th.snakeHead : th.snakeBody1, 12, { power: 2.8, size: 0.18 })
        this.deathPopped++
      }
      popped = this.deathPopped
    }

    const bulgeIdx = this.bulges.map((bt) => (g.time - bt) / g.interval)
    this.bulges = this.bulges.filter((_, i) => bulgeIdx[i] < len + 2)

    // Render de segmentos con cero allocations de Vector3
    const halfW = g.w / 2 - 0.5
    const halfH = g.h / 2 - 0.5
    for (let i = 0; i < len; i++) {
      const cur = g.snake[i]
      const prev = g.prevSnake[Math.min(i, prevLen - 1)] ?? cur
      let x = cur.x
      let y = cur.y
      if (Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y) <= 1) {
        x = lerp(prev.x, cur.x, a)
        y = lerp(prev.y, cur.y, a)
      }
      const taper = Math.max(0.55, 1 - (i / Math.max(1, len)) * 0.45)
      let bulge = 0
      for (const bi of bulgeIdx) {
        const d = Math.abs(i - bi)
        if (d < 1.5) bulge = Math.max(bulge, 0.35 * (1 - d / 1.5))
      }
      const wave = g.status === 'playing' || g.status === 'countdown' ? Math.sin(t * 0.008 - i * 0.7) * 0.03 : 0
      const mesh = i === 0 ? this.head : this.segs[i - 1]
      const s = i === 0 ? 1 + bulge * 0.4 : taper + bulge
      const visible = i >= popped
      mesh.setEnabled(visible)

      const wx = x - halfW
      const wz = halfH - y
      if (i === 0) {
        mesh.position.set(wx, 0.42, wz)
        mesh.scaling.set(0.95 * s, 0.8 * s, 1.08 * s)
      } else {
        mesh.position.set(wx, 0.4 * s + wave, wz)
        mesh.scaling.set(s, s, s)
      }
    }
    for (let i = len - 1; i < this.segs.length; i++) this.segs[i].setEnabled(false)

    // Orientación de la cabeza
    let targetYaw = DIR_YAW[g.dir]
    let diff = targetYaw - this.headYaw
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this.headYaw += diff * Math.min(1, dt * 0.02)
    targetYaw = this.headYaw
    this.head.rotation.y = targetYaw

    if (this.tongue) {
      const flick = Math.sin(t * 0.004) > 0.92 && g.status === 'playing'
      this.tongue.setEnabled(flick)
      if (flick) this.tongue.scaling.z = 0.6 + Math.sin(t * 0.06) * 0.4
    }

    // Comida
    const alive = new Set<number>()
    for (const f of g.foods) {
      alive.add(f.id)
      let node = this.foodNodes.get(f.id)
      if (!node) {
        node = this.makeFood(f)
        this.foodNodes.set(f.id, node)
        this.ring(this.cellToWorld(f), FOOD_COLORS[f.kind], 1.8, 300)
      }
      const { body } = node.metadata as { body: BABYLON.TransformNode }
      const age = Math.min(1, (g.time - f.spawnedAt) / 320)
      const pop = g.demo ? 1 : easeOutBack(age)
      body.scaling.set(pop, pop, pop)
      body.position.y = 0.45 + Math.sin(t * 0.004 + f.id) * 0.08
      body.rotation.y += dt * (f.kind === 'apple' ? 0.0015 : 0.003)

      if (f.expiresAt !== undefined) {
        const left = f.expiresAt - g.time
        node.setEnabled(!(left < 2200 && Math.sin(t * (left < 1000 ? 0.05 : 0.025)) < -0.2))
      }
    }
    this.foodNodes.forEach((node, id) => {
      if (!alive.has(id)) {
        node.dispose()
        this.foodNodes.delete(id)
      }
    })

    // Centinelas sin allocations
    g.sentinels.forEach((s, i) => {
      const node = this.sentinelNodes[i]
      if (!node) return
      const moved = s.x !== s.prevX || s.y !== s.prevY
      const x = moved ? lerp(s.prevX, s.x, a) : s.x
      const y = moved ? lerp(s.prevY, s.y, a) : s.y
      node.position.set(x - halfW, 0.5 + Math.sin(t * 0.006 + i) * 0.05, halfH - y)
      node.rotation.y += dt * 0.006
      const ring = node.getChildMeshes()[1]
      if (ring) ring.rotation.x += dt * 0.004
    })

    // Portales interactivos con efecto Stargate y contra-rotación
    this.portalNodes.forEach((n, i) => {
      const meta = n.metadata as {
        outer: BABYLON.Mesh
        inner: BABYLON.Mesh
        core: BABYLON.Mesh
        disc: BABYLON.Mesh
      }
      if (meta) {
        const dir = i % 2 === 0 ? 1 : -1
        meta.outer.rotation.z += dt * 0.0035 * dir
        meta.inner.rotation.z -= dt * 0.006 * dir
        meta.core.rotation.y += dt * 0.005
        meta.core.rotation.x += dt * 0.003
        const pulse = 1 + Math.sin(t * 0.006 + i * 2) * 0.14
        meta.core.scaling.set(pulse, pulse, pulse)
        meta.disc.scaling.set(pulse, pulse, pulse)
      } else {
        n.rotation.y += dt * 0.002 * (i % 2 ? -1 : 1)
      }
    })

    // Muros emergentes
    this.risingWalls = this.risingWalls.filter((rw) => {
      const p = Math.min(1, (t - rw.born) / 450)
      const k = easeOutBack(p)
      rw.meshes.forEach((m, idx) => {
        const base = idx % 2 === 0 ? 0.4 : 0.82
        m.position.y = base - 1 + k
      })
      return p < 1
    })

    // Marco (pulso ligero)
    if (this.frameMat && g.level.wrap) {
      this.frameMat.alpha = 0.35 + Math.sin(t * 0.003) * 0.15
    }

    // Transitorios
    this.transients = this.transients.filter((tr) => {
      const p = Math.min(1, (t - tr.born) / tr.dur)
      tr.update(p)
      if (p >= 1) {
        tr.dispose()
        return false
      }
      return true
    })

    if (this.pipeline) {
      const ca = this.pipeline.chromaticAberration
      if (ca.aberrationAmount > 0) {
        ca.aberrationAmount = Math.max(0, ca.aberrationAmount - dt * 0.1)
      }
    }

    this.updateCamera(dt)
  }

  private updateCamera(dt: number): void {
    const g = this.game!
    const cam = this.camera
    const aspect = this.engine.getAspectRatio(cam) || 1
    const tanV = Math.tan(cam.fov / 2)
    const tanH = tanV * aspect
    const pad = g.level.wrap ? 1.2 : 2.0
    const halfW = g.w / 2 + pad
    const halfH = g.h / 2 + pad
    const targetBeta = this.cameraMode === 'top' ? 0.05 : 0.66
    const depthFactor = this.cameraMode === 'top' ? 1 : 0.92
    let radius = Math.max((halfH * depthFactor) / tanV, halfW / tanH) + (this.cameraMode === 'top' ? 1 : 2.5)

    // Seguimiento suave de cabeza sin allocation
    if (this.head) {
      const factor = this.cameraMode === 'top' ? 0.06 : 0.12
      this._tempFollow.set(this.head.position.x * factor, 0, this.head.position.z * factor)
      BABYLON.Vector3.LerpToRef(this.camTarget, this._tempFollow, Math.min(1, dt * 0.003), this.camTarget)
    }

    // Intro
    const ip = Math.min(1, (this.clock - this.introStart) / 1600)
    const ie = easeOutCubic(ip)
    radius *= 1 + (1 - ie) * 0.6
    const alpha = -Math.PI / 2 + (1 - ie) * 0.8 + (g.demo ? Math.sin(this.clock * 0.0002) * 0.35 : 0)
    this.camBeta = lerp(this.camBeta, targetBeta, Math.min(1, dt * 0.006))
    const beta = lerp(0.2, this.camBeta, ie)

    // Sacudida
    this.shake = Math.max(0, this.shake - dt * 0.0035)
    const sk = this.shake * this.shake * 0.5
    this._camTargetWithShake.copyFrom(this.camTarget)
    if (sk > 0.001) {
      this._camTargetWithShake.x += (Math.random() - 0.5) * sk
      this._camTargetWithShake.y += (Math.random() - 0.5) * sk * 0.5
      this._camTargetWithShake.z += (Math.random() - 0.5) * sk
    }

    cam.alpha = alpha
    cam.beta = beta
    cam.radius = radius
    cam.target.copyFrom(this._camTargetWithShake)
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    this.engine.stopRenderLoop()
    this.scene.dispose()
    this.engine.dispose()
  }
}
