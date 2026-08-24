import test from 'node:test'
import assert from 'node:assert/strict'
import { ANIMATION_CATALOG } from '../src/data/animationCatalog'
import { TOWER_TYPE_BY_ID } from '../src/data/towers'

test('动画面板只保留磁轨、电弧和黑客三种塔的15种攻击形态', () => {
  const towers = ANIMATION_CATALOG.filter((entry) => entry.category === 'tower')
  assert.equal(towers.length, 15)
  const families = new Set(towers.map((entry) => entry.family))
  assert.equal(families.size, 3)
  for (const family of families) {
    const entries = towers.filter((entry) => entry.family === family)
    assert.equal(entries.length, 5)
    assert.deepEqual(new Set(entries.map((entry) => entry.level)), new Set(['Lv1', 'Lv2', 'Lv3', 'Lv4-A', 'Lv4-B']))
  }
})

test('每种怪物均具有移动、攻击和死亡动画定义', () => {
  const enemies = ANIMATION_CATALOG.filter((entry) => entry.category === 'enemy')
  assert.equal(enemies.length, 36)
  const families = new Set(enemies.map((entry) => entry.family))
  assert.equal(families.size, 12)
  for (const family of families) {
    const actions = enemies.filter((entry) => entry.family === family).map((entry) => entry.action)
    assert.ok(actions.includes('攻击'))
    assert.ok(actions.includes('死亡'))
    assert.ok(actions.includes('行走') || actions.includes('飞行'))
  }
})

test('动画面板只展示佣兵和无人机单位动画，不展示系统与连携', () => {
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'mercenary').length, 9)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'drone').length, 9)
  assert.equal(ANIMATION_CATALOG.some((entry) => String(entry.category) === 'system'), false)
  assert.equal(ANIMATION_CATALOG.length, 69)
  assert.equal(new Set(ANIMATION_CATALOG.map((entry) => entry.id)).size, 69)
})


test('街头兵营与无人机巢本身没有攻击动画，只保留佣兵和无人机单位动画', () => {
  assert.equal(TOWER_TYPE_BY_ID['street-mercenary'].attackAnimation, undefined)
  assert.equal(TOWER_TYPE_BY_ID['drone-hive'].attackAnimation, undefined)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'tower' && entry.family === '街头兵营').length, 0)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'tower' && entry.family === '无人机巢').length, 0)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'mercenary').length, 9)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'drone').length, 9)
})


test('重力钉、灰潮解构站和轨迹回写器不提供攻击动画', () => {
  const disabledFamilies = ['重力钉', '灰潮解构站', '轨迹回写器']
  for (const family of disabledFamilies) {
    assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'tower' && entry.family === family).length, 0)
  }
})


test('三种新怪物的移动、攻击和死亡均已接入真实动图', () => {
  for (const id of ['neurohound', 'matriarch', 'bonebreaker']) {
    const entries = ANIMATION_CATALOG.filter((entry) => entry.id.startsWith(`${id}-`))
    assert.equal(entries.length, 3)
    assert.ok(entries.every((entry) => entry.status === 'available'))
    assert.ok(entries.every((entry) => entry.previewAsset?.endsWith('.webp')))
  }
})
