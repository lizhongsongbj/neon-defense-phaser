/**
 * 网页版关卡地图数据。
 *
 * 坐标使用 0-100 的百分比坐标系；运行时会映射到 1280×800 的逻辑战场。
 * 第一关已经接入新版“超级建筑4号”地图，其余关卡可继续按相同结构扩展。
 */

export interface Point2 {
  x: number
  y: number
}

export type Lane = 'left' | 'right'

export interface TowerSlot extends Point2 {
  scale: number
  rangeScale?: number
}

export interface MapLevel {
  name: string
  image: string
  available: boolean
  slots: TowerSlot[]
  entries: Record<Lane, Point2[]>
  shared: Point2[]
  exits: Record<Lane, Point2[]>
  merge: Point2
  split: Point2
  bases: Record<Lane, Point2>
}

/**
 * 关卡 01：超级建筑4号
 *
 * 左上货运电梯与左下停车层分别进场，在中央社区广场汇合，随后沿唯一主路
 * 抵达右侧居民能源与净水核心。两条 lane 在终点附近只做极小的视觉分离，
 * 逻辑上仍表示同一个基地，以兼容现有双 lane 战斗系统。
 */
export const MAP_LEVELS: MapLevel[] = [
  {
    name: '超级建筑4号',
    image: 'assets/maps/level-01-megabuilding-4-final.jpg',
    available: true,
    slots: [
      { x: 27.1, y: 28.5, scale: 0.068 },
      { x: 24.6, y: 37.1, scale: 0.07 },
      { x: 32.9, y: 36.8, scale: 0.07 },
      { x: 40.7, y: 42.8, scale: 0.073 },
      { x: 56.3, y: 50.1, scale: 0.076, rangeScale: 1.08 },
      { x: 65.1, y: 50, scale: 0.076 },
      { x: 73.9, y: 50, scale: 0.076 },
      { x: 40.7, y: 60.5, scale: 0.078 },
      { x: 23.7, y: 68.1, scale: 0.08 },
      { x: 32.7, y: 68.1, scale: 0.08 },
    ],
    entries: {
      left: [
        { x: 12.5, y: 22 },
        { x: 18, y: 28 },
        { x: 25, y: 35 },
        { x: 30, y: 42 },
        { x: 31, y: 50 },
        { x: 35, y: 56 },
        { x: 43, y: 55 },
      ],
      right: [
        { x: 12, y: 74 },
        { x: 19, y: 69 },
        { x: 27, y: 63 },
        { x: 35, y: 58 },
        { x: 43, y: 55 },
      ],
    },
    shared: [
      { x: 43, y: 55 },
      { x: 51, y: 52 },
      { x: 61, y: 51 },
      { x: 72, y: 50 },
      { x: 82, y: 50 },
      { x: 88, y: 50 },
    ],
    exits: {
      left: [
        { x: 88, y: 50 },
        { x: 92, y: 47 },
        { x: 95, y: 46 },
      ],
      right: [
        { x: 88, y: 50 },
        { x: 92, y: 53 },
        { x: 95, y: 54 },
      ],
    },
    merge: { x: 43, y: 55 },
    split: { x: 88, y: 50 },
    bases: { left: { x: 95, y: 46 }, right: { x: 95, y: 54 } },
  },
]

export const CAMPAIGN_THREAT_LEVELS = [1]
export const CAMPAIGN_STARTING_COINS = [700]
export const CAMPAIGN_WAVE_COUNTS = [5]
export const CAMPAIGN_ENEMY_COUNTS = [2]
export const MAP_SCENE_IDS = ['scene-01-megastructure-h4']
