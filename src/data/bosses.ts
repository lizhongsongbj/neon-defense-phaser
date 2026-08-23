/**
 * Boss 数据 —— 原样迁移自 霓虹防线/gameplay.js 中的 `_0x390d80` 常量。
 */

export type BossId = 'enforcer' | 'eve'

export interface BossDefinition {
  id: BossId
  name: string
  hp: number
  speed: number
  armor: number
  reward: number
  attack: number
  image: string
  size: number
  mechanical: true
  boss: true
  components?: string[]
  componentHp?: number
  trait: string
}

export const BOSS_TYPES: Record<BossId, BossDefinition> = {
  enforcer: {
    id: 'enforcer',
    name: '执法者·零号',
    hp: 18000,
    speed: 10,
    armor: 0.25,
    reward: 900,
    attack: 80,
    image: 'assets/enemies/boss-01-enforcer-zero-cutout.png',
    size: 0.105,
    mechanical: true,
    boss: true,
    components: ['盾牌', '导弹舱', '推进器'],
    componentHp: 2200,
    trait: '部件独立受损；摧毁后改变护甲、伤害与速度',
  },
  eve: {
    id: 'eve',
    name: '夏娃-9',
    hp: 24000,
    speed: 0,
    armor: 0.12,
    reward: 1200,
    attack: 100,
    image: 'assets/enemies/mother-city-eve-9.png',
    size: 0.115,
    mechanical: true,
    boss: true,
    trait: '三阶段：节点转移、速度12载体、固定核心',
  },
}

/** enforcer 部件中文名 -> 语音事件 id,来自 gameplay.js */
export const ENFORCER_COMPONENT_VOICE_EVENT: Record<string, string> = {
  盾牌: 'shield',
  导弹舱: 'missiles',
  推进器: 'thruster',
}
