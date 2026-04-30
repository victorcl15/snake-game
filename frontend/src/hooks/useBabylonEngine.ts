import { useEffect, useRef, useState, useCallback } from 'react'
import { BabylonEngine } from '../systems/BabylonEngine'
import { useGameStore } from '../stores/gameStore'

/**
 * Hook React para manejar el BabylonEngine
 * Encapsula la inicialización, ciclo de vida y suscripción a cambios del store
 */
export function useBabylonEngine(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const engineRef = useRef<BabylonEngine | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obtener suscriptores del store
  const { snake, food } = useGameStore()

  /**
   * Inicializar el engine
   */
  useEffect(() => {
    if (!canvasRef.current || engineRef.current) return

    const initEngine = async () => {
      try {
        const engine = new BabylonEngine(canvasRef.current!)
        await engine.initialize()

        // Crear malla inicial de snake
        if (snake && snake.length > 0) {
          engine.createSnakeMesh(snake)
        }

        // Crear comida inicial
        if (food) {
          engine.createFoodMesh(food)
        }

        engineRef.current = engine
        setIsReady(true)
        console.log('[useBabylonEngine] Engine inicializado correctamente')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMessage)
        console.error('[useBabylonEngine] Error:', errorMessage)
      }
    }

    initEngine()

    // Cleanup
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose()
        engineRef.current = null
      }
    }
  }, []) // Solo ejecutar una vez

  /**
   * Actualizar snake cuando cambia en el store
   */
  useEffect(() => {
    if (!engineRef.current || !snake) return

    engineRef.current.updateSnakeMesh(snake)
  }, [snake])

  /**
   * Actualizar comida cuando cambia en el store
   */
  useEffect(() => {
    if (!engineRef.current || !food) return

    engineRef.current.updateFoodMesh(food)
  }, [food])

  /**
   * Obtener el engine
   */
  const getEngine = useCallback((): BabylonEngine | null => {
    return engineRef.current
  }, [])

  return {
    engine: engineRef.current,
    isReady,
    error,
    getEngine,
  }
}
