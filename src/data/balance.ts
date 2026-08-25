/**
 * 战役数值平衡表 —— 原样迁移自 霓虹防线/gameplay.js 顶部的若干常量。
 */

/** 地图校准系数,原变量名 `_0x4c1e93`,补偿路线长度与塔位覆盖差异 */
export const MAP_COEFFICIENTS = [1.3, 1.1, 1.2, 1.28, 1.36, 1.44, 1.52, 1.62]

/** 第4-6关每波额外敌人数,原变量名 `_0x1bcd4e` */
export const LATE_MAP_BONUSES = [0, 0, 1, 1, 2, 2, 3, 3]

/** 击杀奖励随地图衰减系数,原变量名 `_0x1e8c62` */
export const REWARD_SCALES = [1, 1, 0.95, 0.9, 0.82, 0.74, 0.66, 0.58]

/** 难度基础系数：三档差异明确，但保持中后期仍可通过升级和合理布阵完成。 */
export const DIFFICULTY_COEFFICIENTS: Record<'easy' | 'normal' | 'hard', number> = {
  easy: 0.78,
  normal: 1,
  hard: 1.2,
}

/** 难度 × 地图压力系数；八张地图都有独立参数，避免后期回退到默认值。 */
export const DIFFICULTY_MAP_PRESSURE: Record<'easy' | 'normal' | 'hard', number[]> = {
  easy: [0.9, 0.91, 0.92, 0.94, 0.96, 0.98, 1, 1.02],
  normal: [1, 1, 1.01, 1.02, 1.03, 1.04, 1.05, 1.06],
  hard: [1.08, 1.08, 1.1, 1.1, 1.12, 1.14, 1.16, 1.18],
}

/** 2.5D 视角下 y 轴距离压缩系数,原变量名 `_0x1ce4d5` / `RANGE_PROJECTION_Y` */
export const RANGE_PROJECTION_Y = (1672 / 941) * 0.62

/** 塔楼强化(研发点)等级 1/2/3 所需研发点,原变量名 `growthCosts` */
export const GROWTH_COSTS = [1, 2, 3]

/** 战役初始金币(非战役地图默认值),原变量名 `initialCoins` */
export const INITIAL_COINS = 700

/** 初始基地血量,原变量名 `maxHealth` */
export const MAX_HEALTH = 10

/** 初始研发点,原 index.html `researchPoints` 初值 */
export const INITIAL_RESEARCH_POINTS = 5

/** localStorage 存档 key,原变量名 `saveKey` */
export const SAVE_KEY = 'neon-defense-save-v2'
export const SAVE_VERSION = 2

export type Difficulty = 'easy' | 'normal' | 'hard'

/**
 * 计算某地图/波次/难度下的敌人数值系数。
 * 原 gameplay.js `_0x5b1dce` 中的立即执行函数:
 * mapCoefficients[mapIndex] * (1 + (wave-1)*0.05) * difficultyCoefficients[difficulty] * difficultyMapPressure[difficulty][mapIndex]
 */
export function enemyStatMultiplier(mapIndex: number, wave: number, difficulty: Difficulty): number {
  const pressure = DIFFICULTY_MAP_PRESSURE[difficulty]?.[mapIndex] ?? 1
  return (
    MAP_COEFFICIENTS[mapIndex] *
    (1 + (wave - 1) * 0.05) *
    DIFFICULTY_COEFFICIENTS[difficulty] *
    pressure
  )
}

/** 敌人移速随地图微幅提升,原 gameplay.js `_0x4346c0` */
/** 难度对敌人移动速度的影响，困难档更考验提前布防，简单档留出反应时间。 */
export function difficultySpeedMultiplier(difficulty: Difficulty): number {
  return { easy: 0.94, normal: 1, hard: 1.06 }[difficulty]
}

/** 难度对敌人突破基地时的伤害影响。 */
export function difficultyAttackMultiplier(difficulty: Difficulty): number {
  return { easy: 0.88, normal: 1, hard: 1.12 }[difficulty]
}

export function mapSpeedBonus(mapIndex: number): number {
  return 1 + Math.min(0.1, mapIndex * 0.02)
}

/** 击杀奖励按地图衰减后取整,原 gameplay.js `_0x202257` */
export function scaleReward(rawReward: number, mapIndex: number): number {
  const reward = Math.max(0, Number(rawReward) || 0)
  if (!reward) return 0
  return Math.max(1, Math.round(reward * (REWARD_SCALES[mapIndex] ?? 1)))
}

/** 塔楼研发强化加成,原 index.html `window.towerGrowthBonuses` */
export function towerGrowthBonuses(level: number): { level: number; damage: number; range: number } {
  return {
    level,
    damage: 1 + level * 0.06,
    range: 1 + level * 0.03,
  }
}
