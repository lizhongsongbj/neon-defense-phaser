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
  assert.equal(enemies.length, 39)
  const families = new Set(enemies.map((entry) => entry.family))
  assert.equal(families.size, 13)
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
  assert.equal(ANIMATION_CATALOG.length, 72)
  assert.equal(new Set(ANIMATION_CATALOG.map((entry) => entry.id)).size, 72)
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
    assert.ok(entries.every((entry) => entry.previewAsset?.includes('.webp')))
  }
})


test('黑客中继二至四级沿用一级扫描逻辑，深网控制台与黑冰崩解器不再切换颜色', () => {
  const entries = ANIMATION_CATALOG.filter((entry) => ['hack-l2', 'hack-l3', 'hack-a', 'hack-b'].includes(entry.id))
  assert.deepEqual(entries.map((entry) => entry.motion), ['scan-dual', 'scan-deep', 'scan-wide', 'scan-focused'])
  assert.ok(entries.every((entry) => entry.timeline.includes('定向') || entry.timeline.includes('扫描')))

  const deepWeb = entries.find((entry) => entry.id === 'hack-l3')
  const blackIce = entries.find((entry) => entry.id === 'hack-b')
  assert.equal(deepWeb?.motion, 'scan-deep')
  assert.equal(deepWeb?.accent, '#72ffbd')
  assert.ok(deepWeb?.timeline.includes('固定青绿色'))
  assert.equal(blackIce?.motion, 'scan-focused')
  assert.equal(blackIce?.accent, '#d44bff')
  assert.ok(blackIce?.timeline.includes('固定紫色'))
})


test('磁轨狙击五个等级形态均已接入同节奏真实攻击动图', () => {
  const rails = ANIMATION_CATALOG.filter((entry) => entry.category === 'tower' && entry.family === '磁轨狙击')
  assert.equal(rails.length, 5)
  assert.ok(rails.every((entry) => entry.status === 'available'))
  assert.ok(rails.every((entry) => entry.previewAsset?.includes('.webp')))
})


test('黑客中继全等级的塔头脉冲使用一级配色并单独校准位置', () => {
  const entries = ANIMATION_CATALOG.filter((entry) => entry.family === '黑客中继')
  assert.equal(entries.length, 5)
  assert.ok(entries.every((entry) => entry.headPulse?.accent === '#79ff9e'))
  assert.ok(entries.every((entry) => entry.headPulse?.secondary === '#c9ffe0'))
  assert.ok(entries.every((entry) => (entry.headPulse?.x ?? 0) >= 45 && (entry.headPulse?.x ?? 0) <= 55))
  assert.equal(new Set(entries.map((entry) => entry.headPulse?.y)).size, 5)
})


test('黑客中继所有等级使用用户圈选的同一套16帧攻击特效', () => {
  const entries = ANIMATION_CATALOG.filter((entry) => entry.family === '黑客中继')
  assert.equal(entries.length, 5)
  assert.ok(entries.every((entry) => entry.status === 'available'))
  assert.ok(entries.every((entry) => entry.attackEffectAsset === '/assets/effects/hacker-relay-selected-pulse/hacker-relay-selected-pulse.webp'))
})
test('电弧塔的四种进阶形态共用一级塔提取出的16帧闪电特效', () => {
  const advanced = ANIMATION_CATALOG.filter((entry) => ['arc-l2', 'arc-l3', 'arc-a', 'arc-b'].includes(entry.id))
  assert.equal(advanced.length, 4)
  assert.ok(advanced.every((entry) => entry.status === 'available'))
  assert.ok(advanced.every((entry) => entry.attackEffectKind === 'arc-lightning'))
  assert.ok(advanced.every((entry) => entry.attackEffectAsset === '/assets/effects/arc-neon-lightning/arc-neon-lightning.webp'))
})
