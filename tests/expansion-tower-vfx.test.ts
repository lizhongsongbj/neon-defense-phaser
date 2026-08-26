import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const effects = readFileSync(new URL('../src/entities/EffectsLayer.ts', import.meta.url), 'utf8')
const towers = readFileSync(new URL('../src/entities/TowerActor.ts', import.meta.url), 'utf8')
const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
const resolver = readFileSync(new URL('../src/systems/towerBehaviors/ExpansionTowers.ts', import.meta.url), 'utf8')

test('三种扩展塔攻击事件使用各自的运行时特效标识', () => {
  assert.match(resolver, /'gravity-nail': 'gravity'/)
  assert.match(resolver, /'grey-tide': 'grey-tide'/)
  assert.match(resolver, /'trajectory-rewriter': 'trajectory'/)
})

test('三种扩展塔拥有独立的发射和受击特效', () => {
  assert.match(effects, /playExpansionAttack/)
  assert.match(effects, /playGravityImpact/)
  assert.match(effects, /playGreyTideImpact/)
  assert.match(effects, /playTrajectoryImpact/)
  assert.match(effects, /effect === 'gravity' \|\| effect === 'grey-tide' \|\| effect === 'trajectory'/)
})

test('扩展塔开火时播放塔体反馈并从塔头释放特效', () => {
  assert.match(towers, /playAttackFeedback\(\)/)
  assert.match(battle, /this\.towerActors\.get\(tower\.id\)\?\.playAttackFeedback\(\)/)
  assert.match(battle, /event\.effect === 'gravity'/)
  assert.match(battle, /event\.effect === 'grey-tide'/)
  assert.match(battle, /event\.effect === 'trajectory'/)
  assert.match(battle, /const origin = usesHeadOrigin/)
})