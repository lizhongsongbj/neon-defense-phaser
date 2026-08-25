/**
 * 新版塔防关卡地图数据。
 *
 * 坐标统一使用 0-100 的图片百分比坐标；运行时映射到 1280×800 战场。
 * `routes` 是从地图道路中心线逐点标定的两条实际行军路线，`slots` 则对应
 * 美术图中所有圆形塔基的中心。保留 entries/shared/exits 字段用于旧存档兼容。
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
  routes: Record<Lane, Point2[]>
  entries: Record<Lane, Point2[]>
  shared: Point2[]
  exits: Record<Lane, Point2[]>
  merge: Point2
  split: Point2
  bases: Record<Lane, Point2>
}

interface MapDefinition {
  name: string
  image: string
  slots: Array<[number, number, number?]>
  routes: Record<Lane, Point2[]>
}

function createMap({ name, image, slots, routes }: MapDefinition): MapLevel {
  const leftEnd = routes.left[routes.left.length - 1]
  const rightEnd = routes.right[routes.right.length - 1]
  return {
    name,
    image,
    available: true,
    slots: slots.map(([x, y, rangeScale]) => ({ x, y, scale: 0.056, ...(rangeScale ? { rangeScale } : {}) })),
    routes,
    // 兼容旧版地图结构；新版 PathSystem 会优先使用 routes。
    entries: routes,
    shared: [{ ...leftEnd }],
    exits: { left: [{ ...leftEnd }], right: [{ ...rightEnd }] },
    merge: { ...leftEnd },
    split: { ...rightEnd },
    bases: { left: { ...leftEnd }, right: { ...rightEnd } },
  }
}

export const MAP_LEVELS: MapLevel[] = [
  createMap({
    name: '熔炉双廊',
    image: 'assets/maps/map-01.png',
    slots: [
      [35, 16], [56.5, 17], [34.5, 35], [57.8, 38], [76.8, 34],
      [32, 59.5], [56, 61], [79, 60], [27.5, 79], [58.5, 84],
    ],
    routes: {
      left: [
        { x: 0, y: 21 }, { x: 7, y: 23 }, { x: 12, y: 29 }, { x: 19, y: 33 },
        { x: 26, y: 33 }, { x: 33, y: 29 }, { x: 41, y: 24 }, { x: 49, y: 27 },
        { x: 55, y: 31 }, { x: 62, y: 30 }, { x: 67, y: 34 }, { x: 68, y: 43 },
        { x: 72, y: 49 }, { x: 78, y: 52 }, { x: 85, y: 50 }, { x: 92, y: 45 },
      ],
      right: [
        { x: 0, y: 75 }, { x: 7, y: 81 }, { x: 14, y: 82 }, { x: 21, y: 78 },
        { x: 25, y: 71 }, { x: 33, y: 68 }, { x: 41, y: 68 }, { x: 49, y: 72 },
        { x: 57, y: 72 }, { x: 64, y: 67 }, { x: 67, y: 59 }, { x: 72, y: 51 },
        { x: 78, y: 52 }, { x: 85, y: 50 }, { x: 92, y: 45 },
      ],
    },
  }),
  createMap({
    name: '霓虹庭园',
    image: 'assets/maps/map-02.jpg',
    slots: [
      [29.5, 23], [45, 23], [58, 23], [33, 43], [45, 43],
      [58, 44], [78, 45], [26.5, 69], [52, 75], [72, 82],
    ],
    routes: {
      left: [
        { x: 17, y: 23 }, { x: 21, y: 28 }, { x: 29, y: 31 }, { x: 39, y: 30 },
        { x: 49, y: 29 }, { x: 59, y: 30 }, { x: 65, y: 31 }, { x: 68, y: 37 },
        { x: 69, y: 47 }, { x: 73, y: 52 }, { x: 80, y: 54 }, { x: 91, y: 54 },
      ],
      right: [
        { x: 11, y: 80 }, { x: 18, y: 83 }, { x: 27, y: 81 }, { x: 36, y: 77 },
        { x: 44, y: 81 }, { x: 51, y: 84 }, { x: 59, y: 82 }, { x: 67, y: 79 },
        { x: 72, y: 72 }, { x: 74, y: 63 }, { x: 78, y: 56 }, { x: 84, y: 54 },
        { x: 91, y: 54 },
      ],
    },
  }),
  createMap({
    name: '白金水庭',
    image: 'assets/maps/map-03.png',
    slots: [
      [32, 22], [40, 24], [48, 24], [67.5, 36], [76, 36], [25, 59],
      [41, 58], [68, 57], [76, 57], [22.5, 77], [39, 76], [48, 75],
    ],
    routes: {
      left: [
        { x: 12, y: 20 }, { x: 14, y: 27 }, { x: 18, y: 33 }, { x: 25, y: 37 },
        { x: 34, y: 38 }, { x: 44, y: 37 }, { x: 51, y: 35 }, { x: 57, y: 39 },
        { x: 63, y: 43 }, { x: 72, y: 43 }, { x: 82, y: 44 }, { x: 89, y: 41 },
        { x: 93, y: 38 },
      ],
      right: [
        { x: 8, y: 72 }, { x: 14, y: 72 }, { x: 20, y: 68 }, { x: 28, y: 66 },
        { x: 37, y: 66 }, { x: 47, y: 64 }, { x: 54, y: 61 }, { x: 59, y: 55 },
        { x: 63, y: 50 }, { x: 71, y: 50 }, { x: 82, y: 52 }, { x: 89, y: 47 },
        { x: 93, y: 40 },
      ],
    },
  }),
  createMap({
    name: '紫渊环道',
    image: 'assets/maps/map-04.png',
    slots: [
      [33, 13], [51, 13], [27.5, 20], [55.5, 22], [67, 36], [28, 44],
      [49, 45], [60, 45], [76.8, 51], [29.5, 63], [44, 61], [79, 69],
      [65, 74], [52, 79],
    ],
    routes: {
      left: [
        { x: 9, y: 12 }, { x: 11, y: 18 }, { x: 18, y: 20 }, { x: 24, y: 27 },
        { x: 31, y: 28 }, { x: 38, y: 23 }, { x: 44, y: 19 }, { x: 49, y: 22 },
        { x: 52, y: 31 }, { x: 57, y: 38 }, { x: 62, y: 43 }, { x: 64, y: 51 },
        { x: 66, y: 57 }, { x: 73, y: 61 }, { x: 81, y: 61 }, { x: 89, y: 56 },
        { x: 94, y: 51 },
      ],
      right: [
        { x: 10, y: 78 }, { x: 13, y: 84 }, { x: 20, y: 86 }, { x: 27, y: 82 },
        { x: 34, y: 88 }, { x: 41, y: 87 }, { x: 46, y: 78 }, { x: 52, y: 72 },
        { x: 59, y: 70 }, { x: 63, y: 65 }, { x: 66, y: 58 }, { x: 73, y: 61 },
        { x: 81, y: 61 }, { x: 89, y: 56 }, { x: 94, y: 51 },
      ],
    },
  }),
  createMap({
    name: '星河交汇站',
    image: 'assets/maps/map-05.png',
    slots: [
      [23, 16], [39, 24], [25.5, 34], [75, 28], [70, 35], [19, 47],
      [27, 46], [44, 50], [56, 48], [22.5, 63], [48, 75], [60, 83], [76, 78],
    ],
    routes: {
      left: [
        { x: 8, y: 18 }, { x: 12, y: 24 }, { x: 20, y: 27 }, { x: 28, y: 29 },
        { x: 34, y: 35 }, { x: 40, y: 39 }, { x: 47, y: 42 }, { x: 50, y: 49 },
        { x: 54, y: 57 }, { x: 61, y: 56 }, { x: 66, y: 49 }, { x: 71, y: 43 },
        { x: 78, y: 38 }, { x: 83, y: 31 }, { x: 86, y: 24 },
      ],
      right: [
        { x: 0, y: 58 }, { x: 8, y: 60 }, { x: 15, y: 56 }, { x: 22, y: 52 },
        { x: 31, y: 52 }, { x: 40, y: 57 }, { x: 49, y: 57 }, { x: 52, y: 64 },
        { x: 55, y: 71 }, { x: 63, y: 76 }, { x: 70, y: 81 }, { x: 76, y: 87 },
        { x: 79, y: 94 },
      ],
    },
  }),
  createMap({
    name: '幽晶峡谷',
    image: 'assets/maps/map-06.png',
    slots: [
      [30, 24], [39, 23], [45, 26], [52, 35], [67, 37], [60, 42], [28, 44],
      [68, 48], [55, 52], [41, 54], [52, 65], [28, 68], [46, 69], [55, 73],
    ],
    routes: {
      left: [
        { x: 25, y: 22 }, { x: 27, y: 27 }, { x: 31, y: 30 }, { x: 35, y: 27 },
        { x: 38, y: 21 }, { x: 43, y: 20 }, { x: 47, y: 25 }, { x: 48, y: 33 },
        { x: 49, y: 39 }, { x: 55, y: 43 }, { x: 59, y: 48 }, { x: 64, y: 45 },
        { x: 68, y: 43 }, { x: 72, y: 49 }, { x: 77, y: 50 }, { x: 80, y: 46 },
      ],
      right: [
        { x: 24, y: 66 }, { x: 28, y: 71 }, { x: 35, y: 73 }, { x: 42, y: 74 },
        { x: 49, y: 72 }, { x: 54, y: 67 }, { x: 56, y: 60 }, { x: 55, y: 55 },
        { x: 59, y: 50 }, { x: 64, y: 45 }, { x: 68, y: 43 }, { x: 72, y: 49 },
        { x: 77, y: 50 }, { x: 80, y: 46 },
      ],
    },
  }),
  createMap({
    name: '环城汇流区',
    image: 'assets/maps/map-07.png',
    slots: [
      [52, 15], [65, 12], [76, 15], [24, 28], [68, 27], [40, 34], [45, 46],
      [68, 46], [24, 56, 1.35], [39, 66], [55, 65], [88, 65], [70, 74], [31, 84], [60, 84],
    ],
    routes: {
      left: [
        { x: 9, y: 12 }, { x: 13, y: 18 }, { x: 21, y: 22 }, { x: 30, y: 22 },
        { x: 38, y: 22 }, { x: 45, y: 28 }, { x: 52, y: 31 }, { x: 59, y: 28 },
        { x: 65, y: 22 }, { x: 71, y: 19 }, { x: 77, y: 23 }, { x: 81, y: 31 },
        { x: 81, y: 40 }, { x: 84, y: 48 }, { x: 91, y: 54 },
      ],
      right: [
        { x: 10, y: 77 }, { x: 15, y: 84 }, { x: 23, y: 89 }, { x: 31, y: 91 },
        { x: 40, y: 88 }, { x: 47, y: 82 }, { x: 53, y: 75 }, { x: 58, y: 69 },
        { x: 61, y: 64 }, { x: 58, y: 59 }, { x: 61, y: 54 }, { x: 68, y: 57 },
        { x: 76, y: 60 }, { x: 84, y: 58 }, { x: 91, y: 54 },
      ],
    },
  }),
  createMap({
    name: '暗夜三岔防线',
    image: 'assets/maps/map-08.png',
    slots: [
      [30, 17], [40, 17], [47.5, 20], [68.5, 30], [23.5, 37.5], [73, 38],
      [60.5, 44], [42.5, 50, 1.25], [72.5, 58], [57.5, 61.5], [33, 65.5],
      [44.5, 65], [70, 68.5], [50.5, 82],
    ],
    routes: {
      left: [
        { x: 9, y: 12 }, { x: 13, y: 19 }, { x: 20, y: 23 }, { x: 28, y: 25 },
        { x: 36, y: 24 }, { x: 44, y: 26 }, { x: 52, y: 29 }, { x: 60, y: 32 },
        { x: 65, y: 38 }, { x: 67, y: 45 }, { x: 67, y: 51 }, { x: 74, y: 48 },
        { x: 82, y: 51 }, { x: 90, y: 53 }, { x: 95, y: 50 },
      ],
      right: [
        { x: 8, y: 75 }, { x: 13, y: 81 }, { x: 21, y: 84 }, { x: 29, y: 80 },
        { x: 37, y: 76 }, { x: 45, y: 78 }, { x: 53, y: 76 }, { x: 60, y: 72 },
        { x: 65, y: 66 }, { x: 67, y: 59 }, { x: 67, y: 51 }, { x: 74, y: 48 },
        { x: 82, y: 51 }, { x: 90, y: 53 }, { x: 95, y: 50 },
      ],
    },
  }),
]

export const CAMPAIGN_THREAT_LEVELS = [1, 1.08, 1.16, 1.24, 1.34, 1.44, 1.56, 1.7]
export const CAMPAIGN_STARTING_COINS = [700, 725, 750, 825, 900, 1000, 1125, 1250]
export const CAMPAIGN_WAVE_COUNTS = [5, 5, 6, 6, 7, 7, 8, 8]
export const CAMPAIGN_ENEMY_COUNTS = [2, 4, 5, 6, 8, 9, 10, 10]
export const MAP_SCENE_IDS = [
  'scene-01-megastructure-h4',
  'scene-02-underground-mercenary-bar',
  'scene-03-neon-market-braindance-club',
  'scene-04-megatower-cloud-club',
  'scene-05-corporate-hotel-siege',
  'scene-06-corporate-plaza-ai-core',
  'scene-04-megatower-cloud-club',
  'scene-05-corporate-hotel-siege',
]
