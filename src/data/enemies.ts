/**
 * 普通敌人数据 —— 原样迁移自 霓虹防线/gameplay.js 中的 `_0x5e5dc3` 常量。
 */

export type EnemyId = 'gang' | 'riot' | 'ninja' | 'aerostat' | 'devourer'

export interface EnemyDefinition {
  id: EnemyId
  name: string
  hp: number
  speed: number
  armor: number
  reward: number
  attack: number
  image: string
  size: number
  shield?: number
  air?: boolean
  phase?: boolean
  mechanical?: boolean
  network?: boolean
  moveAnimation: string
  trait: string
}

export const ENEMY_TYPES: Record<EnemyId, EnemyDefinition> = {
  gang: {
    id: 'gang',
    name: '帮派义体兵',
    hp: 180,
    speed: 28,
    armor: 0,
    reward: 18,
    attack: 12,
    image: 'assets/enemies/generated-raw-selected/enemy-01-gang-cyborg-base-cutout.png',
    size: 0.038,
    moveAnimation: 'assets/animations/enemies/enemy-01-gang-cyborg-move.webp',
    trait: '无护甲，数量多；佣兵和电弧塔克制',
  },
  riot: {
    id: 'riot',
    name: '防暴镇压机',
    hp: 900,
    speed: 15,
    armor: 0.45,
    reward: 58,
    attack: 22,
    image: 'assets/enemies/generated-raw-selected/enemy-02-riot-mech-base-cutout.png',
    size: 0.052,
    mechanical: true,
    moveAnimation: 'assets/animations/enemies/enemy-02-riot-mech-move.webp',
    trait: '45%物理护甲；背部受到额外25%伤害',
  },
  ninja: {
    id: 'ninja',
    name: '相位忍者',
    hp: 260,
    speed: 40,
    armor: 0,
    reward: 30,
    attack: 18,
    image: 'assets/enemies/generated-raw-selected/enemy-03-phase-ninja-base-cutout.png',
    size: 0.039,
    phase: true,
    moveAnimation: 'assets/animations/enemies/enemy-03-phase-ninja-move.webp',
    trait: '每5秒进入相位1秒；黑客扫描可取消相位',
  },
  aerostat: {
    id: 'aerostat',
    name: '企业浮空艇',
    hp: 500,
    speed: 28,
    armor: 0.2,
    reward: 46,
    attack: 0,
    image: 'assets/enemies/generated-raw-selected/enemy-04-corporate-airship-base-cutout.png',
    size: 0.062,
    air: true,
    moveAnimation: 'assets/animations/enemies/enemy-04-corporate-airship-fly.webp',
    trait: '20%护甲，不受佣兵拦截，只能被远程塔攻击',
  },
  devourer: {
    id: 'devourer',
    name: '数据吞噬者',
    hp: 360,
    shield: 200,
    speed: 24,
    armor: 0,
    reward: 48,
    attack: 16,
    image: 'assets/enemies/generated-raw-selected/enemy-05-data-devourer-base-cutout.png',
    size: 0.048,
    mechanical: true,
    network: true,
    moveAnimation: 'assets/animations/enemies/enemy-05-data-devourer-move.webp',
    trait: '4秒未受攻击恢复护盾；黑客可阻止恢复',
  },
}

export const ENEMY_IDS: EnemyId[] = ['gang', 'riot', 'ninja', 'aerostat', 'devourer']
