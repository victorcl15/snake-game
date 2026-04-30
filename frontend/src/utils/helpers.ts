import * as BABYLON from '@babylonjs/core'
import { GRID_SIZE, GRID_SPACING, SEGMENT_SIZE } from './constants'

/**
 * Convertir posición de grid a posición mundial en 3D
 */
export function gridToWorld(gridPos: { x: number; y: number; z: number }): BABYLON.Vector3 {
  const centerOffset = (GRID_SIZE / 2) * GRID_SPACING

  return new BABYLON.Vector3(
    gridPos.x * GRID_SPACING - centerOffset + GRID_SPACING / 2,
    SEGMENT_SIZE + 0.1,
    gridPos.y * GRID_SPACING - centerOffset + GRID_SPACING / 2
  )
}

/**
 * Convertir posición mundial a posición de grid
 */
export function worldToGrid(worldPos: BABYLON.Vector3): { x: number; y: number; z: number } {
  const centerOffset = (GRID_SIZE / 2) * GRID_SPACING

  return {
    x: Math.round((worldPos.x + centerOffset - GRID_SPACING / 2) / GRID_SPACING),
    y: Math.round((worldPos.z + centerOffset - GRID_SPACING / 2) / GRID_SPACING),
    z: Math.round(worldPos.y / (SEGMENT_SIZE + 0.1)),
  }
}

/**
 * Interpolar entre dos números
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Interpolar entre dos vectores
 */
export function lerpVector(start: BABYLON.Vector3, end: BABYLON.Vector3, t: number): BABYLON.Vector3 {
  return new BABYLON.Vector3(
    lerp(start.x, end.x, t),
    lerp(start.y, end.y, t),
    lerp(start.z, end.z, t)
  )
}

/**
 * Clamp un número entre min y max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Smoothstep (interpolación suave)
 */
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * Crear un vector de color normalizado
 */
export function colorFromRGB(r: number, g: number, b: number): BABYLON.Color3 {
  return new BABYLON.Color3(
    clamp(r, 0, 1),
    clamp(g, 0, 1),
    clamp(b, 0, 1)
  )
}

/**
 * Convertir HSV a RGB
 */
export function hsvToRgb(h: number, s: number, v: number): BABYLON.Color3 {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let r = 0,
    g = 0,
    b = 0

  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  return new BABYLON.Color3(r + m, g + m, b + m)
}

/**
 * Generar número aleatorio
 */
export function random(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/**
 * Generar entero aleatorio
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1))
}

/**
 * Distancia euclidiana entre dos puntos
 */
export function distance(a: BABYLON.Vector3, b: BABYLON.Vector3): number {
  return BABYLON.Vector3.Distance(a, b)
}

/**
 * Mapear rango a otro rango
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const normalized = (value - inMin) / (inMax - inMin)
  return outMin + normalized * (outMax - outMin)
}

/**
 * Calcular FPS
 */
let lastTime = Date.now()
let frameCount = 0
let currentFPS = 0

export function calculateFPS(): number {
  frameCount++
  const now = Date.now()
  const elapsed = now - lastTime

  if (elapsed >= 1000) {
    currentFPS = frameCount
    frameCount = 0
    lastTime = now
  }

  return currentFPS
}
