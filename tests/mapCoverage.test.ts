import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAP_LEVELS } from '../src/data/maps'
import { buildMapGeometry, findNearestRoutePoint, toBoardUnits } from '../src/systems/PathSystem'

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
