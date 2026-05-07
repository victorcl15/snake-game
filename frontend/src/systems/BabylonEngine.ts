import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders'
import {
  BabylonEngineConfig,
  IBabylonEngine,
  SceneMeshes,
  SceneMaterials,
  SceneLights,
  RenderState,
  CameraOptions,
} from '../types/babylon'
import { InputController } from './InputController'
import { ParticleSystem } from './ParticleSystem'
import { AudioEngine } from './AudioEngine'

/**
 * BabylonEngine - Motor 3D principal
 * Encapsula toda la lógica de Babylon.js para el juego Snake 3D
 */
export class BabylonEngine implements IBabylonEngine {
  private engine: BABYLON.Engine | null = null
  private scene: BABYLON.Scene | null = null
  private camera: BABYLON.UniversalCamera | null = null
  private canvas: HTMLCanvasElement | null = null

  // Systems
  private inputController: InputController | null = null
  private particleSystem: ParticleSystem | null = null
  private audioEngine: AudioEngine | null = null

  // Meshes
  private meshes: SceneMeshes = {
    snakeSegments: [],
    foodMesh: null,
    arenaPlane: null,
    gridLines: null,
    skybox: null,
  }

  // Materials
  private materials: SceneMaterials = {
    snakeHead: null,
    snakeBody: null,
    food: null,
    arena: null,
    gridMaterial: null,
  }

  // Lights
  private lights: SceneLights = {
    ambient: null,
    mainLight: null,
    spotlights: [],
  }

  // State
  private renderState: RenderState = {
    isRunning: false,
    isPaused: false,
    frameTime: 0,
    fps: 0,
    lastFrameTime: Date.now(),
  }

  private isInitialized = false
  private renderLoopId: number | null = null
  private config: BabylonEngineConfig = {}

  // Constants
  private readonly GRID_SIZE = 20
  private readonly SEGMENT_SIZE = 0.4
  private readonly GRID_SPACING = 1.0

  // Camera rotation
  private cameraAngle = 0
  private cameraDistance = 15
  private cameraHeight = 12

  constructor(canvas: HTMLCanvasElement, config?: BabylonEngineConfig) {
    this.canvas = canvas
    this.config = {
      antialias: true,
      adaptToDeviceRatio: true,
      ...config,
    }
  }

