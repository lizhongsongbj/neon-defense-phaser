import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RANGE_PROJECTION_Y } from '../src/data/balance'
import { MAP_LEVELS } from '../src/data/maps'
import { buildMapGeometry, routePoint } from '../src/systems/PathSystem'
import { canMercenaryIntercept, isEnemyPhasedAt } from '../src/systems/CombatSystem'
import { buildWavePlan } from '../src/systems/WaveSpawner'
import type { EnemyState } from '../src/systems/types'

/** 移植自 霓虹防线/balance-agent.test.js:射程投影常量必须与显示圈精确匹配 */
test('射程 2.5D 投影常量与展示圈精确匹配', () => {
  const verticalWorldRadius = RANGE_PROJECTION_Y * 220
  const projectedScreenRadius = (verticalWorldRadius / 1000) * 941
  assert.ok(Math.abs(projectedScreenRadius - 228.06079999999997) < 1e-9, '射程展示圈与命中判定必须一致')
})

test('路线几何在整条路线上返回有限坐标', () => {
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
  assert.equal(isEnemyPhasedAt(ninja, 500), true, '出生后 0.5s 处于相位窗口内')
  assert.equal(canMercenaryIntercept(ninja, 500), false, '相位期间不可被拦截')
  assert.equal(isEnemyPhasedAt(ninja, 1100), false, '1.1s 后相位窗口结束')
  assert.equal(canMercenaryIntercept(ninja, 1100), true, '相位结束后可被拦截')
})

test('黑客扫描的揭露窗口可以取消相位', () => {
  const ninja = makeNinja({ revealedUntil: 2000 })
  assert.equal(canMercenaryIntercept(ninja, 500), true, '揭露窗口内即使处于相位周期也可被拦截')
})

test('相同种子的波次生成结果具有确定性', () => {
  const a = buildWavePlan(3, 2)
  const b = buildWavePlan(3, 2)
  assert.deepEqual(a, b, '波次生成是纯函数,相同输入必须得到相同结果')
  assert.ok(a.length > 0)
})

test('第6关每5波、其他地图每10波出现Boss,且交替执法者/夏娃', () => {
  const wave5Map5 = buildWavePlan(5, 5)
  assert.ok(wave5Map5.some((e) => e.boss && e.type === 'enforcer'), '第6关第5波应出现执法者')
  const wave10Map5 = buildWavePlan(10, 5)
  assert.ok(wave10Map5.some((e) => e.boss && e.type === 'eve'), '第6关第10波应出现夏娃-9')
  const wave10Map0 = buildWavePlan(10, 0)
  assert.ok(wave10Map0.some((e) => e.boss && e.type === 'enforcer'), '第1关第10波(第1个boss周期)应出现执法者')
  const wave20Map0 = buildWavePlan(20, 0)
  assert.ok(wave20Map0.some((e) => e.boss && e.type === 'eve'), '第1关第20波(第2个boss周期)应出现夏娃-9')
  const wave5Map0 = buildWavePlan(5, 0)
  assert.ok(!wave5Map0.some((e) => e.boss), '非第6关的第5波不应出现Boss')
})
