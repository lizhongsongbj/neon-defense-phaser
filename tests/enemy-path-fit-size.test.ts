import test from 'node:test'
import assert from 'node:assert/strict'
import { BOSS_TYPES } from '../src/data/bosses'
import { ENEMY_TYPES } from '../src/data/enemies'
import {
  BOSS_ENEMY_SIZE_RANGE,
  enemyDisplaySize,
  REGULAR_ENEMY_SIZE_RANGE,
} from '../src/data/enemyVisuals'

test('普通怪物缩放到道路可容纳的视觉宽度', () => {
  const sizes = Object.values(ENEMY_TYPES).map((enemy) => enemyDisplaySize(enemy.size, false))
  assert.ok(Math.min(...sizes) >= REGULAR_ENEMY_SIZE_RANGE.min)
  assert.ok(Math.max(...sizes) <= REGULAR_ENEMY_SIZE_RANGE.max)
  assert.ok(enemyDisplaySize(ENEMY_TYPES.gang.size, false) < enemyDisplaySize(ENEMY_TYPES.bonebreaker.size, false))
})

test('Boss 保持更强轮廓，但不会过度遮挡路径', () => {
  const sizes = Object.values(BOSS_TYPES).map((boss) => enemyDisplaySize(boss.size, true))
  assert.ok(Math.min(...sizes) >= BOSS_ENEMY_SIZE_RANGE.min)
  assert.ok(Math.max(...sizes) <= BOSS_ENEMY_SIZE_RANGE.max)
  assert.ok(Math.min(...sizes) > REGULAR_ENEMY_SIZE_RANGE.max)
})
