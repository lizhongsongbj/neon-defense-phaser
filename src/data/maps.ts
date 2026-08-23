/**
 * 地图数据 —— 原样迁移自 霓虹防线/index.html 中的 `mapLevels` 常量。
 * 坐标单位为百分比(0-100),与原版一致,渲染时按战场尺寸换算。
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
  slots: TowerSlot[]
  entries: Record<Lane, Point2[]>
  shared: Point2[]
  exits: Record<Lane, Point2[]>
  merge: Point2
  split: Point2
  bases: Record<Lane, Point2>
}

export const MAP_LEVELS: MapLevel[] = [
  {
    name: 'H4',
    image: 'assets/maps/scene-01-h4-v3.png',
    slots: [
      { x: 36.5, y: 16, scale: 0.066 },
      { x: 55.1, y: 15, scale: 0.065, rangeScale: 1.3 },
      { x: 25.6, y: 23.1, scale: 0.068 },
      { x: 79, y: 24.3, scale: 0.069, rangeScale: 1.03 },
      { x: 10.6, y: 40.1, scale: 0.074 },
      { x: 60.5, y: 38, scale: 0.073 },
      { x: 26, y: 53, scale: 0.079 },
      { x: 84.9, y: 60.5, scale: 0.081 },
      { x: 36.9, y: 77.2, scale: 0.087 },
      { x: 71.6, y: 73.8, scale: 0.086 },
    ],
    entries: {
      left: [
        { x: 3.5, y: 19 },
        { x: 8, y: 26 },
        { x: 20, y: 29 },
        { x: 31, y: 31 },
        { x: 36, y: 41 },
        { x: 41, y: 51 },
      ],
      right: [
        { x: 3.5, y: 66 },
        { x: 7, y: 80 },
        { x: 14, y: 81 },
        { x: 22, y: 74 },
        { x: 31, y: 64 },
        { x: 37, y: 55 },
        { x: 41, y: 51 },
      ],
    },
    shared: [
      { x: 41, y: 51 },
      { x: 53, y: 52 },
      { x: 63, y: 54 },
      { x: 69, y: 49 },
      { x: 71, y: 41 },
      { x: 78, y: 35 },
      { x: 90, y: 31 },
    ],
    exits: {
      left: [
        { x: 90, y: 31 },
        { x: 92, y: 29 },
        { x: 94, y: 27.8 },
      ],
      right: [
        { x: 90, y: 31 },
        { x: 92, y: 32.5 },
        { x: 94, y: 34.2 },
      ],
    },
    merge: { x: 41, y: 51 },
    split: { x: 90, y: 31 },
    bases: { left: { x: 94, y: 27.8 }, right: { x: 94, y: 34.2 } },
  },
  {
    name: '来生酒吧',
    image: 'assets/maps/scene-02-afterlife-bar-v3.png',
    slots: [
      { x: 24, y: 22.3, scale: 0.068 },
      { x: 30.6, y: 26.8, scale: 0.069 },
      { x: 50, y: 19.2, scale: 0.067 },
      { x: 58.5, y: 19.2, scale: 0.067 },
      { x: 70.7, y: 31.4, scale: 0.071 },
      { x: 44.9, y: 54.7, scale: 0.079 },
      { x: 34, y: 67.7, scale: 0.084 },
      { x: 27, y: 75.2, scale: 0.086 },
      { x: 19.9, y: 84.5, scale: 0.09 },
      { x: 57.4, y: 79.9, scale: 0.088 },
      { x: 65, y: 78.7, scale: 0.088 },
    ],
    entries: {
      left: [
        { x: 3, y: 16 },
        { x: 10, y: 27 },
        { x: 24, y: 34 },
        { x: 37, y: 39 },
        { x: 40, y: 35 },
        { x: 42, y: 26 },
        { x: 52, y: 24 },
        { x: 61, y: 30 },
        { x: 65, y: 40 },
        { x: 67, y: 50 },
        { x: 72, y: 54 },
        { x: 77, y: 55 },
      ],
      right: [
        { x: 3, y: 82 },
        { x: 10, y: 73 },
        { x: 21, y: 61 },
        { x: 29, y: 51 },
        { x: 35, y: 48 },
        { x: 40, y: 52 },
        { x: 44, y: 63 },
        { x: 52, y: 69 },
        { x: 61, y: 72 },
        { x: 69, y: 68 },
        { x: 77, y: 55 },
      ],
    },
    shared: [
      { x: 77, y: 55 },
      { x: 81, y: 53 },
      { x: 84, y: 48 },
    ],
    exits: {
      left: [
        { x: 84, y: 48 },
        { x: 85.5, y: 46 },
        { x: 87, y: 44.5 },
      ],
      right: [
        { x: 84, y: 48 },
        { x: 85.5, y: 50 },
        { x: 87, y: 51.5 },
      ],
    },
    merge: { x: 77, y: 55 },
    split: { x: 84, y: 48 },
    bases: { left: { x: 87, y: 44.5 }, right: { x: 87, y: 51.5 } },
  },
  {
    name: '丽姿酒吧',
    image: 'assets/maps/scene-03-lizzies-bar-v3.png',
    slots: [
      { x: 17.4, y: 15.8, scale: 0.066 },
      { x: 24, y: 17, scale: 0.066 },
      { x: 29.5, y: 19.5, scale: 0.067 },
      { x: 35, y: 21.5, scale: 0.068 },
      { x: 40.5, y: 22.8, scale: 0.068 },
      { x: 28.2, y: 46, scale: 0.076 },
      { x: 19.7, y: 73.5, scale: 0.086 },
      { x: 26, y: 70.7, scale: 0.085 },
      { x: 35.3, y: 66.4, scale: 0.083 },
      { x: 68.4, y: 59.1, scale: 0.081 },
      { x: 76.8, y: 56.5, scale: 0.08 },
    ],
    entries: {
      left: [
        { x: 4, y: 16 },
        { x: 17, y: 21 },
        { x: 31, y: 26 },
        { x: 39, y: 30 },
        { x: 41, y: 37 },
        { x: 41, y: 47 },
        { x: 44, y: 53 },
      ],
      right: [
        { x: 2, y: 66 },
        { x: 13, y: 65 },
        { x: 25, y: 61 },
        { x: 38, y: 57 },
        { x: 44, y: 53 },
      ],
    },
    shared: [
      { x: 44, y: 53 },
      { x: 53, y: 54 },
      { x: 60, y: 56 },
      { x: 67, y: 50 },
      { x: 79, y: 44 },
      { x: 87, y: 39 },
    ],
    exits: {
      left: [
        { x: 87, y: 39 },
        { x: 88.5, y: 37 },
        { x: 90.5, y: 35.5 },
      ],
      right: [
        { x: 87, y: 39 },
        { x: 88.5, y: 41 },
        { x: 90.5, y: 42.5 },
      ],
    },
    merge: { x: 44, y: 53 },
    split: { x: 87, y: 39 },
    bases: { left: { x: 90.5, y: 35.5 }, right: { x: 90.5, y: 42.5 } },
  },
  {
    name: 'H8 与云顶',
    image: 'assets/maps/scene-04-h8-clouds-v3.png',
    slots: [
      { x: 19, y: 13.5, scale: 0.065 },
      { x: 25, y: 15, scale: 0.065 },
      { x: 31, y: 17.5, scale: 0.066 },
      { x: 18.5, y: 37.5, scale: 0.073 },
      { x: 18.7, y: 45.5, scale: 0.076 },
      { x: 61.2, y: 37.8, scale: 0.073 },
      { x: 61.5, y: 45.7, scale: 0.076 },
      { x: 19, y: 76, scale: 0.087 },
      { x: 25, y: 75.5, scale: 0.086 },
      { x: 31.8, y: 75.5, scale: 0.086 },
    ],
    entries: {
      left: [
        { x: 6, y: 16 },
        { x: 18, y: 18 },
        { x: 31, y: 21 },
        { x: 36, y: 31 },
        { x: 40, y: 44 },
        { x: 43, y: 51 },
      ],
      right: [
        { x: 6, y: 67 },
        { x: 18, y: 67 },
        { x: 31, y: 67 },
        { x: 37, y: 59 },
        { x: 43, y: 51 },
      ],
    },
    shared: [
      { x: 43, y: 51 },
      { x: 58, y: 51 },
      { x: 73, y: 51 },
      { x: 88, y: 51 },
    ],
    exits: {
      left: [
        { x: 88, y: 51 },
        { x: 90, y: 49 },
        { x: 92.5, y: 47.5 },
      ],
      right: [
        { x: 88, y: 51 },
        { x: 90, y: 53 },
        { x: 92.5, y: 54.5 },
      ],
    },
    merge: { x: 43, y: 51 },
    split: { x: 88, y: 51 },
    bases: { left: { x: 92.5, y: 47.5 }, right: { x: 92.5, y: 54.5 } },
  },
  {
    name: '绀碧大厦',
    image: 'assets/maps/scene-05-konpeki-plaza-v3.png',
    slots: [
      { x: 34, y: 18, scale: 0.066 },
      { x: 41, y: 19, scale: 0.067 },
      { x: 43, y: 26.5, scale: 0.069 },
      { x: 64, y: 26.7, scale: 0.069 },
      { x: 71, y: 28, scale: 0.07 },
      { x: 76, y: 35, scale: 0.072 },
      { x: 24.5, y: 42.5, scale: 0.075 },
      { x: 43.5, y: 42, scale: 0.075 },
      { x: 66.5, y: 56, scale: 0.08 },
      { x: 56, y: 64, scale: 0.082 },
      { x: 72.5, y: 62.5, scale: 0.082 },
      { x: 41, y: 67, scale: 0.083 },
      { x: 29.5, y: 80.5, scale: 0.088 },
    ],
    entries: {
      left: [
        { x: 1, y: 19 },
        { x: 9, y: 21 },
        { x: 21, y: 28 },
        { x: 30, y: 36 },
        { x: 34, y: 48 },
        { x: 38, y: 53 },
      ],
      right: [
        { x: 5, y: 81 },
        { x: 13, y: 72 },
        { x: 22, y: 65 },
        { x: 29, y: 57 },
        { x: 38, y: 53 },
      ],
    },
    shared: [
      { x: 38, y: 53 },
      { x: 47, y: 52 },
      { x: 52, y: 46 },
      { x: 58, y: 37 },
      { x: 67, y: 37 },
      { x: 75, y: 44 },
      { x: 82, y: 46 },
      { x: 89, y: 41 },
    ],
    exits: {
      left: [
        { x: 89, y: 41 },
        { x: 90.5, y: 39 },
        { x: 92.5, y: 37.5 },
      ],
      right: [
        { x: 89, y: 41 },
        { x: 90.5, y: 43 },
        { x: 92.5, y: 44.5 },
      ],
    },
    merge: { x: 38, y: 53 },
    split: { x: 89, y: 41 },
    bases: { left: { x: 92.5, y: 37.5 }, right: { x: 92.5, y: 44.5 } },
  },
  {
    name: '神舆',
    image: 'assets/maps/scene-06-mikoshi-v3.png',
    slots: [
      { x: 29.7, y: 21.6, scale: 0.068 },
      { x: 26.5, y: 28.7, scale: 0.07 },
      { x: 16.6, y: 48.3, scale: 0.077 },
      { x: 57, y: 23.4, scale: 0.068, rangeScale: 1.12 },
      { x: 61.4, y: 30, scale: 0.071 },
      { x: 67, y: 35, scale: 0.072 },
      { x: 61.4, y: 61, scale: 0.081, rangeScale: 1.18 },
      { x: 69.5, y: 64, scale: 0.082 },
      { x: 26.3, y: 80, scale: 0.088 },
      { x: 36.8, y: 80, scale: 0.088, rangeScale: 1.16 },
      { x: 46.5, y: 80, scale: 0.088, rangeScale: 1.26 },
      { x: 56, y: 80, scale: 0.088, rangeScale: 1.26 },
    ],
    entries: {
      left: [
        { x: 3, y: 10 },
        { x: 10, y: 17 },
        { x: 19, y: 28 },
        { x: 26, y: 39 },
        { x: 32, y: 46 },
        { x: 37, y: 50 },
      ],
      right: [
        { x: 1, y: 76 },
        { x: 11, y: 64 },
        { x: 20, y: 59 },
        { x: 28, y: 54 },
        { x: 37, y: 50 },
      ],
    },
    shared: [
      { x: 37, y: 50 },
      { x: 52, y: 50 },
      { x: 67, y: 50 },
      { x: 84, y: 50 },
      { x: 90, y: 50 },
    ],
    exits: {
      left: [
        { x: 90, y: 50 },
        { x: 91.5, y: 48 },
        { x: 93.5, y: 46.5 },
      ],
      right: [
        { x: 90, y: 50 },
        { x: 91.5, y: 52 },
        { x: 93.5, y: 53.5 },
      ],
    },
    merge: { x: 37, y: 50 },
    split: { x: 90, y: 50 },
    bases: { left: { x: 93.5, y: 46.5 }, right: { x: 93.5, y: 53.5 } },
  },
]

/** 原 index.html `campaignThreatLevels`,仅用于战役中心 UI 展示 */
export const CAMPAIGN_THREAT_LEVELS = [1, 1.18, 1.38, 1.62, 1.55, 1.85]

/** 原 index.html `campaignStartingCoins` / gameplay.js balanceRuntime.startingCoins */
export const CAMPAIGN_STARTING_COINS = [700, 725, 750, 850, 1100, 1500]

/** 原 index.html `campaignWaveCounts` */
export const CAMPAIGN_WAVE_COUNTS = [5, 6, 7, 8, 9, 10]

/** 原 index.html `campaignEnemyCounts` */
export const CAMPAIGN_ENEMY_COUNTS = [2, 3, 4, 5, 5, 5]

/** 原 music-system.mjs 里 mapIndex -> sceneId 映射数组,用于 BGM 选曲 */
export const MAP_SCENE_IDS = [
  'scene-01-megastructure-h4',
  'scene-02-underground-mercenary-bar',
  'scene-03-neon-market-braindance-club',
  'scene-04-megatower-cloud-club',
  'scene-05-corporate-hotel-siege',
  'scene-06-corporate-plaza-ai-core',
]
