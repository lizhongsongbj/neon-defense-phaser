/**
 * Enemy visual sizing tuned to the painted road width.
 *
 * The source data keeps the original vw-like scale values. Rendering them at
 * full canvas width makes larger enemies spill into tower pads and adjacent
 * scenery, so enemies use a smaller lane-fit multiplier and a hard footprint
 * cap while bosses retain a deliberately larger silhouette.
 */

export const ENEMY_LANE_FIT_SCALE = 0.7
export const REGULAR_ENEMY_SIZE_RANGE = { min: 32, max: 64 } as const
export const BOSS_ENEMY_SIZE_RANGE = { min: 78, max: 96 } as const

export function enemyDisplaySize(scale: number, isBoss: boolean, gameWidth = 1280): number {
  const range = isBoss ? BOSS_ENEMY_SIZE_RANGE : REGULAR_ENEMY_SIZE_RANGE
  return Math.max(range.min, Math.min(range.max, scale * gameWidth * ENEMY_LANE_FIT_SCALE))
}
