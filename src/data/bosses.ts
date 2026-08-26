/** Boss combat definitions, phase thresholds, component durability, and ability cadence. */

export type BossId = 'enforcer' | 'eve'
export type BossStage = 1 | 2 | 3
export type BossAbilityId =
  | 'shield-wave'
  | 'overdrive-salvo'
  | 'core-burst'
  | 'node-lock'
  | 'carrier-emp'
  | 'core-pulse'

export interface BossStageDefinition {
  stage: BossStage
  name: string
  hpThreshold: number
  enterCondition: string
  armor: number
  speed: number
  attack: number
  energyResistance: number
  railVulnerability: number
  ability: BossAbilityId
  abilityName: string
  abilityCooldown: number
  abilityDescription: string
  transitionShieldRatio?: number
}

export interface BossDefinition {
  id: BossId
  name: string
  hp: number
  shield?: number
  speed: number
  armor: number
  energyResistance: number
  railVulnerability: number
  reward: number
  attack: number
  baseDamage: number
  image: string
  size: number
  mechanical: true
  boss: true
  components?: string[]
  componentHp?: number | Record<string, number>
  trait: string
  stages: readonly BossStageDefinition[]
}

export const BOSS_TYPES: Record<BossId, BossDefinition> = {
  enforcer: {
    id: 'enforcer',
    name: '亚当·重锤',
    hp: 22000,
    speed: 9.5,
    armor: 0.36,
    energyResistance: 0.12,
    railVulnerability: 0,
    reward: 1250,
    attack: 85,
    baseDamage: 4,
    image: 'assets/enemies/adam-smasher.png',
    size: 0.105,
    mechanical: true,
    boss: true,
    components: ['盾牌', '导弹舱', '推进器'],
    componentHp: { 盾牌: 4200, 导弹舱: 3200, 推进器: 2800 },
    trait: '三种战斗形态依次切换：堡垒镇压负责正面防御，攻城超载合并导弹火力与赤红推进，核心暴露进入最终决战。',
    stages: [
      { stage: 1, name: '堡垒镇压', hpThreshold: 1, enterCondition: '初始形态；重型封闭装甲与胸前六边形能量盾保持完整，生命高于70%', armor: 0.36, speed: 9.5, attack: 85, energyResistance: 0.12, railVulnerability: 0, ability: 'shield-wave', abilityName: '镇压冲击', abilityCooldown: 8, abilityDescription: '释放近距离装甲冲击，使附近防御塔的下一次攻击延迟0.8秒。' },
      { stage: 2, name: '攻城超载', hpThreshold: 0.7, enterCondition: '盾牌被摧毁、任一部件失效，或生命降至70%；双肩导弹舱与手臂重武器展开，全身进入赤红能量过载并启动推进冲锋', armor: 0.17, speed: 13.2, attack: 135, energyResistance: 0.01, railVulnerability: 0.14, ability: 'overdrive-salvo', abilityName: '赤红攻城弹幕', abilityCooldown: 5.8, abilityDescription: '导弹与手臂重武器同时压制三座防御塔，并借助推进器进入高速突进。' },
      { stage: 3, name: '核心暴露', hpThreshold: 0.22, enterCondition: '全部部件被摧毁，或生命降至22%；大面积装甲破损，胸口反应堆完全暴露', armor: 0.04, speed: 11, attack: 165, energyResistance: -0.15, railVulnerability: 0.3, ability: 'core-burst', abilityName: '核心爆震', abilityCooldown: 4.5, abilityDescription: '核心周期性爆震，短暂扰乱全部防御塔；自身承受更多能量与磁轨伤害。' },
    ],
  },
  eve: {
    id: 'eve',
    name: '夏娃-9',
    hp: 30000,
    shield: 3600,
    speed: 0,
    armor: 0.18,
    energyResistance: 0.32,
    railVulnerability: 0,
    reward: 1600,
    attack: 70,
    baseDamage: 5,
    image: 'assets/enemies/mother-city-eve-9-clean-no-white.png',
    size: 0.115,
    mechanical: true,
    boss: true,
    trait: '节点入侵、机械载体与固定核心三种形态依次切换；最终核心会持续脉冲基地。',
    stages: [
      { stage: 1, name: '节点入侵', hpThreshold: 1, enterCondition: '初始形态；生命高于70%', armor: 0.18, speed: 0, attack: 70, energyResistance: 0.32, railVulnerability: 0, ability: 'node-lock', abilityName: '节点劫持', abilityCooldown: 4.5, abilityDescription: '向前迁移45路径单位，并锁定两座非黑客塔2.2秒。' },
      { stage: 2, name: '载体迁移', hpThreshold: 0.7, enterCondition: '生命降至70%', armor: 0.28, speed: 14, attack: 105, energyResistance: 0.12, railVulnerability: 0.08, ability: 'carrier-emp', abilityName: '载体EMP', abilityCooldown: 6.5, abilityDescription: '获得相当于最大生命9%的过渡护盾，并周期性延迟全场塔楼攻击。', transitionShieldRatio: 0.09 },
      { stage: 3, name: '固定核心', hpThreshold: 0.35, enterCondition: '生命降至35%', armor: 0.05, speed: 0, attack: 150, energyResistance: -0.18, railVulnerability: 0.25, ability: 'core-pulse', abilityName: '核心脉冲', abilityCooldown: 5.5, abilityDescription: '在基地前展开固定核心，每次脉冲直接造成1点基地伤害。' },
    ],
  },
}

export function bossStageTextureKey(id: BossId, stage: number): string {
  return `boss-${id}-stage-${stage}`
}

export function bossStageDefinition(id: BossId, stage: number): BossStageDefinition {
  const stages = BOSS_TYPES[id].stages
  return stages.find((entry) => entry.stage === stage) ?? stages[stages.length - 1]
}

export function bossComponentHp(definition: BossDefinition, component: string): number {
  if (typeof definition.componentHp === 'number') return definition.componentHp
  return definition.componentHp?.[component] ?? 0
}

export const ENFORCER_COMPONENT_VOICE_EVENT: Record<string, string> = {
  盾牌: 'shield',
  导弹舱: 'missiles',
  推进器: 'thruster',
}
