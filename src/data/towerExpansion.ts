import { TOWER_IDS, TOWER_TYPES, type TowerId } from './towers'

/** 尚未接入战斗循环的三种扩展塔。 */
export type ExpansionTowerId = 'gravity-nail' | 'grey-tide' | 'trajectory-rewriter'
export type AllTowerId = TowerId | ExpansionTowerId
export const EXPANSION_TOWER_IDS: readonly ExpansionTowerId[] = ['gravity-nail', 'grey-tide', 'trajectory-rewriter']
export const GROWTH_TOWER_IDS: readonly AllTowerId[] = [...TOWER_IDS, ...EXPANSION_TOWER_IDS]
export type DamageKind = 'physical' | 'energy'
export type TargetLayer = 'ground' | 'air' | 'both'

export interface ExpansionTowerLevelStats {
  level: 1 | 2 | 3
  range: number
  cooldown: number
  damage: number
  targetCount: number
  effectRadius: number
  /** 控制/位移等特殊参数；0 表示该级没有该效果。 */
  slow: number
  slowDuration: number
  pathDisplacement: number
  armorShred: number
  energyResistanceShred: number
  effectDuration: number
  echoRatio: number
  echoDelay: number
}

export interface ExpansionTowerDefinition {
  id: ExpansionTowerId
  name: string
  role: string
  accent: string
  image: string
  buildCost: number
  damageKind: DamageKind
  targetLayer: TargetLayer
  researchDamageApplies: boolean
  researchRangeApplies: boolean
  levels: readonly ExpansionTowerLevelStats[]
}

/**
 * 三种扩展塔 1–3 级平衡草案。
 * 所有百分比均以 0–1 保存；路径位移和射程使用现有战场单位。
 */
export const EXPANSION_TOWERS: readonly ExpansionTowerDefinition[] = [
  {
    id: 'gravity-nail',
    name: '重力钉',
    role: '聚怪牵引 / 飞行偏转',
    accent: '#a978ff',
    image: 'assets/towers/new-concepts/gravity-nail-level-1.png',
    buildCost: 125,
    damageKind: 'energy',
    targetLayer: 'both',
    researchDamageApplies: true,
    researchRangeApplies: true,
    levels: [
      { level: 1, range: 135, cooldown: 1.3, damage: 30, targetCount: 3, effectRadius: 38, slow: 0.12, slowDuration: 1.4, pathDisplacement: 7, armorShred: 0, energyResistanceShred: 0, effectDuration: 1.4, echoRatio: 0, echoDelay: 0 },
      { level: 2, range: 150, cooldown: 1.2, damage: 42, targetCount: 4, effectRadius: 43, slow: 0.16, slowDuration: 1.7, pathDisplacement: 10, armorShred: 0, energyResistanceShred: 0, effectDuration: 1.7, echoRatio: 0, echoDelay: 0 },
      { level: 3, range: 165, cooldown: 1.1, damage: 58, targetCount: 5, effectRadius: 48, slow: 0.2, slowDuration: 2, pathDisplacement: 13, armorShred: 0, energyResistanceShred: 0, effectDuration: 2, echoRatio: 0, echoDelay: 0 },
    ],
  },
  {
    id: 'grey-tide',
    name: '灰潮解构站',
    role: '群体解构 / 护甲削弱',
    accent: '#74e69a',
    image: 'assets/towers/new-concepts/grey-tide-level-1.png',
    buildCost: 120,
    damageKind: 'energy',
    targetLayer: 'ground',
    researchDamageApplies: true,
    researchRangeApplies: true,
    levels: [
      { level: 1, range: 125, cooldown: 1.45, damage: 22, targetCount: 4, effectRadius: 42, slow: 0, slowDuration: 0, pathDisplacement: 0, armorShred: 0.08, energyResistanceShred: 0, effectDuration: 3.5, echoRatio: 0, echoDelay: 0 },
      { level: 2, range: 140, cooldown: 1.3, damage: 31, targetCount: 5, effectRadius: 47, slow: 0, slowDuration: 0, pathDisplacement: 0, armorShred: 0.12, energyResistanceShred: 0.04, effectDuration: 4, echoRatio: 0, echoDelay: 0 },
      { level: 3, range: 155, cooldown: 1.15, damage: 43, targetCount: 6, effectRadius: 52, slow: 0, slowDuration: 0, pathDisplacement: 0, armorShred: 0.16, energyResistanceShred: 0.08, effectDuration: 4.5, echoRatio: 0, echoDelay: 0 },
    ],
  },
  {
    id: 'trajectory-rewriter',
    name: '轨迹回写器',
    role: '路径回滚 / 延迟复写',
    accent: '#58cfff',
    image: 'assets/towers/new-concepts/trajectory-rewriter-level-1.png',
    buildCost: 145,
    damageKind: 'energy',
    targetLayer: 'both',
    researchDamageApplies: true,
    researchRangeApplies: true,
    levels: [
      { level: 1, range: 155, cooldown: 1.85, damage: 44, targetCount: 1, effectRadius: 0, slow: 0, slowDuration: 0, pathDisplacement: 10, armorShred: 0, energyResistanceShred: 0, effectDuration: 2.5, echoRatio: 0.3, echoDelay: 0.8 },
      { level: 2, range: 172, cooldown: 1.7, damage: 61, targetCount: 1, effectRadius: 0, slow: 0, slowDuration: 0, pathDisplacement: 14, armorShred: 0, energyResistanceShred: 0, effectDuration: 3, echoRatio: 0.4, echoDelay: 0.7 },
      { level: 3, range: 190, cooldown: 1.55, damage: 82, targetCount: 2, effectRadius: 28, slow: 0, slowDuration: 0, pathDisplacement: 18, armorShred: 0, energyResistanceShred: 0, effectDuration: 3.5, echoRatio: 0.5, echoDelay: 0.6 },
    ],
  },
] as const

