/**
 * 路径系统 —— 原样迁移自 霓虹防线/gameplay.js 与 balance-agent.js 中的路径几何逻辑
 * (`_0x393f3b` Catmull-Rom 平滑、`_0x58eed5` 路线分段、`_0x174b07`/`_0x214d8c` 取点、
 * `_0x2bc49d`/`_0x106a0e` 索敌距离)。
 *
 * 坐标约定:
 * - MapLevel 中的原始坐标是百分比(0-100)。
 * - "board units" 是原始坐标 × 10 后的 0-1000 坐标系,敌人的 `distance` 进度条
 *   (0-1000)与地图路线的 metricLength 都基于这个坐标系。
 */

import type { Lane, MapLevel, Point2 } from '../data/maps'
import { RANGE_PROJECTION_Y } from '../data/balance'

/** 路线长度计算时的 y 轴压缩系数,原 gameplay.js 内联常量 `0.62` */
export const ROUTE_LENGTH_Y_COMPRESSION = 0.62

export interface RouteSegment {
  from: Point2
  to: Point2
  start: number
  length: number
}

export interface LaneGeometry {
  segments: RouteSegment[]
  metricLength: number
}

export interface MapGeometry {
  left: LaneGeometry
  right: LaneGeometry
}

export function toBoardUnits(p: Point2): Point2 {
  return { x: p.x * 10, y: p.y * 10 }
}

/** Catmull-Rom 样条平滑,原 `_0x393f3b` / `_0x616234` */
export function catmullRomSmooth(points: Point2[], segmentsPerSpan = 6): Point2[] {
  if (points.length < 3) {
    return points.map((p) => ({ ...p }))
  }
  const out: Point2[] = [{ ...points[0] }]
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    for (let step = 1; step <= segmentsPerSpan; step += 1) {
      const t = step / segmentsPerSpan
      const t2 = t * t
      const t3 = t2 * t
      out.push({
        x:
          (p1.x * 2 +
            (-p0.x + p2.x) * t +
            (p0.x * 2 - p1.x * 5 + p2.x * 4 - p3.x) * t2 +
            (-p0.x + p1.x * 3 - p2.x * 3 + p3.x) * t3) *
          0.5,
        y:
          (p1.y * 2 +
            (-p0.y + p2.y) * t +
            (p0.y * 2 - p1.y * 5 + p2.y * 4 - p3.y) * t2 +
            (-p0.y + p1.y * 3 - p2.y * 3 + p3.y) * t3) *
          0.5,
      })
    }
  }
  return out
}

/** 把一组平滑后的百分比坐标点转换成带累计长度的分段列表,原 `_0x58eed5` / `_0x3f6663` */
export function buildLaneSegments(smoothedPoints: Point2[]): LaneGeometry {
  const segments: RouteSegment[] = []
  let cursor = 0
  for (let i = 1; i < smoothedPoints.length; i += 1) {
    const from = toBoardUnits(smoothedPoints[i - 1])
    const to = toBoardUnits(smoothedPoints[i])
    const length = Math.hypot(to.x - from.x, (to.y - from.y) / ROUTE_LENGTH_Y_COMPRESSION)
    segments.push({ from, to, start: cursor, length })
    cursor += length
  }
  return { segments, metricLength: cursor }
}

/** 组装某条车道(left/right)的完整路线:入场 -> 共享段 -> 出场,原 gameplay.js `_0x5f0af5` 内联逻辑 */
export function buildLaneGeometry(map: MapLevel, lane: Lane): LaneGeometry {
  const raw = [...map.entries[lane], ...map.shared.slice(1), ...map.exits[lane].slice(1)]
  return buildLaneSegments(catmullRomSmooth(raw))
}

/** 组装整张地图两条车道的几何数据,原 `_0x4fd372` */
export function buildMapGeometry(map: MapLevel): MapGeometry {
  return {
    left: buildLaneGeometry(map, 'left'),
    right: buildLaneGeometry(map, 'right'),
  }
}

/** 按 0-1000 的进度取路线上的坐标与方向向量,原 `_0x174b07` / `_0x214d8c` */
export function routePoint(
  geometry: MapGeometry,
  distance: number,
  lane: Lane,
): { x: number; y: number; dx: number; dy: number } {
  const laneGeo = geometry[lane] || geometry.left
  const clamped = Math.max(0, Math.min(1000, distance))
  const metricDistance = (clamped / 1000) * laneGeo.metricLength
  const segment =
    laneGeo.segments.find((seg) => metricDistance <= seg.start + seg.length) ??
    laneGeo.segments[laneGeo.segments.length - 1]
  const t = segment.length ? Math.max(0, Math.min(1, (metricDistance - segment.start) / segment.length)) : 0
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * t,
    y: segment.from.y + (segment.to.y - segment.from.y) * t,
    dx: segment.to.x - segment.from.x,
    dy: segment.to.y - segment.from.y,
  }
}

/** 索敌/射程判定用的 2.5D 压缩距离,原 `_0x2bc49d` / `_0x106a0e` */
export function projectedDistance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) / RANGE_PROJECTION_Y)
}

/** 在整条路线上寻找离给定点最近的位置(用于佣兵集结点初始化),原 `_0x16a94c` / `_0x47254d` */
export function findNearestRoutePoint(
  geometry: MapGeometry,
  point: Point2,
): { x: number; y: number; distance: number; lane: Lane; separation: number } {
  let best: { x: number; y: number; distance: number; lane: Lane; separation: number } | null = null
  const lanes: Lane[] = ['left', 'right']
  for (let distance = 0; distance <= 1000; distance += 5) {
    for (const lane of lanes) {
      const p = routePoint(geometry, distance, lane)
      const separation = projectedDistance(point, p)
      if (!best || separation < best.separation) {
        best = { x: p.x, y: p.y, distance, lane, separation }
      }
    }
  }
  return best!
}
