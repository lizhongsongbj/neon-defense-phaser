import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { BOSS_TYPES } from '../src/data/bosses'

const preload = readFileSync(new URL('../src/scenes/PreloadScene.ts', import.meta.url), 'utf8')
const actor = readFileSync(new URL('../src/entities/EnemyActor.ts', import.meta.url), 'utf8')

test('亚当·重锤只保留堡垒镇压、攻城超载和核心暴露三种形态', () => {
  const stages = BOSS_TYPES.enforcer.stages
  assert.equal(stages.length, 3)
  assert.deepEqual(stages.map((stage) => stage.name), ['堡垒镇压', '攻城超载', '核心暴露'])
  assert.equal(stages[1].ability, 'overdrive-salvo')
  assert.match(stages[1].enterCondition, /导弹舱.*重武器.*赤红.*推进/)
  assert.match(stages[2].enterCondition, /反应堆完全暴露/)
})

test('三种形态各自使用独立Boss图像并在阶段切换时更新', () => {
  const images = BOSS_TYPES.enforcer.stageImages
  assert.deepEqual(images, {
    1: 'assets/enemies/boss-forms/adam-smasher-stage-1-fortress.png',
    2: 'assets/enemies/boss-forms/adam-smasher-stage-2-siege-overload.png',
    3: 'assets/enemies/boss-forms/adam-smasher-stage-3-core.png',
  })
  for (const path of Object.values(images ?? {})) {
    assert.equal(existsSync(new URL(`../public/${path}`, import.meta.url)), true)
  }
  assert.match(preload, /bossStageTextureKey/)
  assert.match(preload, /boss\.stageImages/)
  assert.match(actor, /syncBossStageVisual/)
  assert.match(actor, /this\.sprite\.setTexture\(key\)\.setDisplaySize\(this\.baseSize, this\.baseSize\)/)
})