export const ALL_TOWER_TYPES = [
  ...TOWER_TYPES,
  ...EXPANSION_TOWERS.map((tower) => ({
    id: tower.id,
    name: tower.name,
    cost: tower.buildCost,
    accent: tower.accent,
    role: tower.role,
    image: tower.image,
  })),
] as const

export const ALL_TOWER_TYPE_BY_ID: Record<AllTowerId, (typeof ALL_TOWER_TYPES)[number]> = Object.fromEntries(
  ALL_TOWER_TYPES.map((tower) => [tower.id, tower]),
) as Record<AllTowerId, (typeof ALL_TOWER_TYPES)[number]>

export const ALL_TOWER_ACCENT_COLOR: Record<AllTowerId, string> = Object.fromEntries(
  ALL_TOWER_TYPES.map((tower) => [tower.id, tower.accent]),
) as Record<AllTowerId, string>

export function isExpansionTowerId(id: AllTowerId): id is ExpansionTowerId {
  return EXPANSION_TOWER_IDS.includes(id as ExpansionTowerId)
}

export interface Tier4BranchStats {
  range: number
  cooldown: number
  damage: number
  targetCount: number
  effectRadius: number
  armorPenetration: number
  chainDistance: number
  chainCount: number
  unitCount: number
  unitHealth: number
  blockRange: number
  respawn: number
  slow: number
  vulnerability: number
  duration: number
  flyingBonus: number
  pursuit: number
  pathDisplacement: number
  armorShred: number
  energyResistanceShred: number
  echoRatio: number
  echoDelay: number
  executeThreshold: number
  bossExecuteThreshold: number
  bonusCoinsChance: number
  bonusCoins: number
}

export interface Tier4BranchDefinition {
  id: string
  towerId: AllTowerId
  towerName: string
  branch: 'A' | 'B'
  name: string
  role: string
  upgradeCost: number
  damageKind: DamageKind
  targetLayer: TargetLayer
  researchDamageApplies: boolean
  researchRangeApplies: boolean
  stats: Tier4BranchStats
  notes: readonly string[]
}

const tier4 = (
  definition: Omit<Tier4BranchDefinition, 'researchDamageApplies' | 'researchRangeApplies'>,
): Tier4BranchDefinition => ({ ...definition, researchDamageApplies: true, researchRangeApplies: true })

