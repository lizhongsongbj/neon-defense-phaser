/** EVE-9: three explicit forms with HP thresholds, transition shields, and active abilities. */

import { bossStageDefinition, type BossAbilityId } from '../../data/bosses'
import { mapSpeedBonus } from '../../data/balance'
import type { EnemyState } from '../types'

export type EveVoiceEvent = 'node' | 'transfer' | 'final'

export interface EveTickResult {
  voiceEvent: EveVoiceEvent | null
  stageChanged: boolean
  stageName: string
  ability: BossAbilityId | null
  baseDamage: number
}

function resolveStage(enemy: EnemyState): 1 | 2 | 3 {
  const ratio = enemy.hp / Math.max(1, enemy.maxHp)
  if (ratio <= 0.35) return 3
  if (ratio <= 0.7) return 2
  return 1
}

export function tickEve(enemy: EnemyState, mapIndex: number, now: number): EveTickResult {
  const previousStage = enemy.stage
  enemy.stage = resolveStage(enemy)
  const stage = bossStageDefinition('eve', enemy.stage)
  const stageChanged = enemy.stage !== previousStage
  let voiceEvent: EveVoiceEvent | null = null

  if (stageChanged) {
    enemy.bossStageEnteredAt = now
    enemy.nextBossAbilityAt = now + 1500
    if (stage.transitionShieldRatio) {
      const transitionShield = enemy.maxHp * stage.transitionShieldRatio
      enemy.shield = Math.max(enemy.shield, transitionShield)
      enemy.maxShield = Math.max(enemy.maxShield, transitionShield)
    }
    voiceEvent = enemy.stage === 2 ? 'transfer' : 'final'
  }

  enemy.armor = stage.armor
  enemy.energyResistance = stage.energyResistance
  enemy.railVulnerability = stage.railVulnerability
  enemy.attack = stage.attack
  enemy.speed = stage.speed * mapSpeedBonus(mapIndex)
  if (enemy.stage === 3) enemy.distance = Math.max(enemy.distance, 760)

  let ability: BossAbilityId | null = null
  let baseDamage = 0
  if (now >= enemy.nextBossAbilityAt) {
    ability = stage.ability
    enemy.nextBossAbilityAt = now + stage.abilityCooldown * 1000
    if (ability === 'node-lock') {
      enemy.distance = Math.min(680, enemy.distance + 45)
      enemy.lastTeleport = now
      voiceEvent = 'node'
    } else if (ability === 'core-pulse') {
      baseDamage = 1
    }
  }

  return { voiceEvent, stageChanged, stageName: stage.name, ability, baseDamage }
}
