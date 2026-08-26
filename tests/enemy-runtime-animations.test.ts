import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const preload = readFileSync(new URL('../src/scenes/PreloadScene.ts', import.meta.url), 'utf8')
const actor = readFileSync(new URL('../src/entities/EnemyActor.ts', import.meta.url), 'utf8')
const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
const catalog = readFileSync(new URL('../src/data/enemyRuntimeAnimations.ts', import.meta.url), 'utf8')

const expected = [
  ['gang', 'move', 8], ['gang', 'death', 8],
  ['riot', 'move', 8], ['riot', 'attack', 8], ['riot', 'death', 8],
  ['ninja', 'move', 8], ['ninja', 'attack', 8], ['ninja', 'death', 8],
  ['aerostat', 'move', 12], ['devourer', 'move', 12], ['faraday', 'move', 8], ['hijacker', 'move', 12],
  ['neurohound', 'move', 8], ['neurohound', 'attack', 14], ['neurohound', 'death', 12],
  ['matriarch', 'move', 14], ['matriarch', 'attack', 14], ['matriarch', 'death', 12],
  ['bonebreaker', 'move', 8], ['bonebreaker', 'attack', 14], ['bonebreaker', 'death', 12],
] as const

test('素材生图中的怪物动画已拆为游戏可播放的透明逐帧资源', () => {
  for (const [enemy, motion, frames] of expected) {
    for (let frame = 1; frame <= frames; frame += 1) {
      const suffix = String(frame).padStart(2, '0')
      assert.equal(existsSync(new URL(`../public/assets/animations/enemies/runtime/${enemy}/${motion}/frame-${suffix}.webp`, import.meta.url)), true)
    }
  }
})

test('预加载和怪物演员接入移动、攻击与死亡动作', () => {
  assert.match(preload, /ENEMY_RUNTIME_ANIMATIONS/)
  assert.match(preload, /enemyAnimationFramePath/)
  assert.match(actor, /this\.playMotion\('move'\)/)
  assert.match(actor, /const attackActive = this\.enemy\.blocked \|\| attackPulse/)
  assert.match(actor, /playExitAnimation/)
  assert.match(actor, /ANIMATION_COMPLETE_KEY/)
  assert.match(catalog, /enemy-10-bonebreaker-death\.webp/)
})

test('敌人离场时先播放攻击或死亡动作，再销毁演员并生成残留', () => {
  assert.match(battle, /actor\.playExitAnimation/)
  assert.match(battle, /finishExitVisual/)
  assert.match(battle, /playEnemyDeathRemnant/)
  assert.doesNotMatch(battle, /this\.enemyActors\.get\(enemy\.id\)\?\.destroy\(\)/)
})
