import test from 'node:test'
import assert from 'node:assert/strict'
import { BOSS_TYPES, bossComponentHp, bossStageDefinition } from '../src/data/bosses'
import { spawnEnemy } from '../src/systems/CombatSystem'
import { tickEnforcer } from '../src/systems/bossBehaviors/Enforcer'
import { tickEve } from '../src/systems/bossBehaviors/Eve'

const spawnBoss = (type: 'enforcer' | 'eve') => spawnEnemy({
  id: type === 'enforcer' ? 101 : 102,
  mapIndex: 0,
  wave: 1,
  difficulty: 'normal',
  now: 0,
  entry: { type, boss: true, lane: 'left', delay: 0 },
})

test('两个Boss均定义完整基础数值、基地伤害和阶段技能', () => {
  const enforcer = BOSS_TYPES.enforcer
  const eve = BOSS_TYPES.eve
  assert.deepEqual([enforcer.hp, enforcer.reward, enforcer.baseDamage], [22000, 1250, 4])
  assert.deepEqual([eve.hp, eve.shield, eve.reward, eve.baseDamage], [30000, 3600, 1600, 5])
  assert.equal(enforcer.stages.length, 3)
  assert.equal(eve.stages.length, 3)
  for (const boss of [enforcer, eve]) {
    assert.ok(boss.stages.every((stage) => stage.abilityCooldown > 0))
    assert.ok(boss.stages.every((stage) => stage.enterCondition.length > 0))
    assert.ok(boss.stages.every((stage) => stage.abilityDescription.length > 0))
  }
})

test('亚当·重锤三个部件拥有不同耐久值', () => {
  const def = BOSS_TYPES.enforcer
  assert.equal(bossComponentHp(def, '盾牌'), 4200)
  assert.equal(bossComponentHp(def, '导弹舱'), 3200)
  assert.equal(bossComponentHp(def, '推进器'), 2800)
  const enemy = spawnBoss('enforcer')
  assert.ok(enemy.components[0].maxHp > enemy.components[1].maxHp)
  assert.ok(enemy.components[1].maxHp > enemy.components[2].maxHp)
})

test('亚当·重锤可由生命阈值或部件摧毁进入四个阶段', () => {
  const enemy = spawnBoss('enforcer')
  assert.equal(tickEnforcer(enemy, 0, 100).stageName, '堡垒镇压')

  enemy.components.find((component) => component.name === '盾牌')!.hp = 0
  let result = tickEnforcer(enemy, 0, 200)
  assert.equal(enemy.stage, 2)
  assert.equal(result.stageChanged, true)
  assert.equal(enemy.armor, bossStageDefinition('enforcer', 2).armor)

  enemy.components.find((component) => component.name === '导弹舱')!.hp = 0
  result = tickEnforcer(enemy, 0, 400)
  assert.equal(enemy.stage, 3)
  assert.equal(enemy.attack, bossStageDefinition('enforcer', 3).attack * 0.62)

  enemy.components.find((component) => component.name === '推进器')!.hp = 0
  result = tickEnforcer(enemy, 0, 600)
  assert.equal(enemy.stage, 4)
  assert.equal(result.voiceEvent, 'core')
  assert.ok(enemy.energyResistance < 0)
  assert.ok(enemy.railVulnerability >= 0.3)
})

test('亚当·重锤生命阈值可以在部件尚存时强制切换阶段', () => {
  const enemy = spawnBoss('enforcer')
  enemy.hp = enemy.maxHp * 0.69
  let result = tickEnforcer(enemy, 0, 1000)
  assert.equal(enemy.stage, 2)
  assert.equal(result.voiceEvent, 'enraged')
  assert.ok(enemy.speed > enemy.baseSpeed)

  enemy.hp = enemy.maxHp * 0.21
  result = tickEnforcer(enemy, 0, 2000)
  assert.equal(enemy.stage, 3)
  assert.equal(result.voiceEvent, 'core')
})

test('夏娃-9节点形态会周期迁移并触发节点劫持', () => {
  const enemy = spawnBoss('eve')
  const result = tickEve(enemy, 0, 4000)
  assert.equal(enemy.stage, 1)
  assert.equal(result.ability, 'node-lock')
  assert.equal(result.voiceEvent, 'node')
  assert.equal(enemy.distance, 45)
  assert.ok(enemy.energyResistance >= 0.3)
})

test('夏娃-9在70%和35%生命切换载体与固定核心', () => {
  const enemy = spawnBoss('eve')
  enemy.shield = 0
  enemy.hp = enemy.maxHp * 0.69
  let result = tickEve(enemy, 0, 1000)
  assert.equal(enemy.stage, 2)
  assert.equal(result.voiceEvent, 'transfer')
  assert.ok(enemy.shield >= enemy.maxHp * 0.09)
  assert.ok(enemy.speed > 0)

  enemy.hp = enemy.maxHp * 0.34
  result = tickEve(enemy, 0, 3000)
  assert.equal(enemy.stage, 3)
  assert.equal(result.voiceEvent, 'final')
  assert.equal(enemy.speed, 0)
  assert.equal(enemy.distance, 760)
  assert.ok(enemy.energyResistance < 0)
})

test('夏娃-9固定核心按冷却周期直接脉冲基地', () => {
  const enemy = spawnBoss('eve')
  enemy.hp = enemy.maxHp * 0.3
  tickEve(enemy, 0, 1000)
  const result = tickEve(enemy, 0, 2500)
  assert.equal(result.ability, 'core-pulse')
  assert.equal(result.baseDamage, 1)
})
