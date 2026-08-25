/**
 * 普通敌人数据——原样迁移自《霓虹防线》/gameplay.js 中的 `_0x5e5dc3` 常量。
 */

export type EnemyId = 'gang' | 'riot' | 'ninja' | 'aerostat' | 'devourer' | 'faraday' | 'hijacker' | 'neurohound' | 'matriarch' | 'bonebreaker'

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
  energyResistance?: number
  railVulnerability?: number
  droneEvasion?: number
  enrageThreshold?: number
  enrageSpeedBonus?: number
  healingAura?: number
  healingRadius?: number
  countersTower?: string
  counteredByTower?: string
  moveAnimation: string
  trait: string
}

export const ENEMY_TYPES: Record<EnemyId, EnemyDefinition> = {
  gang: {
    id: 'gang', name: '帮派义体兵', hp: 180, speed: 28, armor: 0, reward: 18, attack: 12,
    image: 'assets/enemies/generated-raw-selected/enemy-01-gang-cyborg-side45-base-cutout.png', size: 0.038,
    moveAnimation: 'assets/animations/enemies/enemy-01-gang-cyborg-side45-move-fixed-size.webp?v=fixed-character-size-20260825',
    trait: '无护甲，数量多；佣兵和电弧塔克制',
  },
  riot: {
    id: 'riot', name: '防暴镇压机', hp: 900, speed: 15, armor: 0.45, reward: 58, attack: 22,
    image: 'assets/enemies/generated-raw-selected/enemy-02-riot-mech-base-cutout.png', size: 0.052, mechanical: true,
    moveAnimation: 'assets/animations/enemies/enemy-02-riot-mech-move-fixed-size.webp?v=fixed-character-size-20260825',
    trait: '45%物理护甲；背部受到额外35%伤害',
  },
  ninja: {
    id: 'ninja', name: '相位忍者', hp: 260, speed: 40, armor: 0, reward: 30, attack: 18,
    image: 'assets/enemies/generated-raw-selected/enemy-03-phase-ninja-base-cutout.png', size: 0.039, phase: true,
    moveAnimation: 'assets/animations/enemies/enemy-03-phase-ninja-move-fixed-size.webp?v=fixed-character-size-20260825',
    trait: '每5秒进入相位1秒；黑客扫描可取消相位',
  },
  aerostat: {
    id: 'aerostat', name: '企业浮空艇', hp: 500, speed: 28, armor: 0.2, reward: 46, attack: 0,
    image: 'assets/enemies/generated-raw-selected/enemy-04-corporate-airship-base-cutout.png', size: 0.062,
    air: true, mechanical: true,
    moveAnimation: 'assets/animations/enemies/enemy-04-corporate-airship-fly.webp',
    trait: '20%护甲，不受佣兵拦截，只能被远程塔攻击',
  },
  devourer: {
    id: 'devourer', name: '数据吞噬者', hp: 360, shield: 200, speed: 24, armor: 0, reward: 48, attack: 16,
    image: 'assets/enemies/generated-raw-selected/enemy-05-data-devourer-base-cutout.png', size: 0.048,
    mechanical: true, network: true,
    moveAnimation: 'assets/animations/enemies/enemy-05-data-devourer-move.webp',
    trait: '4秒未受攻击恢复护盾；黑客可阻止恢复',
  },
  faraday: {
    id: 'faraday', name: '电磁镇暴体', hp: 680, speed: 18, armor: 0.28, reward: 56, attack: 28,
    image: 'assets/enemies/new/enemy-06-electromagnetic-riot.png', size: 0.056, mechanical: true,
    energyResistance: 0.62, railVulnerability: 0.4, countersTower: '电弧塔', counteredByTower: '磁轨狙击',
    moveAnimation: 'assets/animations/enemies/enemy-06-electromagnetic-riot-move.webp?v=generated-crawl-20260825',
    trait: '电磁屏蔽外壳减免62%能量伤害，克制电弧塔；调谐装甲缝被磁轨狙击额外重创',
  },
  hijacker: {
    id: 'hijacker', name: '劫持浮游体', hp: 430, shield: 150, speed: 31, armor: 0.1, reward: 54, attack: 0,
    image: 'assets/enemies/new/enemy-07-hijack-hovercraft.png', size: 0.061,
    air: true, mechanical: true, network: true, droneEvasion: 0.72,
    countersTower: '无人机巢', counteredByTower: '黑客中继',
    moveAnimation: 'assets/animations/enemies/enemy-07-hijack-hovercraft-fly.webp?v=generated-flight-20260825',
    trait: '未被扫描时欺骗无人机链路，减免72%无人机伤害；黑客中继可破解伪装并施加易伤',
  },
  neurohound: {
    id: 'neurohound', name: '神经猎犬', hp: 210, speed: 46, armor: 0.05, reward: 28, attack: 17,
    image: 'assets/enemies/new/enemy-08-neuro-hound.png', size: 0.048,
    enrageThreshold: 0.5, enrageSpeedBonus: 0.45,
    moveAnimation: 'assets/animations/enemies/enemy-08-neuro-hound-move.webp?v=generated-crawl-20260825',
    trait: '痛觉超频：生命低于50%时移动速度提高45%，适合撕开火力间隙',
  },
  matriarch: {
    id: 'matriarch', name: '育质母体', hp: 520, speed: 17, armor: 0.08, reward: 62, attack: 10,
    image: 'assets/enemies/new/enemy-09-tissue-matriarch.png', size: 0.063,
    healingAura: 18, healingRadius: 110,
    moveAnimation: 'assets/animations/enemies/enemy-09-tissue-matriarch-move.webp',
    trait: '组织灌注：每秒为附近生物单位恢复18点生命，同类光环不会叠加',
  },
  bonebreaker: {
    id: 'bonebreaker', name: '骨铠破障兽', hp: 1100, speed: 13, armor: 0.52, reward: 74, attack: 34,
    image: 'assets/enemies/new/enemy-10-bonebreaker.png', size: 0.071,
    energyResistance: -0.35,
    moveAnimation: 'assets/animations/enemies/enemy-10-bonebreaker-move.webp?v=generated-crawl-20260825',
    trait: '再生骨铠提供52%物理护甲；导电脊液使其受到的能量伤害提高35%',
  },
}

export const ENEMY_IDS: EnemyId[] = ['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker', 'neurohound', 'matriarch', 'bonebreaker']

