/**
 * Constantes del juego Snake 3D
 */

// Grid
export const GRID_SIZE = 20
export const SEGMENT_SIZE = 0.4
export const GRID_SPACING = 1.0

// Colores
export const COLORS = {
  SNAKE_HEAD: { r: 0, g: 1, b: 0 },
  SNAKE_BODY: { r: 0, g: 0.7, b: 0 },
  FOOD: { r: 1, g: 0.3, b: 0 },
  BACKGROUND: { r: 0.1, g: 0.1, b: 0.2 },
  GRID: { r: 0.3, g: 0.5, b: 0.8 },
}

// Velocidades
export const SPEEDS = {
  EASY: 150,
  NORMAL: 100,
  HARD: 75,
  EXTREME: 50,
}

// Cámara
export const CAMERA_CONFIG = {
  DISTANCE: 15,
  HEIGHT: 12,
  FOV: 60,
  MIN_DISTANCE: 5,
  MAX_DISTANCE: 50,
  ROTATION_SPEED: 0.01,
  ZOOM_SPEED: 1.1,
}

// Iluminación
export const LIGHTING_CONFIG = {
  AMBIENT_INTENSITY: 0.6,
  MAIN_LIGHT_INTENSITY: 0.8,
  SHADOW_MAP_SIZE: 2048,
}

// Efectos
export const EFFECT_CONFIG = {
  FOOD_EATEN_DURATION: 300,
  SCORE_PULSE_DURATION: 500,
  COLLISION_SHAKE_DURATION: 200,
}

// Audio
export const AUDIO_CONFIG = {
  MASTER_VOLUME: 0.5,
  EFFECTS_VOLUME: 0.7,
  MUSIC_VOLUME: 0.4,
}
