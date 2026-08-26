import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isSpecialCombatEnemy } from '../src/audio/EnemyCombatSfx'

const sfx = readFileSync(new URL('../src/audio/EnemyCombatSfx.ts', import.meta.url), 'utf8')
const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')

const specialEnemies = ['faraday', 'hijacker', 'neurohound', 'matriarch', 'bonebreaker', 'enforcer', 'eve']

test('五种特殊敌人与两个 Boss 均登记了战斗音效', () => {
  specialEnemies.forEach((type) => assert.equal(isSpecialCombatEnemy(type), true))
  assert.equal(isSpecialCombatEnemy('gang'), false)
  specialEnemies.forEach((type) => {
    assert.match(sfx, new RegExp(`${type}:attack`))
    assert.match(sfx, new RegExp(`${type}:death`))
  })
})

test('特殊敌人音效具有独立攻击冷却和立体声定位', () => {
  assert.match(sfx, /attackGapMs/)
  assert.match(sfx, /createStereoPanner/)
  assert.match(sfx, /screenRatio/)
})

test('佣兵交战、Boss 技能、突破基地与死亡都会触发对应音效', () => {
  assert.match(battle, /enemy\.blocked && isSpecialCombatEnemy\(enemy\.typeId\)/)
  assert.match(battle, /this\.enemyCombatSfx\.playAttack\(bossId/)
  assert.match(battle, /enemy\.distance >= 1000[\s\S]*?this\.enemyCombatSfx\.playAttack\(enemy\.typeId/)
  assert.match(battle, /this\.enemyCombatSfx\.playDeath\(enemy\.typeId/)
})

test('特殊敌人与 Boss 音效遵循语音静音设置并在场景退出时销毁', () => {
  assert.match(battle, /if \(!this\.voice\?\.muted\)/)
  assert.match(battle, /this\.enemyCombatSfx\?\.destroy\(\)/)
})
