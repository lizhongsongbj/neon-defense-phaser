import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sfx = readFileSync(new URL('../src/audio/EnemySpawnSfx.ts', import.meta.url), 'utf8')
const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')

test('帮派义体兵、防暴镇压机和相位忍者拥有不同的机械出场音效', () => {
  assert.match(sfx, /private playGang/)
  assert.match(sfx, /private playRiot/)
  assert.match(sfx, /private playNinja/)
  assert.match(sfx, /'square'/)
  assert.match(sfx, /'sawtooth'/)
  assert.match(sfx, /createBiquadFilter/)
})

test('三种敌人生成时会触发机械音效并遵循语音静音设置', () => {
  assert.match(battle, /if \(!this\.voice\?\.muted\) this\.enemySpawnSfx\.play\(enemy\.typeId/)
  assert.match(sfx, /type !== 'gang' && type !== 'riot' && type !== 'ninja'/)
})

test('高频连续生成时使用各自冷却，避免机械音堆叠爆音', () => {
  assert.match(sfx, /gang: 620/)
  assert.match(sfx, /riot: 1050/)
  assert.match(sfx, /ninja: 820/)
})
