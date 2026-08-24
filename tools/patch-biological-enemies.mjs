import fs from 'node:fs'

function edit(file, transform) {
  const before = fs.readFileSync(file, 'utf8')
  const after = transform(before)
  if (after === before) throw new Error(`No change made: ${file}`)
  fs.writeFileSync(file, after, 'utf8')
}
function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing pattern: ${label}`)
  return text.replace(from, to)
}

edit('src/systems/types.ts', (s) => replaceOnce(s,
`  droneEvasion: number
  spawnTime: number`,
`  droneEvasion: number
  enrageThreshold: number
  enrageSpeedBonus: number
  healingAura: number
  healingRadius: number
  spawnTime: number`, 'runtime trait fields'))

edit('src/systems/CombatSystem.ts', (source) => {
  let s = source
  s = replaceOnce(s,
`  droneEvasion: number
  components: string[]`,
`  droneEvasion: number
  enrageThreshold: number
  enrageSpeedBonus: number
  healingAura: number
  healingRadius: number
  components: string[]`, 'normalized trait fields')
  s = replaceOnce(s,
`      droneEvasion: 0,
      components: def.components ?? [],`,
`      droneEvasion: 0,
      enrageThreshold: 0,
      enrageSpeedBonus: 0,
      healingAura: 0,
      healingRadius: 0,
      components: def.components ?? [],`, 'boss defaults')
  s = replaceOnce(s,
`    droneEvasion: def.droneEvasion ?? 0,
    components: [],`,
`    droneEvasion: def.droneEvasion ?? 0,
    enrageThreshold: def.enrageThreshold ?? 0,
    enrageSpeedBonus: def.enrageSpeedBonus ?? 0,
    healingAura: def.healingAura ?? 0,
    healingRadius: def.healingRadius ?? 0,
    components: [],`, 'normal traits')
  s = replaceOnce(s,
`  const speedBonus = mapSpeedBonus(mapIndex)

  return {`,
`  const speedBonus = mapSpeedBonus(mapIndex)
  const movementSpeed = (Number.isFinite(entry.speed) ? (entry.speed as number) : def.speed) * speedBonus

  return {`, 'movement speed')
  s = replaceOnce(s,
`    speed: (Number.isFinite(entry.speed) ? (entry.speed as number) : def.speed) * speedBonus,
    baseSpeed: def.speed,`,
`    speed: movementSpeed,
    baseSpeed: movementSpeed,`, 'scaled base speed')
  s = replaceOnce(s,
`    droneEvasion: def.droneEvasion,
    spawnTime: now,`,
`    droneEvasion: def.droneEvasion,
    enrageThreshold: def.enrageThreshold,
    enrageSpeedBonus: def.enrageSpeedBonus,
    healingAura: def.healingAura,
    healingRadius: def.healingRadius,
    spawnTime: now,`, 'spawn traits')
  s = replaceOnce(s,
`/** 语音事件 id,用于部件被摧毁时触发,原 \`_0x2ce699\` 映射表(重导出自 data/bosses) */`,
`/** 更新普通敌人的速度状态与生物修复光环。 */
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

/** 语音事件 id,用于部件被摧毁时触发,原 \`_0x2ce699\` 映射表(重导出自 data/bosses) */`, 'trait tick')
  return s
})

edit('src/scenes/BattleScene.ts', (s) => {
  s = replaceOnce(s,
`import { spawnEnemy, enemyPosition, isEnemyPhasedAt } from '../systems/CombatSystem'`,
`import { spawnEnemy, enemyPosition, isEnemyPhasedAt, tickEnemyTraits } from '../systems/CombatSystem'`, 'battle import')
  s = replaceOnce(s,
`    for (const enemy of this.battle.enemies) {
      if (enemy.dead || enemy.blocked) continue`,
`    tickEnemyTraits(this.geometry, this.battle.enemies, this.battle.now, dtSeconds)

    for (const enemy of this.battle.enemies) {
      if (enemy.dead || enemy.blocked) continue`, 'battle trait tick')
  return s
})

edit('src/systems/BalanceSimulator.ts', (s) => {
  s = replaceOnce(s,
`import { spawnEnemy, isEnemyPhasedAt } from './CombatSystem'`,
`import { spawnEnemy, isEnemyPhasedAt, tickEnemyTraits } from './CombatSystem'`, 'sim import')
  s = replaceOnce(s,
`    for (const enemy of battle.enemies) {
      if (enemy.dead || enemy.blocked) continue`,
`    tickEnemyTraits(geometry, battle.enemies, battle.now, TICK_SECONDS)

    for (const enemy of battle.enemies) {
      if (enemy.dead || enemy.blocked) continue`, 'sim trait tick')
  return s
})
