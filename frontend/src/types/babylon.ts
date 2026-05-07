import * as BABYLON from '@babylonjs/core'

/**
 * Configuración del motor Babylon.js
 */
export interface BabylonEngineConfig {
  antialias?: boolean
  adaptToDeviceRatio?: boolean
  enableOfflineSupport?: boolean
  disableWebGL2Support?: boolean
  stencil?: boolean
  depth?: boolean
  renderingContext?: WebGLRenderingContext | WebGL2RenderingContext
}

/**
 * Referencias a meshes de la escena
 */
export interface SceneMeshes {
  snakeSegments: BABYLON.Mesh[]
  foodMesh: BABYLON.Mesh | null
  arenaPlane: BABYLON.Mesh | null
  gridLines: BABYLON.Mesh | null
  skybox: BABYLON.Mesh | null
}

/**
 * Referencias a materiales de la escena
 */
export interface SceneMaterials {
  snakeHead: BABYLON.StandardMaterial | null
  snakeBody: BABYLON.StandardMaterial | null
  food: BABYLON.StandardMaterial | null
  arena: BABYLON.StandardMaterial | null
  gridMaterial: BABYLON.StandardMaterial | null
}

/**
 * Referencias a luces de la escena
 */
export interface SceneLights {
  ambient: BABYLON.HemisphericLight | null
  mainLight: BABYLON.DirectionalLight | null
  spotlights: BABYLON.PointLight[]
}

/**
 * Opciones de cámara
 */
export interface CameraOptions {
  distance?: number
  height?: number
  fov?: number
  minDistance?: number
  maxDistance?: number
  rotationSpeed?: number
  zoomSpeed?: number
}

/**
 * Estado de renderizado de la escena
 */
export interface RenderState {
  isRunning: boolean
  isPaused: boolean
  frameTime: number
  fps: number
  lastFrameTime: number
}

/**
 * Configuración de partículas
 */
export interface ParticleConfig {
  emitRate: number
  lifetime: number
  size: number
  speed: number
  gravity: BABYLON.Vector3
  color: BABYLON.Color3
}

/**
 * Interfaz principal del BabylonEngine
 */
export interface IBabylonEngine {
  // Inicialización
  initialize(): Promise<void>
  dispose(): void

  // Scene Management
  getScene(): BABYLON.Scene
  getEngine(): BABYLON.Engine
  getCamera(): BABYLON.Camera

  // Snake Rendering
  createSnakeMesh(segments: Array<{ x: number; y: number; z: number }>): void
  updateSnakeMesh(segments: Array<{ x: number; y: number; z: number }>): void
  disposeSnakeMesh(): void

  // Food Rendering
  createFoodMesh(position: { x: number; y: number; z: number }): void
  updateFoodMesh(position: { x: number; y: number; z: number }): void
  playFoodEatenEffect(position: { x: number; y: number; z: number }): Promise<void>
  disposeFoodMesh(): void

  // Arena
  createArena(): void
  updateGridVisuals(): void

  // Lighting
  setupLighting(): void
  updateSpotlights(snakeHead?: BABYLON.Vector3, foodPos?: BABYLON.Vector3): void

  // Camera
  setCameraTarget(target: BABYLON.Vector3): void
  setCameraZoom(factor: number): void
  rotateCameraAround(angle: number): void

  // Rendering
  render(): void
  pauseRendering(): void
  resumeRendering(): void

  // State
  getRenderState(): RenderState
  isInitialized(): boolean

  // Particles & Effects
  playCollisionEffect(position: BABYLON.Vector3): void
  playScoreEffect(): void
  playGameOverEffect(): void
}

/**
 * Posición en el grid del juego
 */
export interface GridPosition {
  x: number
  y: number
  z: number
}

/**
 * Configuración de shader personalizado
 */
export interface ShaderConfig {
  name: string
  vertexShader: string
  fragmentShader: string
  uniforms: string[]
  samplers: string[]
}
