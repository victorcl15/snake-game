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
 * Renderer - toda la presentación 3D con Babylon.js
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

  // cámara
  cameraMode: CameraMode = 'tilt'
  private camTarget = BABYLON.Vector3.Zero()
  private camBeta = 0.68
  private shake = 0
  private introStart = 0
  private clock = 0
  private winBurstAt = 0

  private onFrameCb: ((dt: number) => void) | null = null

  constructor(canvas: HTMLCanvasElement, overlay: HTMLElement) {
    this.canvas = canvas
    this.overlay = overlay
    this.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true }, true)
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2))
    this.scene = new BABYLON.Scene(this.engine)
    this.scene.clearColor = new BABYLON.Color4(0.02, 0.03, 0.06, 1)
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2
    this.scene.fogDensity = 0.014
    this.scene.skipPointerMovePicking = true

    this.camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, 0.68, 30, BABYLON.Vector3.Zero(), this.scene)
    this.camera.fov = 0.8
    this.camera.minZ = 0.1
    this.camera.maxZ = 400

    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0.2, 1, -0.3), this.scene)
    hemi.intensity = 0.75
    hemi.groundColor = new BABYLON.Color3(0.15, 0.12, 0.25)
    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.4, -1, 0.6), this.scene)
    sun.intensity = 0.6

    this.glow = new BABYLON.GlowLayer('glow', this.scene, { blurKernelSize: 48, mainTextureRatio: 0.5 })
    this.glow.intensity = 0.75

    try {
      this.pipeline = new BABYLON.DefaultRenderingPipeline('pipe', true, this.scene, [this.camera])
      this.pipeline.samples = 4
      this.pipeline.fxaaEnabled = false
      this.pipeline.imageProcessingEnabled = true
      this.pipeline.imageProcessing.contrast = 1.25
      this.pipeline.imageProcessing.exposure = 1.05
      this.pipeline.imageProcessing.vignetteEnabled = true
      this.pipeline.imageProcessing.vignetteWeight = 2.2
      this.pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 0)
      this.pipeline.chromaticAberrationEnabled = true
      this.pipeline.chromaticAberration.aberrationAmount = 0
    } catch {
      this.pipeline = null
    }

    this.particleTex = this.makeParticleTexture()

    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime(), 100)
      this.clock += dt
      this.onFrameCb?.(dt)
      this.frame(dt)
      this.scene.render()
    })
    window.addEventListener('resize', this.onResize)
  }

  onFrame(cb: (dt: number) => void): void {
    this.onFrameCb = cb
  }

  private onResize = () => this.engine.resize()

  private makeParticleTexture(): BABYLON.DynamicTexture {
    const tex = new BABYLON.DynamicTexture('ptex', { width: 64, height: 64 }, this.scene, false)
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.7)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
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
      // reconstruir muros dinámicos (modo infinito) y entidades
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
    this.camTarget = head.scale(0.1)
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
    m.specularColor = new BABYLON.Color3(0.35, 0.35, 0.35)
    m.specularPower = 48
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

    // --- Suelo con textura de tablero ---
    const px = 32
    const tw = Math.min(2048, g.w * px)
    const thh = Math.min(2048, g.h * px)
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
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 1.5
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
    tex.anisotropicFilteringLevel = 8
    this.levelTextures.push(tex)

    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: g.w, height: g.h }, this.scene)
    const gm = new BABYLON.StandardMaterial('groundMat', this.scene)
    gm.diffuseTexture = tex
    gm.emissiveTexture = tex
    gm.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5)
    gm.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08)
    this.levelMats.push(gm)
    ground.material = gm
    ground.parent = root
    this.glow.addExcludedMesh(ground)

    // --- Plinto ---
    const plinth = BABYLON.MeshBuilder.CreateBox('plinth', { width: g.w + 1.6, height: 1.4, depth: g.h + 1.6 }, this.scene)
    plinth.position.y = -0.71
    const pm = this.mat('plinthMat', th.ground1, 0.15)
    pm.diffuseColor = C3(th.ground1).scale(0.6)
    plinth.material = pm
    plinth.parent = root
    this.glow.addExcludedMesh(plinth)

    // --- Horizonte ---
    const floor = BABYLON.MeshBuilder.CreateDisc('floor', { radius: 160, tessellation: 64, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.scene)
    floor.rotation.x = Math.PI / 2
    floor.position.y = -1.6
    const fm = this.mat('floorMat', th.bg, 0.6)
    fm.specularColor = BABYLON.Color3.Black()
    floor.material = fm
    floor.parent = root
    this.glow.addExcludedMesh(floor)

    // --- Marco luminoso ---
    this.frameMat = this.mat('frameMat', g.level.wrap ? th.accent : th.wallGlow, 1.0, g.level.wrap ? 0.55 : 1)
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

    // --- Muros ---
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

    // --- Portales ---
    g.portals.forEach((p, i) => {
      ;[p.a, p.b].forEach((c, j) => this.portalNodes.push(this.makePortal(c, p.color, `p${i}_${j}`)))
    })

    // --- Rutas de centinelas ---
    if (g.sentinels.length) {
      const markMat = this.mat('pathMat', '#ff3048', 0.6, 0.22)
      const base = BABYLON.MeshBuilder.CreateBox('pathMark', { width: 0.5, height: 0.02, depth: 0.5 }, this.scene)
      base.material = markMat
      base.parent = root
      base.setEnabled(false)
      g.sentinels.forEach((s) =>
        s.path.forEach((c) => {
          const m = base.clone('pm')
          m.setEnabled(true)
          m.position = this.cellToWorld(c, 0.02)
          m.parent = root
        })
      )
    }

    // --- Partículas ambientales ---
    const amb = new BABYLON.ParticleSystem('ambient', 260, this.scene)
    amb.particleTexture = this.particleTex
    amb.emitter = new BABYLON.Vector3(0, 0, 0)
    const ex = g.w / 2 + 6
    const ez = g.h / 2 + 6
    amb.minEmitBox = new BABYLON.Vector3(-ex, -1, -ez)
    amb.maxEmitBox = new BABYLON.Vector3(ex, 5, ez)
    const ac = C4(th.accent, 0.55)
    amb.color1 = ac
    amb.color2 = C4(th.snakeBody1, 0.4)
    amb.colorDead = new BABYLON.Color4(ac.r, ac.g, ac.b, 0)
    amb.minSize = 0.04
    amb.maxSize = 0.14
    amb.minLifeTime = 4
    amb.maxLifeTime = 9
    amb.emitRate = 28
    amb.direction1 = new BABYLON.Vector3(-0.1, 0.3, -0.1)
    amb.direction2 = new BABYLON.Vector3(0.1, 0.6, 0.1)
    amb.minEmitPower = 0.2
    amb.maxEmitPower = 0.5
    amb.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD
    amb.preWarmCycles = 200
    amb.start()
    this.ambient = amb

    // materiales de la serpiente
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
      // los bordes ya existen si el nivel no se reconstruyó; evitar duplicados
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
    const m = this.mat(name + 'm', color, 1.0)
    const torus = BABYLON.MeshBuilder.CreateTorus(name + 't', { diameter: 0.86, thickness: 0.1, tessellation: 32 }, this.scene)
    torus.material = m
    torus.parent = node
    const torus2 = BABYLON.MeshBuilder.CreateTorus(name + 't2', { diameter: 0.55, thickness: 0.06, tessellation: 24 }, this.scene)
    torus2.material = m
    torus2.parent = node
    torus2.position.y = 0.25
    const disc = BABYLON.MeshBuilder.CreateDisc(name + 'd', { radius: 0.4, tessellation: 32, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.scene)
    disc.rotation.x = Math.PI / 2
    disc.material = this.mat(name + 'dm', color, 0.8, 0.45)
    disc.parent = node
    const beam = BABYLON.MeshBuilder.CreateCylinder(name + 'b', { height: 3, diameterTop: 0.2, diameterBottom: 0.75, tessellation: 24 }, this.scene)
    beam.position.y = 1.5
    const bm = this.mat(name + 'bm', color, 1.0, 0.12)
    bm.disableLighting = true
    beam.material = bm
    beam.parent = node
    this.glow.addExcludedMesh(beam)
    return node
  }

  private buildSnake(): void {
    const g = this.game!
    if (!this.matHead) return
    const head = BABYLON.MeshBuilder.CreateSphere('head', { diameter: 1, segments: 20 }, this.scene)
    head.scaling.set(0.95, 0.8, 1.08)
    head.material = this.matHead

    const eyeWhite = this.foodMat('#ffffff', 0.6)
    const pupil = this.foodMat('#05060a', 0)
    ;[-1, 1].forEach((side) => {
      const eye = BABYLON.MeshBuilder.CreateSphere('eye', { diameter: 0.3, segments: 12 }, this.scene)
      eye.material = eyeWhite
      eye.parent = head
      eye.position.set(side * 0.24, 0.22, 0.3)
      const p = BABYLON.MeshBuilder.CreateSphere('pupil', { diameter: 0.15, segments: 8 }, this.scene)
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

    this.segBase = BABYLON.MeshBuilder.CreateSphere('segBase', { diameter: 0.86, segments: 14 }, this.scene)
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
      const ring = BABYLON.MeshBuilder.CreateTorus('sentRing', { diameter: 0.9, thickness: 0.05, tessellation: 24 }, this.scene)
      ring.material = ringMat
      ring.parent = node
      node.position = this.cellToWorld(s, 0.5)
      this.sentinelNodes.push(node)
    })
  }

  /** materiales compartidos (no dependen del nivel) */
  private foodMat(hex: string, emissive: number, alpha = 1): BABYLON.StandardMaterial {
    const key = `${hex}_${emissive}_${alpha}`
    let m = this.foodMats.get(key)
    if (!m) {
      m = new BABYLON.StandardMaterial('fm' + key, this.scene)
      const c = C3(hex)
      m.diffuseColor = c
      m.emissiveColor = c.scale(emissive)
      m.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6)
      m.specularPower = 64
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
        const s = add(BABYLON.MeshBuilder.CreateSphere('apple', { diameter: 0.68, segments: 16 }, this.scene))
        s.scaling.y = 0.92
        s.material = this.foodMat(color, 0.45)
        const leaf = add(BABYLON.MeshBuilder.CreateSphere('leaf', { diameter: 0.3, segments: 8 }, this.scene))
        leaf.scaling.set(1, 0.2, 0.55)
        leaf.position.set(0.1, 0.36, 0)
        leaf.rotation.z = -0.5
        leaf.material = this.foodMat('#4dff6a', 0.5)
        const stem = add(BABYLON.MeshBuilder.CreateCylinder('stem', { height: 0.18, diameter: 0.05 }, this.scene))
        stem.position.y = 0.36
        stem.material = this.foodMat('#7a4a22', 0.1)
        break
      }
      case 'golden': {
        const s = add(BABYLON.MeshBuilder.CreatePolyhedron('gold', { type: 1, size: 0.36 }, this.scene))
        s.scaling.y = 1.3
        s.material = this.foodMat(color, 0.9)
        break
      }
      case 'slow': {
        const t = add(BABYLON.MeshBuilder.CreateTorus('slowT', { diameter: 0.62, thickness: 0.09, tessellation: 24 }, this.scene))
        t.rotation.x = Math.PI / 2
        t.material = this.foodMat(color, 0.9)
        const c = add(BABYLON.MeshBuilder.CreateSphere('slowC', { diameter: 0.3, segments: 10 }, this.scene))
        c.material = this.foodMat('#ffffff', 0.8)
        const hand = add(BABYLON.MeshBuilder.CreateBox('hand', { width: 0.05, height: 0.24, depth: 0.05 }, this.scene))
        hand.position.y = 0.12
        hand.material = this.foodMat(color, 1)
        break
      }
      case 'ghost': {
        const s = add(BABYLON.MeshBuilder.CreateSphere('ghost', { diameter: 0.6, segments: 14 }, this.scene))
        s.scaling.y = 1.15
        s.material = this.foodMat(color, 0.8, 0.65)
        const t = add(BABYLON.MeshBuilder.CreateTorus('ghostT', { diameter: 0.8, thickness: 0.04, tessellation: 24 }, this.scene))
        t.material = this.foodMat(color, 1)
        break
      }
      case 'double': {
        const s = add(BABYLON.MeshBuilder.CreateBox('dbl', { size: 0.42 }, this.scene))
        s.rotation.set(Math.PI / 4, 0, Math.PI / 4)
        s.material = this.foodMat(color, 0.85)
        const s2 = add(BABYLON.MeshBuilder.CreateBox('dbl2', { size: 0.3 }, this.scene))
        s2.rotation.set(0, Math.PI / 4, Math.PI / 4)
        s2.position.y = 0.05
        s2.material = this.foodMat('#ffffff', 0.7)
        s2.scaling.setAll(0.7)
        break
      }
      case 'shrink': {
        const s = add(BABYLON.MeshBuilder.CreateCapsule('shrink', { radius: 0.16, height: 0.66, tessellation: 12 }, this.scene))
        s.rotation.z = Math.PI / 2.6
        s.material = this.foodMat(color, 0.8)
        break
      }
    }
    // halo en el suelo
    const disc = BABYLON.MeshBuilder.CreateDisc('halo', { radius: 0.46, tessellation: 32, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.scene)
    disc.rotation.x = Math.PI / 2
    disc.position.y = 0.03
    disc.material = this.foodMat(color, 1, 0.28)
    disc.parent = node
    node.position = this.cellToWorld(f)
    node.metadata = { body, disc }
    return node
  }

  /* ============================================================
   * Efectos
   * ============================================================ */

  burst(
    pos: BABYLON.Vector3,
    hex: string,
    count = 40,
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
    const size = opts.size ?? 0.22
    ps.minSize = size * 0.4
    ps.maxSize = size
    const life = opts.life ?? 0.7
    ps.minLifeTime = life * 0.4
    ps.maxLifeTime = life
    const power = opts.power ?? 4
    ps.minEmitPower = power * 0.4
    ps.maxEmitPower = power
    ps.gravity = new BABYLON.Vector3(0, -(opts.gravity ?? 6), 0)
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD
    ps.manualEmitCount = count
    ps.targetStopDuration = 0.15
    ps.disposeOnStop = true
    ps.start()
  }

  private ring(pos: BABYLON.Vector3, hex: string, maxScale = 3, dur = 450): void {
    const t = BABYLON.MeshBuilder.CreateTorus('fxRing', { diameter: 0.8, thickness: 0.06, tessellation: 32 }, this.scene)
    t.position = pos.clone()
    t.position.y = 0.08
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
    this.shake = Math.min(1.2, this.shake + amount)
  }

  /* --- hooks de eventos del juego --- */

  onEat(f: FoodItem, points: number, combo: number): void {
    const pos = this.cellToWorld(f, 0.45)
    const color = FOOD_COLORS[f.kind]
    const big = f.kind === 'golden'
    this.burst(pos, color, big ? 90 : 45, { power: big ? 6 : 4.5, size: big ? 0.3 : 0.22 })
    this.ring(pos, color, big ? 4.5 : 3)
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
    this.addShake(big ? 0.25 : 0.08)
  }

  onTeleport(from: Cell, to: Cell, color: string): void {
    this.burst(this.cellToWorld(from, 0.4), color, 30, { power: 3 })
    this.burst(this.cellToWorld(to, 0.4), color, 40, { power: 4 })
    this.ring(this.cellToWorld(to), color, 3.2)
  }

  onDie(): void {
    const g = this.game!
    const pos = this.cellToWorld(g.snake[0], 0.5)
    this.burst(pos, '#ff3048', 120, { power: 8, size: 0.35, life: 1 })
    this.burst(pos, '#ffffff', 40, { power: 5, size: 0.2 })
    this.ring(pos, '#ff3048', 6, 700)
    this.addShake(1)
    if (this.pipeline) this.pipeline.chromaticAberration.aberrationAmount = 60
  }

  onWin(): void {
    this.winBurstAt = this.clock
    const g = this.game!
    this.ring(this.cellToWorld(g.snake[0]), '#ffffff', 10, 900)
    this.addShake(0.3)
  }

  onWallsAdded(cells: Cell[]): void {
    const meshes = cells.flatMap((c) => this.placeWall(c))
    meshes.forEach((m) => (m.position.y -= 1))
    this.risingWalls.push({ meshes, born: this.clock })
    cells.forEach((c) => this.burst(this.cellToWorld(c, 0.2), this.game!.level.theme.wallGlow, 25, { power: 3 }))
    this.addShake(0.35)
  }

  onGrace(): void {
    if (!this.head) return
    this.addShake(0.12)
  }

  setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode
  }

  /* ============================================================
   * Frame
   * ============================================================ */

  private frame(dt: number): void {
    const g = this.game
    if (!g || !this.head) return
    const a = g.alpha
    const t = this.clock

    // ---------- serpiente ----------
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
        this.matHead.emissiveColor = C3('#ffd34d').scale(k)
      } else {
        this.matHead.emissiveColor = C3(th.snakeHead).scale(0.45)
      }
      if (g.status === 'won') {
        const hue = (t * 0.2) % 360
        const c = BABYLON.Color3.FromHSV(hue, 0.7, 1)
        this.matBody1.emissiveColor = c.scale(0.6)
      } else {
        this.matBody1.emissiveColor = C3(th.snakeBody1).scale(g.effects.slow > 0 ? 0.6 : 0.35)
      }
    }

    // muerte: los segmentos estallan de la cabeza a la cola
    let popped = 0
    if (g.status === 'dead') {
      const target = Math.floor((g.time - g.endTime - 250) / 35)
      while (this.deathPopped < Math.min(target, len)) {
        const c = g.snake[this.deathPopped]
        const th = g.level.theme
        this.burst(this.cellToWorld(c, 0.4), this.deathPopped === 0 ? th.snakeHead : th.snakeBody1, 14, { power: 3, size: 0.2 })
        this.deathPopped++
      }
      popped = this.deathPopped
    }

    const bulgeIdx = this.bulges.map((bt) => (g.time - bt) / g.interval)
    this.bulges = this.bulges.filter((_, i) => bulgeIdx[i] < len + 2)

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
      const wave = g.status === 'playing' || g.status === 'countdown' ? Math.sin(t * 0.008 - i * 0.7) * 0.035 : 0
      const mesh = i === 0 ? this.head : this.segs[i - 1]
      const s = i === 0 ? 1 + bulge * 0.4 : taper + bulge
      const visible = i >= popped
      mesh.setEnabled(visible)
      const wp = this.cellToWorld({ x, y })
      if (i === 0) {
        mesh.position.set(wp.x, 0.42, wp.z)
        mesh.scaling.set(0.95 * s, 0.8 * s, 1.08 * s)
      } else {
        mesh.position.set(wp.x, 0.4 * s + wave, wp.z)
        mesh.scaling.setAll(s)
      }
    }
    for (let i = len - 1; i < this.segs.length; i++) this.segs[i].setEnabled(false)

    // orientación de la cabeza
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
      this.tongue.scaling.z = 0.6 + Math.sin(t * 0.06) * 0.4
    }

    // ---------- comida ----------
    const alive = new Set<number>()
    for (const f of g.foods) {
      alive.add(f.id)
      let node = this.foodNodes.get(f.id)
      if (!node) {
        node = this.makeFood(f)
        this.foodNodes.set(f.id, node)
        this.ring(this.cellToWorld(f), FOOD_COLORS[f.kind], 2, 350)
      }
      const { body, disc } = node.metadata as { body: BABYLON.TransformNode; disc: BABYLON.Mesh }
      const age = Math.min(1, (g.time - f.spawnedAt) / 320)
      const pop = g.demo ? 1 : easeOutBack(age)
      body.scaling.setAll(Math.max(0.01, pop))
      body.position.y = 0.45 + Math.sin(t * 0.004 + f.id) * 0.08
      body.rotation.y += dt * (f.kind === 'apple' ? 0.0015 : 0.003)
      const ds = 1 + Math.sin(t * 0.006 + f.id) * 0.12
      disc.scaling.set(ds, ds, ds)
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

    // ---------- centinelas ----------
    g.sentinels.forEach((s, i) => {
      const node = this.sentinelNodes[i]
      if (!node) return
      const moved = s.x !== s.prevX || s.y !== s.prevY
      const x = moved ? lerp(s.prevX, s.x, a) : s.x
      const y = moved ? lerp(s.prevY, s.y, a) : s.y
      const wp = this.cellToWorld({ x, y }, 0.5 + Math.sin(t * 0.006 + i) * 0.06)
      node.position.copyFrom(wp)
      node.rotation.y += dt * 0.006
      const ring = node.getChildMeshes()[1]
      if (ring) ring.rotation.x += dt * 0.004
    })

    // ---------- portales ----------
    this.portalNodes.forEach((n, i) => {
      n.rotation.y += dt * 0.0025 * (i % 2 ? -1 : 1)
      const kids = n.getChildMeshes()
      if (kids[1]) kids[1].position.y = 0.25 + Math.sin(t * 0.005 + i) * 0.12
    })

    // ---------- muros emergentes ----------
    this.risingWalls = this.risingWalls.filter((rw) => {
      const p = Math.min(1, (t - rw.born) / 500)
      const k = easeOutBack(p)
      rw.meshes.forEach((m, idx) => {
        const base = idx % 2 === 0 ? 0.4 : 0.82
        m.position.y = base - 1 + k
      })
      return p < 1
    })

    // ---------- marco (pulso) ----------
    if (this.frameMat && g.level.wrap) this.frameMat.alpha = 0.35 + Math.sin(t * 0.003) * 0.2

    // ---------- celebración ----------
    if (g.status === 'won' && this.winBurstAt && t - this.winBurstAt < 1800) {
      if (Math.random() < dt * 0.012) {
        const colors = ['#ff3b4e', '#ffd34d', '#3df5ff', '#b26bff', '#4dff6a', '#ff4fd8']
        const p = new BABYLON.Vector3((Math.random() - 0.5) * g.w * 0.8, 1 + Math.random() * 2, (Math.random() - 0.5) * g.h * 0.8)
        this.burst(p, colors[Math.floor(Math.random() * colors.length)], 60, { power: 6, gravity: 4, size: 0.25, life: 1.2 })
      }
    }

    // ---------- transitorios ----------
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
      ca.aberrationAmount = Math.max(0, ca.aberrationAmount - dt * 0.08)
    }

    this.updateCamera(dt)
  }

  private updateCamera(dt: number): void {
    const g = this.game!
    const cam = this.camera
    const aspect = this.engine.getAspectRatio(cam) || 1
    const tanV = Math.tan(cam.fov / 2)
    const tanH = tanV * aspect
    const pad = g.level.wrap ? 1.2 : 2.2
    const halfW = g.w / 2 + pad
    const halfH = g.h / 2 + pad
    const targetBeta = this.cameraMode === 'top' ? 0.05 : 0.66
    const depthFactor = this.cameraMode === 'top' ? 1 : 0.92
    let radius = Math.max((halfH * depthFactor) / tanV, halfW / tanH) + (this.cameraMode === 'top' ? 1 : 2.5)

    // seguimiento suave de la cabeza
    const headW = this.head ? this.head.position.clone() : BABYLON.Vector3.Zero()
    headW.y = 0
    const follow = headW.scale(this.cameraMode === 'top' ? 0.06 : 0.12)
    this.camTarget = BABYLON.Vector3.Lerp(this.camTarget, follow, Math.min(1, dt * 0.003))

    // intro
    const ip = Math.min(1, (this.clock - this.introStart) / 1700)
    const ie = easeOutCubic(ip)
    radius *= 1 + (1 - ie) * 0.7
    const alpha = -Math.PI / 2 + (1 - ie) * 0.9 + (g.demo ? Math.sin(this.clock * 0.0002) * 0.35 : 0)
    this.camBeta = lerp(this.camBeta, targetBeta, Math.min(1, dt * 0.006))
    const beta = lerp(0.2, this.camBeta, ie)

    // sacudida
    this.shake = Math.max(0, this.shake - dt * 0.0035)
    const sk = this.shake * this.shake * 0.6
    const off = new BABYLON.Vector3((Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk * 0.5, (Math.random() - 0.5) * sk)

    cam.alpha = alpha
    cam.beta = beta
    cam.radius = radius
    cam.target.copyFrom(this.camTarget.add(off))
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    this.engine.stopRenderLoop()
    this.scene.dispose()
    this.engine.dispose()
  }
}
