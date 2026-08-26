import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAP_LEVELS } from '../src/data/maps'
import { buildMapGeometry, findNearestRoutePoint, toBoardUnits } from '../src/systems/PathSystem'
import { enemyPosition, spawnEnemy } from '../src/systems/CombatSystem'
import { buildWavePlan } from '../src/systems/WaveSpawner'

/**
 * 移植自 霓虹防线/map-coverage.test.js:验证每张地图的每个塔位都能被
 * 最低射程覆盖到路线(220 为磁轨狙击台 1 级射程,105/175 为近战/通用判定阈值)。
 */
test('每张地图的塔位都在最低射程内可达', () => {
  for (const map of MAP_LEVELS.filter((level) => level.available)) {
    const geometry = buildMapGeometry(map)
    const coverage = map.slots.map((slot, index) => ({
      slot: index + 1,
      distance: findNearestRoutePoint(geometry, toBoardUnits(slot)).separation,
      scale: Math.max(1, Number(slot.rangeScale) || 1),
    }))

    const unreachable = coverage.filter((c) => c.distance > c.scale * 220)
    const general = coverage.filter((c) => c.distance <= c.scale * 175)
    const closeRange = coverage.filter((c) => c.distance <= c.scale * 105)

    assert.equal(unreachable.length, 0, `${map.name} 存在无法覆盖的塔位`)
    assert.ok(general.length >= Math.ceil(coverage.length / 2), `${map.name} 通用射程塔位数量不足`)
    assert.ok(closeRange.length >= 2, `${map.name} 近战射程塔位数量不足`)
  }
})

test('生成的敌人会保留其入口路线编号', () => {
  const mapIndex = 1
  const map = MAP_LEVELS[mapIndex]
  const geometry = buildMapGeometry(map)
  const entries = buildWavePlan(1, mapIndex)
  const routeIndexes = new Set(entries.map((entry) => entry.routeIndex))
  assert.equal(routeIndexes.size, map.entranceRoutes.length)
  entries.forEach((entry, index) => {
    const enemy = spawnEnemy({ id: index + 1, mapIndex, wave: 1, difficulty: 'normal', now: 0, entry })
    assert.equal(enemy.routeIndex, entry.routeIndex)
    const point = enemyPosition(geometry, enemy)
    const firstPoint = geometry.routes[entry.routeIndex!].segments[0].from
    assert.deepEqual(point, { x: firstPoint.x, y: firstPoint.y })
  })
})

test('路线几何返回有限坐标', () => {
  const geometry = buildMapGeometry(MAP_LEVELS[0])
  const midpoint = { x: geometry.left.metricLength, y: 0 }
  assert.ok(Number.isFinite(midpoint.x))
})


test('八张地图的标定路线连续且始终位于画面内', () => {
  assert.equal(MAP_LEVELS.length, 8)
  for (const map of MAP_LEVELS) {
    assert.ok(map.slots.length >= 10, `${map.name} 塔位数量不足`)
    for (const lane of ['left', 'right'] as const) {
      const route = map.routes[lane]
      assert.ok(route.length >= 10, `${map.name} ${lane} 路线采样点不足`)
      for (const point of route) {
        assert.ok(point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100, `${map.name} 路线越界`)
      }
      for (let i = 1; i < route.length; i += 1) {
        const gap = Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y)
        assert.ok(gap <= 13, `${map.name} ${lane} 路线存在过大断点: ${gap.toFixed(1)}`)
      }
    }
  }
})


test('每张地图的每个入口都会获得独立的刷怪路线', async () => {
  const { buildWavePlan } = await import('../src/systems/WaveSpawner')
  const expected = [2, 3, 2, 3, 2, 3, 3, 3]
  MAP_LEVELS.forEach((map, mapIndex) => {
    assert.equal(map.entranceRoutes.length, expected[mapIndex], map.name + ' 入口数不匹配')
    const routeIndexes = new Set(buildWavePlan(1, mapIndex).map((entry) => entry.routeIndex))
    assert.equal(routeIndexes.size, map.entranceRoutes.length, map.name + ' 第一波未覆盖所有入口')
  })
})


test('地图名称使用统一的赛博命名方案', () => {
  assert.deepEqual(MAP_LEVELS.map((map) => map.name), ['H4·霓虹巨构', 'H8·云端禁区', '绀碧·镜像穹顶', '余烬·赤红封锁', '来生·幽灵回路', 'NCPD·钢穹核心', '神舆·黑冰矩阵', '荒坂·终焉天塔'])
})
