import * as BABYLON from '@babylonjs/core'

/**
 * ParticleSystem - Gestiona efectos de partículas
 */
export class ParticleSystem {
  private scene: BABYLON.Scene
  private particleSystems: Map<string, BABYLON.ParticleSystem> = new Map()

  constructor(scene: BABYLON.Scene) {
    this.scene = scene
  }

  /**
   * Crear sistema de partículas para comida comida
   */
  createFoodEatenParticles(position: BABYLON.Vector3): void {
    const emitter = BABYLON.MeshBuilder.CreateBox('emitter', { size: 0.1 }, this.scene)
    emitter.position = position
    emitter.isVisible = false

    const particleSystem = new BABYLON.ParticleSystem('foodParticles', 200, this.scene)
    particleSystem.emitter = emitter
    particleSystem.particleTexture = new BABYLON.DynamicTexture('particleTexture', 64, this.scene)

    // Material
    particleSystem.addColorGradient(0, new BABYLON.Color4(1, 0.5, 0, 1))
    particleSystem.addColorRemapGradient(1, new BABYLON.Color4(1, 0.2, 0, 0))

    // Emisión
    particleSystem.emitRate = 100
    particleSystem.minEmitPower = 5
    particleSystem.maxEmitPower = 10
    particleSystem.minLifeTime = 0.5
    particleSystem.maxLifeTime = 1.5
    particleSystem.minSize = 0.05
    particleSystem.maxSize = 0.2
    particleSystem.minScaleX = 1
    particleSystem.maxScaleX = 2
    particleSystem.minScaleY = 1
    particleSystem.maxScaleY = 2
    particleSystem.addSizeGradient(0, 0.2)
    particleSystem.addSizeGradient(1, 0)

    // Gravedad
    particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0)
    particleSystem.targetStopDuration = 0.5

    particleSystem.start()

    // Auto cleanup
    setTimeout(() => {
      particleSystem.stop()
      particleSystem.dispose()
      emitter.dispose()
    }, 2000)
  }

  /**
   * Crear sistema de partículas para colisión
   */
  createCollisionParticles(position: BABYLON.Vector3): void {
    const emitter = BABYLON.MeshBuilder.CreateBox('collisionEmitter', { size: 0.1 }, this.scene)
    emitter.position = position
    emitter.isVisible = false

    const particleSystem = new BABYLON.ParticleSystem('collisionParticles', 300, this.scene)
    particleSystem.emitter = emitter

    // Material - Rojo para colisión
    particleSystem.addColorGradient(0, new BABYLON.Color4(1, 0, 0, 1))
    particleSystem.addColorRemapGradient(1, new BABYLON.Color4(1, 0, 0, 0))

    // Emisión explosiva
    particleSystem.emitRate = 200
    particleSystem.minEmitPower = 15
    particleSystem.maxEmitPower = 25
    particleSystem.minLifeTime = 0.3
    particleSystem.maxLifeTime = 0.8
    particleSystem.minSize = 0.1
    particleSystem.maxSize = 0.3
    particleSystem.addSizeGradient(0, 0.3)
    particleSystem.addSizeGradient(1, 0)

    particleSystem.gravity = new BABYLON.Vector3(0, -20, 0)
    particleSystem.targetStopDuration = 0.3

    particleSystem.start()

    // Auto cleanup
    setTimeout(() => {
      particleSystem.stop()
      particleSystem.dispose()
      emitter.dispose()
    }, 1500)
  }

  /**
   * Crear partículas de score
   */
  createScoreParticles(position: BABYLON.Vector3, score: number): void {
    const emitter = BABYLON.MeshBuilder.CreateBox('scoreEmitter', { size: 0.1 }, this.scene)
    emitter.position = position
    emitter.isVisible = false

    const particleSystem = new BABYLON.ParticleSystem('scoreParticles', 50, this.scene)
    particleSystem.emitter = emitter

    // Material - Amarillo para score
    particleSystem.addColorGradient(0, new BABYLON.Color4(1, 1, 0, 1))
    particleSystem.addColorRemapGradient(1, new BABYLON.Color4(1, 1, 0, 0))

    particleSystem.emitRate = 50
    particleSystem.minEmitPower = 8
    particleSystem.maxEmitPower = 12
    particleSystem.minLifeTime = 0.8
    particleSystem.maxLifeTime = 1.2
    particleSystem.minSize = 0.15
    particleSystem.maxSize = 0.25
    particleSystem.addSizeGradient(0, 0.2)
    particleSystem.addSizeGradient(1, 0)

    particleSystem.gravity = new BABYLON.Vector3(0, -5, 0)
    particleSystem.targetStopDuration = 0.8

    particleSystem.start()

    // Auto cleanup
    setTimeout(() => {
      particleSystem.stop()
      particleSystem.dispose()
      emitter.dispose()
    }, 2000)
  }

  /**
   * Crear partículas de game over
   */
  createGameOverParticles(position: BABYLON.Vector3): void {
    const emitter = BABYLON.MeshBuilder.CreateBox('gameOverEmitter', { size: 0.5 }, this.scene)
    emitter.position = position
    emitter.isVisible = false

    const particleSystem = new BABYLON.ParticleSystem('gameOverParticles', 500, this.scene)
    particleSystem.emitter = emitter

    // Material - Púrpura oscuro
    particleSystem.addColorGradient(0, new BABYLON.Color4(0.8, 0, 0.8, 1))
    particleSystem.addColorRemapGradient(1, new BABYLON.Color4(0.8, 0, 0.8, 0))

    particleSystem.emitRate = 300
    particleSystem.minEmitPower = 20
    particleSystem.maxEmitPower = 35
    particleSystem.minLifeTime = 0.5
    particleSystem.maxLifeTime = 1.5
    particleSystem.minSize = 0.2
    particleSystem.maxSize = 0.5
    particleSystem.addSizeGradient(0, 0.4)
    particleSystem.addSizeGradient(1, 0)

    particleSystem.gravity = new BABYLON.Vector3(0, -30, 0)
    particleSystem.targetStopDuration = 1.5

    particleSystem.start()

    // Auto cleanup
    setTimeout(() => {
      particleSystem.stop()
      particleSystem.dispose()
      emitter.dispose()
    }, 3000)
  }

  /**
   * Limpiar recursos
   */
  dispose(): void {
    this.particleSystems.forEach((ps) => {
      ps.stop()
      ps.dispose()
    })
    this.particleSystems.clear()
  }
}
