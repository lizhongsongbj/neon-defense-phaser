/**
 * 夏娃-9 三阶段机制 —— 原样迁移自 霓虹防线/gameplay.js `_0x4f0989` 中
 * `typeId === "eve"` 分支。阶段完全由当前血量比例驱动:
 * >2/3 节点转移阶段、>1/3 载体阶段(速度12)、其余为固定核心阶段。
 */

import { mapSpeedBonus } from '../../data/balance'
import type { EnemyState } from '../types'

export type EveVoiceEvent = 'node' | 'transfer' | 'final'

/** 每帧按当前血量比例刷新夏娃-9 的阶段与移动数值,返回本帧触发的语音事件(如果有) */
export function tickEve(enemy: EnemyState, mapIndex: number, now: number): EveVoiceEvent | null {
  const previousStage = enemy.stage
  const ratio = enemy.hp / enemy.maxHp
  enemy.stage = ratio > 2 / 3 ? 1 : ratio > 1 / 3 ? 2 : 3

  let event: EveVoiceEvent | null = null

  if (enemy.stage === 1 && now - enemy.lastTeleport >= 4000) {
    enemy.distance = Math.min(1000, enemy.distance + 55)
    enemy.lastTeleport = now
    event = 'node'
  }

  if (enemy.stage !== previousStage) {
    event = enemy.stage === 2 ? 'transfer' : 'final'
  }

  enemy.speed = enemy.stage === 1 ? 0 : enemy.stage === 2 ? mapSpeedBonus(mapIndex) * 12 : 0
  if (enemy.stage === 3) {
    enemy.distance = Math.max(enemy.distance, 720)
  }

  return event
}
