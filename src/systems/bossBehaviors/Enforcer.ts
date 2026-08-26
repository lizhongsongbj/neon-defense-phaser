/** Adam Smasher: component-driven phase changes and periodic suppression abilities. */

import { BOSS_TYPES, bossStageDefinition, type BossAbilityId } from '../../data/bosses'
import { mapSpeedBonus } from '../../data/balance'
import type { EnemyState } from '../types'

export type EnforcerVoiceEvent = 'enraged' | 'core'

export interface EnforcerTickResult {
  voiceEvent: EnforcerVoiceEvent | null
  stageChanged: boolean
  stageName: string
  ability: BossAbilityId | null
}

function resolveStage(enemy: EnemyState): 1 | 2 | 3 | 4 {
  const hpRatio = enemy.hp / Math.max(1, enemy.maxHp)
  const destroyed = enemy.components.filter((component) => component.hp <= 0).length
  const shieldDestroyed = enemy.components.find((component) => component.name === '盾牌')?.hp === 0
  if (destroyed >= 3 || hpRatio <= 0.18) return 4
  if (destroyed >= 2 || hpRatio <= 0.42) return 3
  if (shieldDestroyed || hpRatio <= 0.72) return 2
  return 1
}

export function tickEnforcer(enemy: EnemyState, mapIndex: number, now: number): EnforcerTickResult {
  const previousStage = enemy.stage
  enemy.stage = resolveStage(enemy)
  const stage = bossStageDefinition('enforcer', enemy.stage)
  const missilesAlive = (enemy.components.find((component) => component.name === '导弹舱')?.hp ?? 0) > 0
  const thrusterAlive = (enemy.components.find((component) => component.name === '推进器')?.hp ?? 0) > 0

  enemy.armor = stage.armor
  enemy.energyResistance = stage.energyResistance
  enemy.railVulnerability = stage.railVulnerability
  enemy.attack = stage.attack * (missilesAlive ? 1 : 0.62)
  enemy.speed = stage.speed * mapSpeedBonus(mapIndex) * (thrusterAlive ? 1 : 0.68)

  const stageChanged = enemy.stage !== previousStage
  let voiceEvent: EnforcerVoiceEvent | null = null
  if (stageChanged) {
    enemy.bossStageEnteredAt = now
    enemy.stunnedUntil = Math.max(enemy.stunnedUntil, now + 650)
    enemy.nextBossAbilityAt = now + 1400
    if (enemy.stage === 3 && !enemy.enragedVoicePlayed) {
      enemy.enragedVoicePlayed = true
      voiceEvent = 'enraged'
    }
    if (enemy.stage === 4 && !enemy.coreVoicePlayed) {
      enemy.coreVoicePlayed = true
      voiceEvent = 'core'
    }
  }

  let ability: BossAbilityId | null = null
  if (now >= enemy.nextBossAbilityAt) {
    ability = !missilesAlive && (stage.ability === 'missile-salvo' || stage.ability === 'overdrive-salvo') ? null : stage.ability
    enemy.nextBossAbilityAt = now + stage.abilityCooldown * 1000
  }

  return { voiceEvent, stageChanged, stageName: stage.name, ability }
}
