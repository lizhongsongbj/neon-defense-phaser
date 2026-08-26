/**
 * 战斗系统 —— 原样迁移自 霓虹防线/gameplay.js 中的敌人生成 (`_0x5b1dce`)、
 * 伤害结算 (`_0x4d7302`)、索敌距离与背刺判定等纯数值逻辑。
 * 不依赖 DOM/Phaser,只操作 `EnemyState`/`TowerState` 数据对象,方便单测与在
 * BattleScene 中复用。
 */

import { ENEMY_TYPES, type EnemyId } from '../data/enemies'
import { BOSS_TYPES, ENFORCER_COMPONENT_VOICE_EVENT, bossComponentHp, type BossId } from '../data/bosses'
import { difficultyAttackMultiplier, difficultySpeedMultiplier, enemyStatMultiplier, mapSpeedBonus, type Difficulty } from '../data/balance'
import type { MapGeometry } from './PathSystem'
import { projectedDistance, routePointByIndex } from './PathSystem'
import type { EnemyState, EnemyTypeId, TowerState, WaveRosterEntry } from './types'

export interface SpawnEnemyOptions {
  id: number
  mapIndex: number
  wave: number
  difficulty: Difficulty
  now: number
  entry: WaveRosterEntry
}

function isBossId(id: EnemyTypeId): id is BossId {
  return id === 'enforcer' || id === 'eve'
}

interface NormalizedDefinition {
  hp: number
  speed: number
  armor: number
  reward: number
  attack: number
  baseDamage: number
  shield: number
  air: boolean
  mechanical: boolean
  network: boolean
  phase: boolean
  energyResistance: number
  railVulnerability: number
  droneEvasion: number
  enrageThreshold: number
  enrageSpeedBonus: number
  healingAura: number
  healingRadius: number
  components: string[]
  componentHp: number
}

function normalizeDefinition(typeId: EnemyTypeId): NormalizedDefinition {
  if (isBossId(typeId)) {
    const def = BOSS_TYPES[typeId]
    return {
      hp: def.hp,
      speed: def.speed,
      armor: def.armor,
      reward: def.reward,
      attack: def.attack,
      baseDamage: def.baseDamage,
      shield: def.shield ?? 0,
      air: false,
      mechanical: true,
      network: false,
      phase: false,
      energyResistance: def.energyResistance,
      railVulnerability: def.railVulnerability,
      droneEvasion: 0,
      enrageThreshold: 0,
      enrageSpeedBonus: 0,
      healingAura: 0,
      healingRadius: 0,
      components: def.components ?? [],
      componentHp: 0,
    }
  }
  const def = ENEMY_TYPES[typeId as EnemyId]
  return {
    hp: def.hp,
    speed: def.speed,
    armor: def.armor,
    reward: def.reward,
    attack: def.attack,
    baseDamage: 1,
    shield: def.shield ?? 0,
    air: Boolean(def.air),
    mechanical: Boolean(def.mechanical),
    network: Boolean(def.network),
    phase: Boolean(def.phase),
    energyResistance: def.energyResistance ?? 0,
    railVulnerability: def.railVulnerability ?? 0,
    droneEvasion: def.droneEvasion ?? 0,
    enrageThreshold: def.enrageThreshold ?? 0,
    enrageSpeedBonus: def.enrageSpeedBonus ?? 0,
    healingAura: def.healingAura ?? 0,
    healingRadius: def.healingRadius ?? 0,
    components: [],
    componentHp: 0,
  }
}