  /**
   * Inicializar el motor
   */
  async initialize(): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas no inicializado')
    }

    try {
      console.log('[BabylonEngine] 1. Creando engine...')
      this.engine = new BABYLON.Engine(this.canvas, this.config.antialias, this.config)

      console.log('[BabylonEngine] 2. Creando escena...')
      this.scene = new BABYLON.Scene(this.engine)
      this.scene.clearColor = new BABYLON.Color3(0.05, 0.05, 0.15)
      this.scene.collisionsEnabled = false

      console.log('[BabylonEngine] 3. Creando cámara...')
      this.createCamera()

      console.log('[BabylonEngine] 4. Configurando iluminación...')
      this.setupLighting()

      console.log('[BabylonEngine] 5. Creando arena...')
      this.createArena()

      console.log('[BabylonEngine] 6. Inicializando sistemas...')
      this.inputController = new InputController()
      this.particleSystem = new ParticleSystem(this.scene)
      this.audioEngine = new AudioEngine()
      
      console.log('[BabylonEngine] 7. Inicializando audio...')
      try {
        await this.audioEngine.initialize()
      } catch (audioError) {
        console.warn('[BabylonEngine] Audio warning:', audioError)
      }

      console.log('[BabylonEngine] 8. Configurando post-processing...')
      this.setupPostProcessing()

      console.log('[BabylonEngine] 9. Configurando event listeners...')
      window.addEventListener('resize', () => this.onWindowResize())

      console.log('[BabylonEngine] 10. Iniciando render loop...')
      this.isInitialized = true
      this.renderState.isRunning = true
      this.startRenderLoop()

      console.log('[BabylonEngine] ✅ Inicializado correctamente')
    } catch (error) {
      console.error('[BabylonEngine] ❌ Error en inicialización:', error)
      throw error
    }
  }

  /**
   * Crear cámara de juego
   */
  private createCamera(): void {
    if (!this.scene || !this.canvas) return

    this.camera = new BABYLON.UniversalCamera('gameCamera', new BABYLON.Vector3(0, 12, 15))
    this.camera.attachControl(this.canvas, true)
    this.camera.setTarget(BABYLON.Vector3.Zero())

    // Controles de cámara
    this.camera.inertia = 0.7
    this.camera.angularSensibility = 1000
    this.camera.wheelPrecision = 50
    this.camera.minZ = 0.1
    this.camera.maxZ = 1000

    // Desabilitar controles por defecto
    this.camera.attachControl(this.canvas, false)
  }

  /**
   * Configurar post-processing
   */
  private setupPostProcessing(): void {
    if (!this.scene) return

    // Glow Layer será configurada cuando se creen los meshes
    console.log('[BabylonEngine] Post-processing configurado')
  }

  /**
   * Configurar sistema de iluminación
   */
  setupLighting(): void {
    if (!this.scene) return

    // Luz hemisférica (ambiental)
    this.lights.ambient = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(1, 1, 1),
      this.scene
    )
    this.lights.ambient.intensity = 0.7
    this.lights.ambient.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3)

    // Luz direccional principal (con sombras)
    this.lights.mainLight = new BABYLON.DirectionalLight(
      'mainLight',
      new BABYLON.Vector3(-5, 10, -5),
      this.scene
    )
    this.lights.mainLight.intensity = 1.0
    this.lights.mainLight.position = new BABYLON.Vector3(25, 40, 25)

    // Configurar sombras
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, this.lights.mainLight)
    shadowGenerator.useBlurExponentialShadowMap = true
    shadowGenerator.blurKernel = 16
    shadowGenerator.darkness = 0.4

    console.log('[BabylonEngine] Sistema de iluminación configurado')
  }

  /**
   * Crear arena del juego
   */
  createArena(): void {
    if (!this.scene) return

    // Plano base
    this.meshes.arenaPlane = BABYLON.MeshBuilder.CreateGround(
      'arena',
      {
        width: this.GRID_SIZE * this.GRID_SPACING,
        height: this.GRID_SIZE * this.GRID_SPACING,
        subdivisions: 20,
      },
      this.scene
    )

    // Material para arena
    this.materials.arena = new BABYLON.StandardMaterial('arenaMaterial', this.scene)
    this.materials.arena.diffuse = new BABYLON.Color3(0.15, 0.15, 0.25)
    this.materials.arena.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2)
    this.materials.arena.specularPower = 16
    this.meshes.arenaPlane.material = this.materials.arena
    this.meshes.arenaPlane.receiveShadows = true

    // Crear líneas del grid usando LinesMesh manualmente
    const lines: BABYLON.Vector3[] = []
    const halfSize = (this.GRID_SIZE * this.GRID_SPACING) / 2

    // Líneas horizontales
    for (let i = 0; i <= this.GRID_SIZE; i++) {
      const offset = (i - this.GRID_SIZE / 2) * this.GRID_SPACING
      lines.push(new BABYLON.Vector3(-halfSize, 0.01, offset))
      lines.push(new BABYLON.Vector3(halfSize, 0.01, offset))
    }

    // Líneas verticales
    for (let i = 0; i <= this.GRID_SIZE; i++) {
      const offset = (i - this.GRID_SIZE / 2) * this.GRID_SPACING
      lines.push(new BABYLON.Vector3(offset, 0.01, -halfSize))
      lines.push(new BABYLON.Vector3(offset, 0.01, halfSize))
    }

    // Crear grid usando TubeBuilder en lugar de CreateLines
    const gridGroup = new BABYLON.Mesh('gridGroup', this.scene)
    
    // Líneas horizontales como tubos
    for (let i = 0; i <= this.GRID_SIZE; i++) {
      const offset = (i - this.GRID_SIZE / 2) * this.GRID_SPACING
      const path = [
        new BABYLON.Vector3(-halfSize, 0.01, offset),
        new BABYLON.Vector3(halfSize, 0.01, offset)
      ]
      const tube = BABYLON.MeshBuilder.CreateTube(`gridH_${i}`, { path, radius: 0.02 }, this.scene)
      tube.parent = gridGroup
    }

    // Líneas verticales como tubos
    for (let i = 0; i <= this.GRID_SIZE; i++) {
      const offset = (i - this.GRID_SIZE / 2) * this.GRID_SPACING
      const path = [
        new BABYLON.Vector3(offset, 0.01, -halfSize),
        new BABYLON.Vector3(offset, 0.01, halfSize)
      ]
      const tube = BABYLON.MeshBuilder.CreateTube(`gridV_${i}`, { path, radius: 0.02 }, this.scene)
      tube.parent = gridGroup
    }

    this.materials.gridMaterial = new BABYLON.StandardMaterial('gridMaterial', this.scene)
    this.materials.gridMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.7)
    this.materials.gridMaterial.backFaceCulling = false
    gridGroup.material = this.materials.gridMaterial
    this.meshes.gridLines = gridGroup
  }

  /**
   * Crear mesh de la serpiente
   */
  createSnakeMesh(segments: Array<{ x: number; y: number; z: number }>): void {
    if (!this.scene) return

    this.disposeSnakeMesh()

    // Material para cabeza
    this.materials.snakeHead = new BABYLON.StandardMaterial('snakeHeadMaterial', this.scene)
    this.materials.snakeHead.diffuse = new BABYLON.Color3(0, 1, 0)
    this.materials.snakeHead.specularColor = new BABYLON.Color3(1, 1, 1)
    this.materials.snakeHead.specularPower = 64
    this.materials.snakeHead.emissiveColor = new BABYLON.Color3(0, 0.5, 0)

    // Material para cuerpo
    this.materials.snakeBody = new BABYLON.StandardMaterial('snakeBodyMaterial', this.scene)
    this.materials.snakeBody.diffuse = new BABYLON.Color3(0, 0.7, 0)
    this.materials.snakeBody.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5)
    this.materials.snakeBody.specularPower = 32
    this.materials.snakeBody.emissiveColor = new BABYLON.Color3(0, 0.2, 0)

    // Crear segmentos
    segments.forEach((segment, index) => {
      const segmentMesh = BABYLON.MeshBuilder.CreateBox(
        `snakeSegment_${index}`,
        { size: this.SEGMENT_SIZE },
        this.scene!
      )

      const worldPos = this.gridToWorld(segment)
      segmentMesh.position = worldPos

      // Cabeza tiene material diferente
      if (index === 0) {
        segmentMesh.material = this.materials.snakeHead
      } else {
        segmentMesh.material = this.materials.snakeBody
      }

      segmentMesh.receiveShadows = true
      segmentMesh.castShadows = true

      this.meshes.snakeSegments.push(segmentMesh)
    })

    console.log(`[BabylonEngine] Snake mesh creado con ${segments.length} segmentos`)
  }

  /**
   * Actualizar mesh de la serpiente
   */
  updateSnakeMesh(segments: Array<{ x: number; y: number; z: number }>): void {
    // Si hay más segmentos nuevos, crear nuevos meshes
    if (segments.length > this.meshes.snakeSegments.length) {
      this.createSnakeMesh(segments)
      return
    }

    // Actualizar posiciones de segmentos existentes
    segments.forEach((segment, index) => {
      if (index < this.meshes.snakeSegments.length) {
        const worldPos = this.gridToWorld(segment)
        this.meshes.snakeSegments[index].position = worldPos
      }
    })

    // Remover segmentos si hay menos
    if (segments.length < this.meshes.snakeSegments.length) {
      const extraSegments = this.meshes.snakeSegments.splice(segments.length)
      extraSegments.forEach((mesh) => mesh.dispose())
    }
  }

  /**
   * Crear mesh de comida
   */
  createFoodMesh(position: { x: number; y: number; z: number }): void {
    if (!this.scene) return

    this.disposeFoodMesh()

    this.meshes.foodMesh = BABYLON.MeshBuilder.CreateSphere(
      'food',
      { segments: 32, diameter: 0.3 },
      this.scene
    )

    const worldPos = this.gridToWorld(position)
    this.meshes.foodMesh.position = worldPos

    // Material para comida
    this.materials.food = new BABYLON.StandardMaterial('foodMaterial', this.scene)
    this.materials.food.diffuse = new BABYLON.Color3(1, 0.4, 0)
    this.materials.food.specularColor = new BABYLON.Color3(1, 1, 1)
    this.materials.food.specularPower = 64
    this.materials.food.emissiveColor = new BABYLON.Color3(1, 0.2, 0)

    this.meshes.foodMesh.material = this.materials.food
    this.meshes.foodMesh.receiveShadows = true
    this.meshes.foodMesh.castShadows = true

    // Agregar efecto de glow al crear la comida
    const glowLayer = new BABYLON.GlowLayer('glow', this.scene)
    glowLayer.addIncludedOnlyMesh(this.meshes.foodMesh)
    glowLayer.intensity = 1.5

    console.log('[BabylonEngine] Food mesh creado')
  }

  /**
   * Actualizar posición de comida
   */
  updateFoodMesh(position: { x: number; y: number; z: number }): void {
    if (!this.meshes.foodMesh) {
      this.createFoodMesh(position)
      return
    }

    const worldPos = this.gridToWorld(position)
    this.meshes.foodMesh.position = worldPos
  }

  /**
   * Efecto de comida comida
   */
  async playFoodEatenEffect(position: { x: number; y: number; z: number }): Promise<void> {
    if (!this.meshes.foodMesh) return

    // Reproducir sonido
    await this.audioEngine?.playFoodEatenSound()

    // Crear partículas
    const worldPos = this.gridToWorld(position)
    this.particleSystem?.createFoodEatenParticles(worldPos)

    return new Promise((resolve) => {
      // Efecto de escala
      const startScale = this.meshes.foodMesh!.scaling.clone()
      let startTime = Date.now()

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const duration = 200
        const progress = Math.min(elapsed / duration, 1)

        const scale = startScale.scale(1 - progress)
        this.meshes.foodMesh!.scaling = scale

        if (progress >= 1) {
          clearInterval(interval)
          resolve()
        }
      }, 16)
    })
  }

  /**
   * Convertir posición de grid a posición mundial
   */
  private gridToWorld(gridPos: { x: number; y: number; z: number }): BABYLON.Vector3 {
    const centerOffset = (this.GRID_SIZE / 2) * this.GRID_SPACING

    return new BABYLON.Vector3(
      gridPos.x * this.GRID_SPACING - centerOffset + this.GRID_SPACING / 2,
      this.SEGMENT_SIZE + 0.1,
      gridPos.y * this.GRID_SPACING - centerOffset + this.GRID_SPACING / 2
    )
  }

  /**
   * Loop de renderizado
   */
  private startRenderLoop(): void {
    if (!this.engine || !this.scene) return

    this.engine.runRenderLoop(() => {
      if (!this.renderState.isPaused) {
        this.render()
      }
    })
  }

  /**
   * Renderizar un frame
   */
  render(): void {
    if (!this.scene || !this.engine) return

    // Animar comida (rotación y movimiento)
    if (this.meshes.foodMesh) {
      this.meshes.foodMesh.rotation.y += 0.03
      this.meshes.foodMesh.rotation.z += 0.02
      this.meshes.foodMesh.position.y += Math.sin(Date.now() * 0.003) * 0.0015
    }

    // Actualizar cámara orbital
    if (this.camera) {
      const target = BABYLON.Vector3.Zero()
      const camX = Math.cos(this.cameraAngle) * this.cameraDistance
      const camZ = Math.sin(this.cameraAngle) * this.cameraDistance
      this.camera.position = new BABYLON.Vector3(camX, this.cameraHeight, camZ)
      this.camera.setTarget(target)
    }

    // Renderizar escena
    this.scene.render()

    // Calcular FPS
    const now = Date.now()
    this.renderState.frameTime = now - this.renderState.lastFrameTime
    this.renderState.fps = Math.round(1000 / this.renderState.frameTime)
    this.renderState.lastFrameTime = now
  }

  /**
   * Pausar renderizado
   */
  pauseRendering(): void {
    this.renderState.isPaused = true
  }

  /**
   * Reanudar renderizado
   */
  resumeRendering(): void {
    this.renderState.isPaused = false
  }

  /**
   * Manejar resize de ventana
   */
  private onWindowResize(): void {
    if (this.engine) {
      this.engine.resize()
    }
  }

  /**
   * Actualizar meshes después de cambios
   */
  updateGridVisuals(): void {
    // Se puede usar para efectos visuales especiales en el grid
  }

  /**
   * Establecer objetivo de cámara
   */
  setCameraTarget(target: BABYLON.Vector3): void {
    if (this.camera) {
      this.camera.setTarget(target)
    }
  }

  /**
   * Hacer zoom de cámara
   */
  setCameraZoom(factor: number): void {
    this.cameraDistance *= factor
    this.cameraDistance = Math.max(5, Math.min(50, this.cameraDistance))
  }

  /**
   * Rotar cámara alrededor del objetivo
   */
  rotateCameraAround(angle: number): void {
    this.cameraAngle += angle
  }

  /**
   * Actualizar spotlights dinámicos
   */
  updateSpotlights(
    snakeHead?: BABYLON.Vector3,
    foodPos?: BABYLON.Vector3
  ): void {
    // Implementación de spotlights dinámicos (futuro)
  }

  /**
   * Efectos de colisión
   */
  async playCollisionEffect(position: BABYLON.Vector3): Promise<void> {
    console.log('[BabylonEngine] Efecto de colisión en:', position)
    this.particleSystem?.createCollisionParticles(position)
    await this.audioEngine?.playCollisionSound()
  }

  /**
   * Efectos de puntuación
   */
  async playScoreEffect(): Promise<void> {
    console.log('[BabylonEngine] Efecto de puntuación')
    await this.audioEngine?.playScoreSound()
  }

  /**
   * Efectos de game over
   */
  async playGameOverEffect(): Promise<void> {
    console.log('[BabylonEngine] Efecto de game over')
    if (this.meshes.snakeSegments.length > 0) {
      const snakeHead = this.meshes.snakeSegments[0].position
      this.particleSystem?.createGameOverParticles(snakeHead)
    }
    await this.audioEngine?.playGameOverSound()
  }

  /**
   * Limpiar recursos
   */
  dispose(): void {
    // Disponer meshes
    this.meshes.snakeSegments.forEach((mesh) => mesh.dispose())
    this.meshes.foodMesh?.dispose()
    this.meshes.arenaPlane?.dispose()
    this.meshes.gridLines?.dispose()

    // Disponer materiales
    Object.values(this.materials).forEach((material) => {
      if (material) material.dispose()
    })

    // Disponer luces
    Object.values(this.lights).forEach((light) => {
      if (light) light.dispose()
    })

    // Disponer sistemas
    this.inputController?.dispose()
    this.particleSystem?.dispose()
    this.audioEngine?.dispose()

    // Detener render loop
    if (this.engine) {
      this.engine.stopRenderLoop()
    }

    // Disponer scene y engine
    this.scene?.dispose()
    this.engine?.dispose()

    console.log('[BabylonEngine] Recursos liberados')
  }

  // Getters

  getScene(): BABYLON.Scene {
    if (!this.scene) throw new Error('Scene no inicializada')
    return this.scene
  }

  getEngine(): BABYLON.Engine {
    if (!this.engine) throw new Error('Engine no inicializado')
    return this.engine
  }

  getCamera(): BABYLON.Camera {
    if (!this.camera) throw new Error('Camera no inicializada')
    return this.camera
  }

  getInputController(): InputController | null {
    return this.inputController
  }

  getAudioEngine(): AudioEngine | null {
    return this.audioEngine
  }

  getRenderState(): RenderState {
    return { ...this.renderState }
  }

  disposeFoodMesh(): void {
    if (this.meshes.foodMesh) {
      this.meshes.foodMesh.dispose()
      this.meshes.foodMesh = null
    }
  }

  disposeSnakeMesh(): void {
    this.meshes.snakeSegments.forEach((mesh) => mesh.dispose())
    this.meshes.snakeSegments = []
  }
}
