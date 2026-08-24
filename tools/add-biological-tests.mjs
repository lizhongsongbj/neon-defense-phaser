import fs from 'node:fs'
const file='tests/combatSystem.test.ts'
let s=fs.readFileSync(file,'utf8')
s=s.replace(`import { applyDamage, canMercenaryIntercept, isEnemyPhasedAt, spawnEnemy } from '../src/systems/CombatSystem'`, `import { applyDamage, canMercenaryIntercept, isEnemyPhasedAt, spawnEnemy, tickEnemyTraits } from '../src/systems/CombatSystem'`)
s += `

test('企业浮空艇归类为机械单位', () => {
  const aerostat = spawnEnemy({ id: 20, mapIndex: 2, wave: 1, difficulty: 'normal', now: 0, entry: { type: 'aerostat', boss: false, lane: 'left', delay: 0 } })
  assert.equal(aerostat.mechanical, true)
  assert.equal(aerostat.air, true)
})

test('神经猎犬在低生命时触发痛觉超频', () => {
  const geometry = buildMapGeometry(MAP_LEVELS[2])
  const hound = spawnEnemy({ id: 21, mapIndex: 2, wave: 1, difficulty: 'normal', now: 0, entry: { type: 'neurohound', boss: false, lane: 'left', delay: 0 } })
  hound.hp = hound.maxHp * 0.4
  tickEnemyTraits(geometry, [hound], 1000, 0.1)
  assert.ok(Math.abs(hound.speed - hound.baseSpeed * 1.45) < 1e-9, '低生命猎犬应获得45%移动加速')
})

test('育质母体为范围内的生物单位恢复生命且光环不叠加', () => {
  const geometry = buildMapGeometry(MAP_LEVELS[4])
  const spawn = (id: number, type: 'matriarch' | 'gang') => spawnEnemy({ id, mapIndex: 4, wave: 1, difficulty: 'normal', now: 0, entry: { type, boss: false, lane: 'left', delay: 0 } })
  const motherA = spawn(22, 'matriarch')
  const motherB = spawn(23, 'matriarch')
  const ally = spawn(24, 'gang')
  motherA.distance = motherB.distance = ally.distance = 300
  ally.hp = ally.maxHp - 100
  tickEnemyTraits(geometry, [motherA, motherB, ally], 1000, 1)
  assert.equal(ally.hp, ally.maxHp - 82, '两个母体的修复光环不应叠加')
})

test('骨铠破障兽抵抗物理伤害但承受额外能量伤害', () => {
  const geometry = buildMapGeometry(MAP_LEVELS[4])
  const spawn = (id: number) => spawnEnemy({ id, mapIndex: 4, wave: 1, difficulty: 'normal', now: 0, entry: { type: 'bonebreaker', boss: false, lane: 'left', delay: 0 } })
  const physical = applyDamage(geometry, spawn(25), 100, 'physical', null, 0, 0)
  const energy = applyDamage(geometry, spawn(26), 100, 'energy', null, 0, 0)
  assert.ok(physical.dealt < 50, '骨铠应减免超过一半的普通物理伤害')
  assert.ok(energy.dealt > 130, '导电脊液应放大能量伤害')
})

test('后期波次会编入三种生物敌人', () => {
  const wave = buildWavePlan(12, 5)
  assert.ok(wave.some((entry) => entry.type === 'neurohound'))
  assert.ok(wave.some((entry) => entry.type === 'matriarch'))
  assert.ok(wave.some((entry) => entry.type === 'bonebreaker'))
})
`
fs.writeFileSync(file,s,'utf8')