/** 生成一个敌人的完整运行时状态,原 gameplay.js `_0x5b1dce` */
export function spawnEnemy({ id, mapIndex, wave, difficulty, now, entry }: SpawnEnemyOptions): EnemyState {
  const def = normalizeDefinition(entry.type)
  const multiplier = enemyStatMultiplier(mapIndex, wave, difficulty)
  const power = Math.max(0.1, Number(entry.power) || 1)
  const speedBonus = mapSpeedBonus(mapIndex)
  const movementSpeed = (Number.isFinite(entry.speed) ? (entry.speed as number) : def.speed) * speedBonus * difficultySpeedMultiplier(difficulty)

  return {
    id,
    typeId: entry.type,
    isBoss: entry.boss,
    lane: entry.lane,
    routeIndex: Number.isInteger(entry.routeIndex) && (entry.routeIndex as number) >= 0 ? entry.routeIndex : (entry.lane === 'left' ? 0 : 1),
    distance: 0,
    hp: def.hp * multiplier * power,
    maxHp: def.hp * multiplier * power,
    shield: def.shield * multiplier * power,
    maxShield: def.shield * multiplier * power,
    armor: def.armor,
    speed: movementSpeed,
    baseSpeed: movementSpeed,
    attack: (Number.isFinite(entry.attack) ? (entry.attack as number) : def.attack) * difficultyAttackMultiplier(difficulty),
    baseDamage: def.baseDamage,
    reward: Number.isFinite(entry.reward) ? (entry.reward as number) : def.reward,
    elite: Boolean(entry.elite),
    air: def.air,
    mechanical: def.mechanical,
    network: def.network,
    phaseCapable: def.phase,
    energyResistance: def.energyResistance,
    railVulnerability: def.railVulnerability,
    droneEvasion: def.droneEvasion,
    enrageThreshold: def.enrageThreshold,
    enrageSpeedBonus: def.enrageSpeedBonus,
    healingAura: def.healingAura,
    healingRadius: def.healingRadius,
    spawnTime: now,
    lastHit: -Infinity,
    revealedUntil: 0,
    slowUntil: 0,
    slowAmount: 0,
    stunnedUntil: 0,
    skillSlowUntil: 0,
    skillSlowAmount: 0,
    attackSuppressedUntil: 0,
    attackSuppression: 0,
    vulnerableUntil: 0,
    vulnerability: 0,
    shieldBlockedUntil: 0,
    phased: false,
    blocked: false,
    dead: false,
    lastTeleport: now,
    stage: 1,
    bossStageEnteredAt: now,
    nextBossAbilityAt: now + 4000,
    components: def.components.map((name) => {
      const componentHp = isBossId(entry.type) ? bossComponentHp(BOSS_TYPES[entry.type], name) : def.componentHp
      return { name, hp: componentHp * multiplier * power, maxHp: componentHp * multiplier * power }
    }),
  }
}

export type DamageKind = 'physical' | 'energy'

export interface DamageSource {
  position: { x: number; y: number }
  typeId?: string
}

export interface DamageResult {
  dealt: number
  killed: boolean
  destroyedComponent: string | null
  shieldDepletedThisHit: boolean
}

/** 敌人当前位置(board units)，使用敌人实际进入的入口路线。 */
export function enemyPosition(geometry: MapGeometry, enemy: EnemyState): { x: number; y: number } {
  const p = routePointByIndex(geometry, enemy.distance, enemy.routeIndex ?? (enemy.lane === 'left' ? 0 : 1))
  return { x: p.x, y: p.y }
}

function isBackstab(geometry: MapGeometry, enemy: EnemyState, source: DamageSource): boolean {
  const dir = routePointByIndex(geometry, enemy.distance, enemy.routeIndex ?? (enemy.lane === 'left' ? 0 : 1))
  const enemyPos = { x: dir.x, y: dir.y }
  return dir.dx * (source.position.x - enemyPos.x) + dir.dy * (source.position.y - enemyPos.y) < 0
}

/**
 * 对敌人造成伤害并结算护盾/部件/易伤/护甲/背刺加成,原 `_0x4d7302`。
 * `armorPenetration` 为 0-1 之间的穿甲比例。
 */
