/**
 * 塔楼数据 —— 原样迁移自 霓虹防线/index.html (towerTypes) 与
 * 霓虹防线/gameplay.js 中的 towerCombat 常量(反混淆前变量名 _0x3f0ab1)。
 * 数值、颜色、图片路径均未改动,只是拆分成两张表 + TypeScript 类型。
 */

export type TowerId =
  | 'mag-rail-sniper'
  | 'arc-neon'
  | 'street-mercenary'
  | 'hacker-relay'
  | 'drone-hive'

export const TOWER_IDS: TowerId[] = [
  'arc-neon',
  'drone-hive',
  'hacker-relay',
  'mag-rail-sniper',
  'street-mercenary',
]

export interface TowerVisualDefinition {
  id: TowerId
  name: string
  cost: number
  accent: string
  role: string
  image: string
  attackAnimation: string
}

/** 建造顺序与原 index.html 中 towerTypes 数组顺序一致 */
export const TOWER_TYPES: TowerVisualDefinition[] = [
  {
    id: 'arc-neon',
    name: '电弧塔',
    cost: 110,
    accent: '#20f4e6',
    role: '连锁清场 / 潮湿增伤',
    image: 'assets/towers/generated-raw-selected/tower-02-arc-neon-base-cutout-1.png',
    attackAnimation: 'assets/animations/towers/tower-02-arc-neon-attack.webp',
  },
  {
    id: 'drone-hive',
    name: '无人机巢',
    cost: 135,
    accent: '#e8ffff',
    role: '空中拦截 / 远程追击',
    image: 'assets/towers/generated-raw-selected/tower-05-drone-hive-base-new-drones.png',
    attackAnimation: 'assets/animations/towers/tower-05-drone-hive-attack.webp',
  },
  {
    id: 'hacker-relay',
    name: '黑客中继',
    cost: 115,
    accent: '#79ff9e',
    role: '揭露隐身 / 护盾干扰',
    image: 'assets/towers/generated-raw-selected/tower-04-hacker-relay-base-cutout.png',
    attackAnimation: 'assets/animations/towers/tower-04-hacker-relay-attack.webp',
  },
  {
    id: 'mag-rail-sniper',
    name: '磁轨狙击',
    cost: 130,
    accent: '#34c9ff',
    role: '重甲击破 / 超远射程',
    image: 'assets/towers/generated-raw-selected/tower-01-magnetic-rail-base-cutout.png',
    attackAnimation: 'assets/animations/towers/tower-01-magnetic-rail-attack.webp',
  },
  {
    id: 'street-mercenary',
    name: '街头兵营',
    cost: 100,
    accent: '#c99245',
    role: '地面拦截 / 阵线维持',
    image: 'assets/towers/generated-raw-selected/tower-03-mercenary-outpost-base-cutout.png',
    attackAnimation: 'assets/animations/towers/tower-03-mercenary-outpost-attack.webp',
  },
]

export const TOWER_TYPE_BY_ID: Record<TowerId, TowerVisualDefinition> = Object.fromEntries(
  TOWER_TYPES.map((t) => [t.id, t]),
) as Record<TowerId, TowerVisualDefinition>

export interface MagRailSniperCombat {
  ranges: [number, number, number]
  cooldown: number
  damage: number
  armorPenetration: number
  blindSpot: number
  damageScale: [number, number, number]
}

export interface ArcNeonCombat {
  ranges: [number, number, number]
  cooldown: number
  chainDamage: [number, number, number]
  chainDistance: number
  wetBonus: number
  damageScale: [number, number, number]
}

export interface StreetMercenaryCombat {
  ranges: [number, number, number]
  mercenaryCount: number
  mercenaryHealth: number
  damage: number
  cooldown: number
  blockRange: number
  respawn: number
  healthScale: [number, number, number]
  damageScale: [number, number, number]
}

export interface HackerRelayCombat {
  ranges: [number, number, number]
  cooldown: number
  slow: number
  vulnerability: number
  duration: number
  damage: number
}

export interface DroneHiveCombat {
  ranges: [number, number, number]
  cooldown: number
  drones: number
  damage: number
  flyingBonus: number
  pursuit: number
  damageScale: [number, number, number]
}

export interface TowerCombatMap {
  'mag-rail-sniper': MagRailSniperCombat
  'arc-neon': ArcNeonCombat
  'street-mercenary': StreetMercenaryCombat
  'hacker-relay': HackerRelayCombat
  'drone-hive': DroneHiveCombat
}

/** 原 gameplay.js `_0x3f0ab1` */
export const TOWER_COMBAT: TowerCombatMap = {
  'mag-rail-sniper': {
    ranges: [220, 240, 260],
    cooldown: 1.7,
    damage: 100,
    armorPenetration: 0.35,
    blindSpot: 55,
    damageScale: [1, 1.38, 1.82],
  },
  'arc-neon': {
    ranges: [120, 134, 148],
    cooldown: 1.05,
    chainDamage: [38, 30, 22],
    chainDistance: 65,
    wetBonus: 0.2,
    damageScale: [1, 1.32, 1.68],
  },
  'street-mercenary': {
    ranges: [105, 118, 132],
    mercenaryCount: 2,
    mercenaryHealth: 190,
    damage: 19,
    cooldown: 0.9,
    blockRange: 32,
    respawn: 8,
    healthScale: [1, 1.28, 1.6],
    damageScale: [1, 1.3, 1.65],
  },
  'hacker-relay': {
    ranges: [145, 160, 175],
    cooldown: 2.4,
    slow: 0.22,
    vulnerability: 0.16,
    duration: 3.2,
    damage: 7,
  },
  'drone-hive': {
    ranges: [175, 195, 215],
    cooldown: 0.68,
    drones: 2,
    damage: 28,
    flyingBonus: 0.45,
    pursuit: 30,
    damageScale: [1, 1.3, 1.68],
  },
}

/** 原 gameplay.js `_0x4ec351`,用于射程指示圈颜色 */
export const TOWER_ACCENT_COLOR: Record<TowerId, string> = {
  'mag-rail-sniper': '#34c9ff',
  'arc-neon': '#20f4e6',
  'street-mercenary': '#c99245',
  'hacker-relay': '#79ff9e',
  'drone-hive': '#e8ffff',
}
