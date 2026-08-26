export type PlayerSkillId = 'pulse-overload' | 'quantum-firewall'

export interface PlayerSkillDefinition {
  id: PlayerSkillId
  name: string
  code: string
  icon: string
  accent: string
  description: string
  effect: string
  cooldowns: readonly [number, number, number]
  costs: readonly [number, number, number]
}

export const PLAYER_SKILLS: readonly PlayerSkillDefinition[] = [
  {
    id: 'pulse-overload',
    name: '脉冲过载',
    code: 'PULSE OVERRIDE',
    icon: '⌁',
    accent: '#20f4e6',
    description: '指定区域引爆毁伤型电磁脉冲，清空护盾并对范围内敌军造成高额能量伤害。',
    effect: '清空范围内敌军护盾；普通敌军承受 120 点加 28% 最大生命伤害，精英和 Boss 受到衰减伤害。',
    cooldowns: [24, 20, 16],
    costs: [3, 2, 3],
  },
  {
    id: 'quantum-firewall',
    name: '量子防火墙',
    code: 'QUANTUM FIREWALL',
    icon: '▰',
    accent: '#ff3ea5',
    description: '在路径上部署持续 10 秒的巨型数据屏障，以强烈故障特效回滚穿越者。',
    effect: '最多拦截 16 个敌军：造成能量伤害、强力回滚、减速并压制攻击；精英与 Boss 效果衰减。',
    cooldowns: [28, 23, 18],
    costs: [4, 2, 3],
  },
] as const

export const PLAYER_SKILL_BY_ID = Object.fromEntries(
  PLAYER_SKILLS.map((skill) => [skill.id, skill]),
) as Record<PlayerSkillId, PlayerSkillDefinition>

export const MAX_PLAYER_SKILL_LEVEL = 3

export function playerSkillCooldown(id: PlayerSkillId, level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_PLAYER_SKILL_LEVEL, Math.round(level)))
  return PLAYER_SKILL_BY_ID[id].cooldowns[safeLevel - 1]
}

export function playerSkillUpgradeCost(id: PlayerSkillId, currentLevel: number): number {
  const safeLevel = Math.max(0, Math.min(MAX_PLAYER_SKILL_LEVEL - 1, Math.round(currentLevel)))
  return PLAYER_SKILL_BY_ID[id].costs[safeLevel]
}
