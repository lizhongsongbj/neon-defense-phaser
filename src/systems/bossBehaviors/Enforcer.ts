/**
 * 亚当·重锤 部件系统 —— 原样迁移自 霓虹防线/gameplay.js `_0x4f0989` 中
 * `typeId === "enforcer"` 分支。三个部件(盾牌/导弹舱/推进器)各自独立受损,
 * 分别影响护甲、攻击力和移动速度。
 */

import { BOSS_TYPES } from '../../data/bosses'
import { mapSpeedBonus } from '../../data/balance'
import type { EnemyState } from '../types'

export type EnforcerVoiceEvent = 'enraged' | 'core'

/** 每帧按当前部件血量刷新亚当·重锤的战斗数值,返回本帧触发的语音事件(如果有) */
export function tickEnforcer(enemy: EnemyState, mapIndex: number): EnforcerVoiceEvent | null {
  const def = BOSS_TYPES.enforcer
  const shield = enemy.components.find((c) => c.name === '盾牌')
  const missiles = enemy.components.find((c) => c.name === '导弹舱')
  const thruster = enemy.components.find((c) => c.name === '推进器')

  enemy.armor = shield && shield.hp > 0 ? 0.25 : 0.08
  enemy.attack = missiles && missiles.hp > 0 ? def.attack : def.attack * 0.6
  enemy.speed = def.speed * mapSpeedBonus(mapIndex) * (thruster && thruster.hp > 0 ? 1 : 0.7)

  if (!enemy.enragedVoicePlayed && enemy.hp / enemy.maxHp <= 0.5) {
    enemy.enragedVoicePlayed = true
    return 'enraged'
  }
  if (!enemy.coreVoicePlayed && enemy.components.every((c) => c.hp <= 0)) {
    enemy.coreVoicePlayed = true
    return 'core'
  }
  return null
}
