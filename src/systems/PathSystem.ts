/**
 * 路径系统 —— 地图道路中心线、路线几何和射程投影。
 */

import type { Lane, MapLevel, Point2 } from '../data/maps'
import { RANGE_PROJECTION_Y } from '../data/balance'

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
  /** All entrance routes, in the same order as MapLevel.entranceRoutes. */
  routes: LaneGeometry[]
}

export function toBoardUnits(p: Point2): Point2 {
  return { x: p.x * 10, y: p.y * 10 }
}

export function catmullRomSmooth(points: Point2[], segmentsPerSpan = 6): Point2[] {
  if (points.length < 3) return points.map((p) => ({ ...p }))
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
        x: (p1.x * 2 + (-p0.x + p2.x) * t + (p0.x * 2 - p1.x * 5 + p2.x * 4 - p3.x) * t2 + (-p0.x + p1.x * 3 - p2.x * 3 + p3.x) * t3) * 0.5,
        y: (p1.y * 2 + (-p0.y + p2.y) * t + (p0.y * 2 - p1.y * 5 + p2.y * 4 - p3.y) * t2 + (-p0.y + p1.y * 3 - p2.y * 3 + p3.y) * t3) * 0.5,
      })
    }
  }
  return out
}

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

export function buildLaneGeometry(map: MapLevel, lane: Lane): LaneGeometry {
  const calibratedRoute = map.routes?.[lane]
  const raw = calibratedRoute?.length
    ? calibratedRoute
    : [...map.entries[lane], ...map.shared.slice(1), ...map.exits[lane].slice(1)]
  return buildLaneSegments(catmullRomSmooth(raw, 8))
}

export function buildMapGeometry(map: MapLevel): MapGeometry {
  const routes = map.entranceRoutes?.length
    ? map.entranceRoutes.map((points) => buildLaneSegments(catmullRomSmooth(points, 8)))
    : [buildLaneGeometry(map, 'left'), buildLaneGeometry(map, 'right')]
  return {
    left: routes[0] ?? buildLaneGeometry(map, 'left'),
    right: routes[1] ?? routes[0] ?? buildLaneGeometry(map, 'right'),
    routes,
  }
}

export function routePointByIndex(
  geometry: MapGeometry,
  distance: number,
  routeIndex: number,
): { x: number; y: number; dx: number; dy: number } {
  const laneGeo = geometry.routes[routeIndex] ?? geometry.left
  const clamped = Math.max(0, Math.min(1000, distance))
  const metricDistance = (clamped / 1000) * laneGeo.metricLength
  const segment = laneGeo.segments.find((seg) => metricDistance <= seg.start + seg.length) ?? laneGeo.segments[laneGeo.segments.length - 1]
  const t = segment.length ? Math.max(0, Math.min(1, (metricDistance - segment.start) / segment.length)) : 0
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * t,
    y: segment.from.y + (segment.to.y - segment.from.y) * t,
    dx: segment.to.x - segment.from.x,
    dy: segment.to.y - segment.from.y,
  }
}

export function routePoint(
  geometry: MapGeometry,
  distance: number,
  lane: Lane,
): { x: number; y: number; dx: number; dy: number } {
  return routePointByIndex(geometry, distance, lane === 'left' ? 0 : 1)
}

export function projectedDistance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) / RANGE_PROJECTION_Y)
}

export function findNearestRoutePoint(
  geometry: MapGeometry,
  point: Point2,
): { x: number; y: number; distance: number; lane: Lane; separation: number } {
  let best: { x: number; y: number; distance: number; lane: Lane; separation: number } | null = null
  for (let distance = 0; distance <= 1000; distance += 5) {
    for (let routeIndex = 0; routeIndex < geometry.routes.length; routeIndex += 1) {
      const p = routePointByIndex(geometry, distance, routeIndex)
      const separation = projectedDistance(point, p)
      if (!best || separation < best.separation) {
        best = { x: p.x, y: p.y, distance, lane: routeIndex === 1 ? 'right' : 'left', separation }
      }
    }
  }
  return best!
}
