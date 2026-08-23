/**
 * 经济系统 —— 原样迁移自 霓虹防线/index.html 中的 `upgradePrice` / `refundValue` 等函数。
 */

import { TOWER_TYPE_BY_ID, type TowerId } from '../data/towers'
import { GROWTH_COSTS } from '../data/balance'

/** 塔楼升级到下一级所需金币,原 `upgradePrice` */
export function towerUpgradeCost(typeId: TowerId, currentLevel: number): number {
  const base = TOWER_TYPE_BY_ID[typeId].cost
  return Math.round(base * (currentLevel === 1 ? 0.7 : 1.05))
}

/** 拆除塔楼返还的金币,原 `refundValue` */
export function towerRefundValue(typeId: TowerId, spent: number): number {
  const base = TOWER_TYPE_BY_ID[typeId].cost
  const bySpent = Math.floor(spent * 0.6)
  const cap = Math.floor(base * 0.8)
  return Math.max(0, Math.min(bySpent, cap))
}

/** 研发强化下一级所需研发点,原 `growthCosts` 数组按当前等级索引 */
export function growthUpgradeCost(currentLevel: number): number {
  return GROWTH_COSTS[currentLevel] ?? 0
}