export function applyDamage(
  geometry: MapGeometry,
  enemy: EnemyState,
  rawDamage: number,
  kind: DamageKind,
  source: DamageSource | null,
  armorPenetration = 0,
  now: number,
): DamageResult {
  const noop: DamageResult = { dealt: 0, killed: false, destroyedComponent: null, shieldDepletedThisHit: false }
  if (!enemy || enemy.dead) return noop
  if (enemy.phased && now >= enemy.revealedUntil) return noop

  let damage = rawDamage
  if (now < enemy.vulnerableUntil) {
    damage *= 1 + enemy.vulnerability
  }
  if (kind === 'energy') {
    damage *= 1 - enemy.energyResistance
  }
  if (kind === 'physical') {
    damage *= 1 - enemy.armor * (1 - armorPenetration)
  }
  if (source?.typeId === 'mag-rail-sniper') {
    damage *= 1 + enemy.railVulnerability
  }
  if (source?.typeId === 'drone-hive' && now >= enemy.revealedUntil) {
    damage *= 1 - enemy.droneEvasion
  }
  if (enemy.typeId === 'riot' && source && isBackstab(geometry, enemy, source)) {
    damage *= 1.25
  }

  let shieldDepletedThisHit = false
  if (enemy.shield > 0) {
    const shieldBefore = enemy.shield
    const absorbed = Math.min(enemy.shield, damage)
    enemy.shield -= absorbed
    damage -= absorbed
    if (shieldBefore > 0 && enemy.shield <= 0) shieldDepletedThisHit = true
  }

  let destroyedComponent: string | null = null
  if (enemy.components.length && damage > 0) {
    const component = enemy.components.find((c) => c.hp > 0)
    if (component) {
      const componentShare = component.name === '盾牌' ? 0.5 : 0.35
      const componentDamage = damage * componentShare
      component.hp = Math.max(0, component.hp - componentDamage)
      damage *= 1 - componentShare
      if (component.hp === 0) destroyedComponent = component.name
    }
  }

  enemy.hp -= damage
  enemy.lastHit = now
  let killed = false
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true
    killed = true
  }

  return { dealt: Math.max(0, rawDamage <= 0 ? 0 : damage), killed, destroyedComponent, shieldDepletedThisHit }
}

/** 更新普通敌人的速度状态与生物修复光环。 */
export function tickEnemyTraits(geometry: MapGeometry, enemies: EnemyState[], now: number, dtSeconds: number): void {
  for (const enemy of enemies) {
    if (enemy.dead || enemy.isBoss) continue
    const slowed = now < enemy.slowUntil ? Math.max(0.2, 1 - enemy.slowAmount) : 1
    const enraged = enemy.enrageThreshold > 0 && enemy.hp / Math.max(1, enemy.maxHp) <= enemy.enrageThreshold
      ? 1 + enemy.enrageSpeedBonus
      : 1
    enemy.speed = enemy.baseSpeed * slowed * enraged
  }

  const healers = enemies.filter((enemy) => !enemy.dead && enemy.healingAura > 0 && enemy.healingRadius > 0)
  if (!healers.length) return
  for (const target of enemies) {
    if (target.dead || target.mechanical || target.hp >= target.maxHp) continue
    let strongestAura = 0
    for (const healer of healers) {
      if (projectedDistance(enemyPosition(geometry, healer), enemyPosition(geometry, target)) <= healer.healingRadius) {
        strongestAura = Math.max(strongestAura, healer.healingAura)
      }
    }
    if (strongestAura > 0) target.hp = Math.min(target.maxHp, target.hp + strongestAura * dtSeconds)
  }
}

/** 语音事件 id,用于部件被摧毁时触发,原 `_0x2ce699` 映射表(重导出自 data/bosses) */
export const ENFORCER_COMPONENT_EVENT = ENFORCER_COMPONENT_VOICE_EVENT

/**
 * 判断佣兵能否拦截该敌人:非死亡、非空中、且不在相位隐身状态,原 `_0xcae4d9`。
 */
export function canMercenaryIntercept(enemy: EnemyState, now: number): boolean {
  if (!enemy || enemy.dead || enemy.air) return false
  return !isEnemyPhasedAt(enemy, now)
}

/** 原 `_0x4829f3`:忍者每 5 秒进入相位 1 秒(除非被揭露) */
export function isEnemyPhasedAt(enemy: EnemyState, now: number): boolean {
  if (!enemy.phaseCapable) return false
  return (now - enemy.spawnTime) % 5000 < 1000 && now >= enemy.revealedUntil
}

/** 索敌用距离,原 `_0x2bc49d` 的重导出 */
export { projectedDistance }

/** 在射程内寻找目标,原 `_0x48f1e7` */
export function enemiesInRange(
  geometry: MapGeometry,
  towerPos: { x: number; y: number },
  enemies: EnemyState[],
  range: number,
  includeAir = true,
): EnemyState[] {
  return enemies.filter((e) => {
    if (e.dead) return false
    if (!includeAir && e.air) return false
    return projectedDistance(towerPos, enemyPosition(geometry, e)) <= range
  })
}
