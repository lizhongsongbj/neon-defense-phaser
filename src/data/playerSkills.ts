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
    description: '指定区域引爆高强度电磁脉冲，停滞敌军、破坏护盾并施加强减速。',
    effect: '大范围削减 25% 护盾；普通敌军停滞 2 秒并减速 35%，精英控制减半，Boss 减速 15%。',
    cooldowns: [24, 20, 16],
    costs: [3, 2, 3],
  },
  {
    id: 'quantum-firewall',
    name: '量子防火墙',
    code: 'QUANTUM FIREWALL',
    icon: '▰',
    accent: '#ff3ea5',
    description: '在路径上部署持续 8 秒的高亮数据屏障，强制回滚穿越者。',
    effect: '最多拦截 12 个敌军：强力击退、短暂减速并降低攻击力；精英与 Boss 效果衰减。',
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
