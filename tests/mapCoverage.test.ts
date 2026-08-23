import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAP_LEVELS } from '../src/data/maps'
import { buildMapGeometry, findNearestRoutePoint, toBoardUnits } from '../src/systems/PathSystem'

/**
 * 移植自 霓虹防线/map-coverage.test.js:验证每张地图的每个塔位都能被
 * 最低射程覆盖到路线(220 为磁轨狙击台 1 级射程,105/175 为近战/通用判定阈值)。
 */
test('每张地图的塔位都在最低射程内可达', () => {
  for (const map of MAP_LEVELS) {
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