/** 8 种塔 × 2 条第四级路线，共 16 个分支。 */
export const TIER4_BRANCHES: readonly Tier4BranchDefinition[] = [
  tier4({ id:'rail-sky-judicator', towerId:'mag-rail-sniper', towerName:'磁轨狙击', branch:'A', name:'天穹裁决者', role:'超远程制空 / 双目标贯穿', upgradeCost:230, damageKind:'physical', targetLayer:'both', stats:{ range:300,cooldown:1.55,damage:255,targetCount:2,effectRadius:0,armorPenetration:.5,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:0,vulnerability:0,duration:0,flyingBonus:.3,pursuit:0,pathDisplacement:0,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['同一直线最多贯穿2个目标，第二目标承受70%伤害。','对空目标额外造成30%伤害；盲区缩小为45。'] }),
  tier4({ id:'rail-quantum-citybreaker', towerId:'mag-rail-sniper', towerName:'磁轨狙击', branch:'B', name:'量子贯城炮', role:'重型单发 / Boss部件破坏', upgradeCost:245, damageKind:'physical', targetLayer:'both', stats:{ range:275,cooldown:2.35,damage:390,targetCount:4,effectRadius:0,armorPenetration:.75,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:0,vulnerability:0,duration:0,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['沿射线最多命中4个目标，伤害依次为100%/80%/65%/50%。','盲区65；Boss部件分流比例由35%提高到50%。'] }),
  tier4({ id:'arc-neon-storm-core', towerId:'arc-neon', towerName:'电弧塔', branch:'A', name:'霓虹雷暴核', role:'五目标高频连锁', upgradeCost:185, damageKind:'energy', targetLayer:'ground', stats:{ range:168,cooldown:.85,damage:82,targetCount:5,effectRadius:0,armorPenetration:0,chainDistance:78,chainCount:5,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:0,vulnerability:0,duration:0,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['五跳伤害为82/65/50/38/28，总计263。','潮湿目标仍获得20%增伤。'] }),
  tier4({ id:'arc-superconductor-tide', towerId:'arc-neon', towerName:'电弧塔', branch:'B', name:'超导潮汐塔', role:'控制 / 能量队增伤', upgradeCost:180, damageKind:'energy', targetLayer:'ground', stats:{ range:178,cooldown:1,damage:72,targetCount:3,effectRadius:0,armorPenetration:0,chainDistance:72,chainCount:3,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:.28,vulnerability:.18,duration:3.2,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:0,energyResistanceShred:.12,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['三跳伤害72/58/44，总计174。','潮湿增伤提高到40%；命中施加28%减速、18%易伤和12%能量抗性削弱。'] }),
  tier4({ id:'merc-chrome-fortress', towerId:'street-mercenary', towerName:'街头兵营', branch:'A', name:'铬钢不破营', role:'三人重装拦截', upgradeCost:170, damageKind:'physical', targetLayer:'ground', stats:{ range:150,cooldown:.85,damage:42,targetCount:3,effectRadius:0,armorPenetration:.15,chainDistance:0,chainCount:0,unitCount:3,unitHealth:480,blockRange:40,respawn:6,slow:0,vulnerability:0,duration:0,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['3名佣兵，每人480生命并获得25%承伤减免。','每名佣兵独立拦截；攻击拥有15%穿甲。'] }),
  tier4({ id:'merc-night-blades', towerId:'street-mercenary', towerName:'街头兵营', branch:'B', name:'血刃夜行队', role:'高速突击 / 背刺处决', upgradeCost:175, damageKind:'physical', targetLayer:'ground', stats:{ range:160,cooldown:.55,damage:65,targetCount:2,effectRadius:0,armorPenetration:.25,chainDistance:0,chainCount:0,unitCount:2,unitHealth:340,blockRange:36,respawn:5,slow:0,vulnerability:0,duration:0,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:.12,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['2名佣兵；可在60距离内突进到目标。','从目标后方攻击额外×1.35；非Boss生命低于12%时处决。'] }),
  tier4({ id:'hacker-zero-day-control', towerId:'hacker-relay', towerName:'黑客中继', branch:'A', name:'零日统御台', role:'大范围持续控制', upgradeCost:190, damageKind:'energy', targetLayer:'both', stats:{ range:205,cooldown:1.9,damage:30,targetCount:99,effectRadius:0,armorPenetration:0,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:.28,vulnerability:.2,duration:4,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['命中射程内全部目标，标记持续4秒。','联网机械目标额外瘫痪0.8秒；Boss仅承受0.25秒。'] }),
  tier4({ id:'hacker-black-ice-breaker', towerId:'hacker-relay', towerName:'黑客中继', branch:'B', name:'黑冰崩解器', role:'三目标攻击型入侵', upgradeCost:195, damageKind:'energy', targetLayer:'both', stats:{ range:185,cooldown:1.35,damage:70,targetCount:3,effectRadius:0,armorPenetration:0,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:.12,vulnerability:.24,duration:2.8,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:0,energyResistanceShred:.16,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['优先护盾最高的3个目标；额外灼烧90点护盾。','施加24%易伤和16%能量抗性削弱。'] }),
  tier4({ id:'drone-queen-air-carrier', towerId:'drone-hive', towerName:'无人机巢', branch:'A', name:'蜂后制空母巢', role:'三机高速制空', upgradeCost:225, damageKind:'physical', targetLayer:'both', stats:{ range:245,cooldown:.58,damage:58,targetCount:1,effectRadius:0,armorPenetration:.15,chainDistance:0,chainCount:0,unitCount:3,unitHealth:0,blockRange:0,respawn:0,slow:0,vulnerability:0,duration:0,flyingBonus:.75,pursuit:55,pathDisplacement:0,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['3架无人机每轮各攻击一次。','对空+75%，追击距离+55，拥有15%穿甲。'] }),
  tier4({ id:'drone-swarm-annihilator', towerId:'drone-hive', towerName:'无人机巢', branch:'B', name:'蜂群湮灭工厂', role:'双机爆破范围伤害', upgradeCost:215, damageKind:'physical', targetLayer:'both', stats:{ range:225,cooldown:1.05,damage:92,targetCount:2,effectRadius:48,armorPenetration:.25,chainDistance:0,chainCount:0,unitCount:2,unitHealth:0,blockRange:0,respawn:0,slow:0,vulnerability:0,duration:0,flyingBonus:.25,pursuit:35,pathDisplacement:0,armorShred:.12,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['2架爆破无人机；主目标满伤害，半径48内溅射65%。','爆炸施加12%护甲削弱，持续3秒。'] }),
  tier4({ id:'gravity-deep-well-lockdown', towerId:'gravity-nail', towerName:'重力钉', branch:'A', name:'深井封锁', role:'大范围聚怪 / 路径回拉', upgradeCost:200, damageKind:'energy', targetLayer:'both', stats:{ range:182,cooldown:1,damage:82,targetCount:7,effectRadius:62,armorPenetration:0,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:.34,vulnerability:0,duration:2.8,flyingBonus:0,pursuit:0,pathDisplacement:18,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['最多牵引7个目标，路径回拉18；Boss位移仅生效40%。','施加34%减速2.8秒。'] }),
  tier4({ id:'gravity-sky-deflection', towerId:'gravity-nail', towerName:'重力钉', branch:'B', name:'天幕偏转', role:'制空偏转 / 高速脉冲', upgradeCost:195, damageKind:'energy', targetLayer:'both', stats:{ range:210,cooldown:.78,damage:68,targetCount:4,effectRadius:44,armorPenetration:0,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:.18,vulnerability:0,duration:1.5,flyingBonus:.55,pursuit:0,pathDisplacement:12,armorShred:0,energyResistanceShred:0,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['对空+55%；飞行目标路径回拉12，地面目标回拉6。','30%概率使飞行敌人偏转至另一条路线；Boss免疫换线。'] }),
  tier4({ id:'grey-armor-eater-swarm', towerId:'grey-tide', towerName:'灰潮解构站', branch:'A', name:'噬甲集群', role:'双抗削弱 / 群体增伤', upgradeCost:185, damageKind:'energy', targetLayer:'ground', stats:{ range:172,cooldown:1.02,damage:58,targetCount:8,effectRadius:62,armorPenetration:0,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:0,vulnerability:.12,duration:5,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:.28,energyResistanceShred:.18,echoRatio:0,echoDelay:0,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['削弱28%护甲与18%能量抗性，持续5秒；最低均不低于0。','额外施加12%易伤；对Boss削弱数值按60%生效。'] }),
  tier4({ id:'grey-scavenger-protocol', towerId:'grey-tide', towerName:'灰潮解构站', branch:'B', name:'清道夫协议', role:'残血清除 / 战场回收', upgradeCost:190, damageKind:'energy', targetLayer:'ground', stats:{ range:182,cooldown:1.22,damage:76,targetCount:5,effectRadius:55,armorPenetration:0,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:0,vulnerability:0,duration:4,flyingBonus:0,pursuit:0,pathDisplacement:0,armorShred:.2,energyResistanceShred:.1,echoRatio:0,echoDelay:0,executeThreshold:.14,bossExecuteThreshold:.04,bonusCoinsChance:.25,bonusCoins:1}, notes:['非Boss低于14%生命、Boss低于4%生命时处决。','被本塔命中的敌人死亡时25%概率额外获得1金币；每个敌人最多触发一次。'] }),
  tier4({ id:'trajectory-rollback-node', towerId:'trajectory-rewriter', towerName:'轨迹回写器', branch:'A', name:'回滚节点', role:'多目标回滚 / 伤害复写', upgradeCost:220, damageKind:'energy', targetLayer:'both', stats:{ range:215,cooldown:1.42,damage:108,targetCount:3,effectRadius:38,armorPenetration:0,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:.2,vulnerability:0,duration:3.8,flyingBonus:0,pursuit:0,pathDisplacement:28,armorShred:0,energyResistanceShred:0,echoRatio:.6,echoDelay:.5,executeThreshold:0,bossExecuteThreshold:0,bonusCoinsChance:0,bonusCoins:0}, notes:['最多3个目标，各回退28路径单位；Boss位移按35%生效。','0.5秒后复写60%本次伤害，复写不再次触发连携。'] }),
  tier4({ id:'trajectory-breakpoint-execution', towerId:'trajectory-rewriter', towerName:'轨迹回写器', branch:'B', name:'断点处决', role:'单体标记 / 高额处决', upgradeCost:230, damageKind:'energy', targetLayer:'both', stats:{ range:235,cooldown:2.05,damage:188,targetCount:1,effectRadius:0,armorPenetration:0,chainDistance:0,chainCount:0,unitCount:0,unitHealth:0,blockRange:0,respawn:0,slow:0,vulnerability:.22,duration:4.5,flyingBonus:0,pursuit:0,pathDisplacement:16,armorShred:0,energyResistanceShred:.2,echoRatio:.35,echoDelay:.4,executeThreshold:.18,bossExecuteThreshold:.06,bonusCoinsChance:0,bonusCoins:0}, notes:['标记目标4.5秒并施加22%易伤、20%能量抗性削弱。','非Boss低于18%、Boss低于6%生命时处决；否则0.4秒后复写35%伤害。'] }),
] as const

export interface SynergyDefinition {
  id: string
  tier: 'normal' | 'ultimate'
  name: string
  towers: readonly AllTowerId[]
  triggerWindow: number
  internalCooldown: number
  damageKind: DamageKind
  damage: number
  damageRatio: number
  effectRadius: number
  targetCount: number
  slow: number
  vulnerability: number
  duration: number
  armorPenetration: number
  pathDisplacement: number
  executeThreshold: number
  bossExecuteThreshold: number
  notes: readonly string[]
}

/** 4 种普通连携 + 2 种终极连携。普通连携恰好覆盖 8 种塔且不重复。 */
export const SYNERGY_ATTACKS: readonly SynergyDefinition[] = [
  { id:'overload-collapse', tier:'normal', name:'超载坍缩', towers:['arc-neon','gravity-nail'], triggerWindow:1.2, internalCooldown:4, damageKind:'energy', damage:95, damageRatio:.45, effectRadius:52, targetCount:5, slow:.22, vulnerability:0, duration:2.2, armorPenetration:0, pathDisplacement:10, executeThreshold:0, bossExecuteThreshold:0, notes:['重力钉命中后1.2秒内被电弧命中触发。','额外伤害取95与电弧该跳伤害45%中的较高值；最多5目标。'] },
  { id:'zero-day-penetration', tier:'normal', name:'零日穿透', towers:['hacker-relay','mag-rail-sniper'], triggerWindow:2.5, internalCooldown:5, damageKind:'physical', damage:120, damageRatio:.25, effectRadius:0, targetCount:1, slow:0, vulnerability:.08, duration:3, armorPenetration:.25, pathDisplacement:0, executeThreshold:0, bossExecuteThreshold:0, notes:['黑客标记目标在2.5秒内被磁轨命中触发。','磁轨本次额外获得25%穿甲并追加“120或本次伤害25%的较高值”。'] },
  { id:'chrome-street-harvest', tier:'normal', name:'铬街收割', towers:['street-mercenary','grey-tide'], triggerWindow:3, internalCooldown:3, damageKind:'physical', damage:0, damageRatio:.35, effectRadius:0, targetCount:1, slow:0, vulnerability:0, duration:3, armorPenetration:.15, pathDisplacement:0, executeThreshold:.08, bossExecuteThreshold:0, notes:['被灰潮解构且正被佣兵拦截的目标触发。','佣兵伤害+35%、额外15%穿甲；非Boss低于8%生命时处决。'] },
  { id:'swarm-echo', tier:'normal', name:'蜂群回声', towers:['drone-hive','trajectory-rewriter'], triggerWindow:2, internalCooldown:2.5, damageKind:'energy', damage:0, damageRatio:.5, effectRadius:34, targetCount:3, slow:0, vulnerability:0, duration:0, armorPenetration:0, pathDisplacement:6, executeThreshold:0, bossExecuteThreshold:0, notes:['轨迹回写标记目标在2秒内受到无人机攻击时触发。','0.45秒后复写无人机该轮总伤害的50%，半径34内最多3目标。'] },
  { id:'city-blackout-protocol', tier:'ultimate', name:'城市断电协议', towers:['arc-neon','gravity-nail','hacker-relay'], triggerWindow:3, internalCooldown:18, damageKind:'energy', damage:340, damageRatio:0, effectRadius:96, targetCount:12, slow:.55, vulnerability:.25, duration:5, armorPenetration:0, pathDisplacement:24, executeThreshold:0, bossExecuteThreshold:0, notes:['同一区域3秒内依次获得重力、电弧、黑客三类标记时触发。','最多12目标；340能量伤害、回拉24、减速55%、易伤25%，持续5秒；Boss控制按35%生效。'] },
  { id:'breakpoint-hunt', tier:'ultimate', name:'断点猎杀', towers:['mag-rail-sniper','drone-hive','trajectory-rewriter'], triggerWindow:3.5, internalCooldown:24, damageKind:'physical', damage:680, damageRatio:0, effectRadius:42, targetCount:4, slow:0, vulnerability:0, duration:0, armorPenetration:.7, pathDisplacement:18, executeThreshold:.1, bossExecuteThreshold:.03, notes:['回写标记目标被无人机锁定后3.5秒内遭磁轨命中时触发。','主目标680物理伤害、70%穿甲；半径42内至多3个次目标承受45%；非Boss10%/Boss3%生命阈值处决。'] },
] as const

export const EXPANSION_ECONOMY_RULES = {
  sellRate: 0.6,
  sellCapRate: 0.8,
  tier4SellRefundRate: 0.35,
  /** 第四级升级费计入 spent，但总返还仍受基础建造费×0.8限制。 */
  tier4RefundStillUsesBaseCap: true,
  synergyCoinCost: 0,
  ultimateGlobalCooldown: false,
} as const

export const EXPANSION_BALANCE_RULES = {
  maxTowerLevel: 4,
  tier4BranchesPerTower: 2,
  normalSynergyCount: 4,
  ultimateSynergyCount: 2,
  controlBossMultiplier: 0.35,
  displacementBossMultiplier: 0.35,
  minimumArmor: 0,
  minimumEnergyResistance: 0,
  researchAffectsDirectDamage: true,
  researchAffectsRange: true,
  researchAffectsFixedControlValues: false,
  repeatedEchoCanTriggerSynergy: false,
  sameSynergyCanRefreshDuringCooldown: false,
} as const

export const EXPANSION_TOWER_BY_ID = Object.fromEntries(EXPANSION_TOWERS.map((tower) => [tower.id, tower])) as Record<ExpansionTowerId, ExpansionTowerDefinition>
export const TIER4_BRANCH_BY_ID = Object.fromEntries(TIER4_BRANCHES.map((branch) => [branch.id, branch])) as Record<string, Tier4BranchDefinition>
