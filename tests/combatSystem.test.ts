import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RANGE_PROJECTION_Y } from '../src/data/balance'
import { MAP_LEVELS } from '../src/data/maps'
import { buildMapGeometry, routePoint } from '../src/systems/PathSystem'
import { applyDamage, canMercenaryIntercept, isEnemyPhasedAt, spawnEnemy, tickEnemyTraits } from '../src/systems/CombatSystem'
import { buildWavePlan } from '../src/systems/WaveSpawner'
import type { EnemyState } from '../src/systems/types'

/** 移植自旧版 balance-agent.test.js：验证投影半径与游戏展示圈一致。 */
test('范围的2.5D投影半径与展示圈正确匹配', () => {
  const verticalWorldRadius = RANGE_PROJECTION_Y * 220
  const projectedScreenRadius = (verticalWorldRadius / 1000) * 941
  assert.ok(Math.abs(projectedScreenRadius - 228.06079999999997) < 1e-9, '范围展示圈必须与判断半径一致')
})

test('路径计算能在左右两条路线上返回有限坐标', () => {
  const geometry = buildMapGeometry(MAP_LEVELS[0])
  for (let d = 0; d <= 1000; d += 50) {
    const left = routePoint(geometry, d, 'left')
    const right = routePoint(geometry, d, 'right')
    assert.ok(Number.isFinite(left.x) && Number.isFinite(left.y))
    assert.ok(Number.isFinite(right.x) && Number.isFinite(right.y))
  }
})

function makeNinja(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: 1,
    typeId: 'ninja',
    isBoss: false,
    lane: 'left',
    distance: 0,
    hp: 260,
    maxHp: 260,
    shield: 0,
    maxShield: 0,
    armor: 0,
    speed: 40,
    baseSpeed: 40,
    attack: 18,
    reward: 30,
    elite: false,
    air: false,
    mechanical: false,
    network: false,
    phaseCapable: true,
    energyResistance: 0,
    railVulnerability: 0,
    droneEvasion: 0,
    enrageThreshold: 0,
    enrageSpeedBonus: 0,
    healingAura: 0,
    healingRadius: 0,
    spawnTime: 0,
    lastHit: -Infinity,
    revealedUntil: 0,
    slowUntil: 0,
    slowAmount: 0,
    vulnerableUntil: 0,
    vulnerability: 0,
    shieldBlockedUntil: 0,
    phased: false,
    blocked: false,
    dead: false,
    lastTeleport: 0,
    stage: 1,
    components: [],
    ...overrides,
  }
}

test('相位忍者在相位窗口内无法被佣兵拦截', () => {
  const ninja = makeNinja()
  assert.equal(isEnemyPhasedAt(ninja, 500), true, '忍者在0.5秒时应处于相位窗口')
  assert.equal(canMercenaryIntercept(ninja, 500), false, '相位期间不可被拦截')
  assert.equal(isEnemyPhasedAt(ninja, 1100), false, '1.1秒时相位窗口应结束')
  assert.equal(canMercenaryIntercept(ninja, 1100), true, '相位结束后可被拦截')
})

test('黑客扫描的揭露窗口可以取消相位', () => {
  const ninja = makeNinja({ revealedUntil: 2000 })
  assert.equal(canMercenaryIntercept(ninja, 500), true, '揭露窗口期间即使处于相位周期也可被拦截')
})

test('相同参数的波次计划可重复并保持确定性', () => {
  const a = buildWavePlan(3, 2)
  const b = buildWavePlan(3, 2)
  assert.deepEqual(a, b, '波次生成必须可重复，相同参数应得到相同结果')
  assert.ok(a.length > 0)
})

test('第6关每5波出现Boss，其他地图每10波出现Boss并交替执法者与夏娃', () => {
  const wave5Map5 = buildWavePlan(5, 5)
  assert.ok(wave5Map5.some((e) => e.boss && e.type === 'enforcer'), '第6关第5波应出现执法者')
  const wave10Map5 = buildWavePlan(10, 5)
  assert.ok(wave10Map5.some((e) => e.boss && e.type === 'eve'), '第6关第10波应出现夏娃-9')
  const wave10Map0 = buildWavePlan(10, 0)
  assert.ok(wave10Map0.some((e) => e.boss && e.type === 'enforcer'), '第1关第10波应出现执法者')
  const wave20Map0 = buildWavePlan(20, 0)
  assert.ok(wave20Map0.some((e) => e.boss && e.type === 'eve'), '第1关第20波应出现夏娃-9')
  const wave5Map0 = buildWavePlan(5, 0)
  assert.ok(!wave5Map0.some((e) => e.boss), '非第6关的第5波不应出现Boss')
})

test('电磁镇暴体克制电弧塔，同时被磁轨狙击克制', () => {
  const geometry = buildMapGeometry(MAP_LEVELS[4])
  const makeElectromagneticRiot = () => spawnEnemy({
    id: 10,
    mapIndex: 4,
    wave: 1,
    difficulty: 'normal',
    now: 0,
    entry: { type: 'faraday', boss: false, lane: 'left', delay: 0 },
  })
  const arcTarget = makeElectromagneticRiot()
  const railTarget = makeElectromagneticRiot()
  const arc = applyDamage(geometry, arcTarget, 100, 'energy', { position: { x: 0, y: 0 }, typeId: 'arc-neon' }, 0, 0)
  const rail = applyDamage(geometry, railTarget, 100, 'physical', { position: { x: 0, y: 0 }, typeId: 'mag-rail-sniper' }, 0.35, 0)
  assert.ok(arc.dealt < 40, '电磁屏蔽外壳应大幅减免电弧能量伤害')
  assert.ok(rail.dealt > 110, '磁轨狙击应利用调谐装甲缝造成额外伤害')
})

test('劫持浮游体克制无人机，但黑客扫描可以破解链路欺骗', () => {
  const geometry = buildMapGeometry(MAP_LEVELS[4])
  const makeHijacker = () => spawnEnemy({
    id: 11,
    mapIndex: 4,
    wave: 1,
    difficulty: 'normal',
    now: 0,
    entry: { type: 'hijacker', boss: false, lane: 'right', delay: 0 },
  })
  const hidden = makeHijacker()
  hidden.shield = 0
  const revealed = makeHijacker()
  revealed.shield = 0
  revealed.revealedUntil = 5000
  const spoofed = applyDamage(geometry, hidden, 100, 'physical', { position: { x: 0, y: 0 }, typeId: 'drone-hive' }, 0, 1000)
  const hacked = applyDamage(geometry, revealed, 100, 'physical', { position: { x: 0, y: 0 }, typeId: 'drone-hive' }, 0, 1000)
  assert.ok(spoofed.dealt < 30, '未扫描时应大幅减免无人机伤害')
  assert.ok(hacked.dealt > 80, '黑客揭露后无人机链路应恢复有效命中')
})

test('后期地图的高波次会编入两种新敌人', () => {
  const wave = buildWavePlan(9, 5)
  assert.ok(wave.some((entry) => entry.type === 'faraday'), '第6关后期波次应出现电磁镇暴体')
  assert.ok(wave.some((entry) => entry.type === 'hijacker'), '第6关后期波次应出现劫持浮游体')
})


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
