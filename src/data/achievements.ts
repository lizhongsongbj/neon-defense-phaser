export type AchievementCategory = 'campaign' | 'tower' | 'challenge' | 'hidden'

export interface AchievementDefinition {
  id: string
  name: string
  category: AchievementCategory
  condition: string
  hidden?: boolean
  target?: number
  progressKey?: string
}

export const ACHIEVEMENT_CATEGORY_LABEL: Record<AchievementCategory, string> = {
  campaign: '战役行动',
  tower: '塔楼专精',
  challenge: '综合挑战',
  hidden: '隐藏记录',
}

/**
 * 所有成就只依赖当前游戏已经存在的事件：建塔、攻击、击杀、Boss 部件摧毁和通关。
 * 不再引用未接入运行时的扩展塔、特殊设施或不存在的敌人，因此每一项都能在实际游戏中完成。
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'campaign-map-01', name: '灯还亮着', category: 'campaign', condition: '完成“H4·霓虹巨构”。' },
  { id: 'campaign-map-02', name: '云层之上', category: 'campaign', condition: '完成“H8·云端禁区”。' },
  { id: 'campaign-map-03', name: '请走正门', category: 'campaign', condition: '完成“绀碧·镜像穹顶”。' },
  { id: 'campaign-map-04', name: '全城通缉', category: 'campaign', condition: '完成“余烬·赤红封锁”。' },
  { id: 'campaign-map-05', name: '来生传奇', category: 'campaign', condition: '完成“来生·幽灵回路”。' },
  { id: 'campaign-map-06', name: '执法终止', category: 'campaign', condition: '完成“NCPD·钢穹核心”。' },
  { id: 'campaign-map-07', name: '永久静默', category: 'campaign', condition: '完成“神舆·黑冰矩阵”。' },
  { id: 'campaign-map-08', name: '幽灵协议终止', category: 'campaign', condition: '完成“荒坂·终焉天塔”。' },

  { id: 'tower-first-shot', name: '开火协议', category: 'tower', condition: '让任意防御塔完成一次有效攻击。', target: 1, progressKey: 'attacks' },
  { id: 'tower-hundred-kills', name: '火力联网', category: 'tower', condition: '累计消灭100名敌人。', target: 100, progressKey: 'kills' },
  { id: 'tower-five-types', name: '五型齐备', category: 'tower', condition: '在战役中使用过全部5种基础防御塔。', target: 5, progressKey: 'towerTypes' },
  { id: 'tower-arc-chain', name: '连锁停电', category: 'tower', condition: '使用电弧塔累计完成25次连锁跳跃。', target: 25, progressKey: 'arcChainJumps' },
  { id: 'tower-hacker-reveal', name: '零日权限', category: 'tower', condition: '使用黑客中继使10名相位敌人显形。', target: 10, progressKey: 'hackerReveals' },
  { id: 'tower-rail-heavy', name: '天穹穿孔', category: 'tower', condition: '使用磁轨狙击累计消灭20名重甲或空中敌人。', target: 20, progressKey: 'railHeavyKills' },
  { id: 'tower-drone-air', name: '蜂群制空', category: 'tower', condition: '使用无人机巢累计消灭20个空中单位。', target: 20, progressKey: 'droneAirKills' },
  { id: 'tower-boss-breaker', name: '拆甲许可', category: 'tower', condition: '在一次任务中摧毁亚当·重锤的3个部件。', target: 3, progressKey: 'missionBossComponents' },

  { id: 'challenge-all-hostiles', name: '全目标数据库', category: 'challenge', condition: '至少消灭过全部10种普通敌人各一次。', target: 10, progressKey: 'enemyKinds' },
  { id: 'challenge-five-towers', name: '五塔联合阵线', category: 'challenge', condition: '在同一次任务中部署并让全部5种基础防御塔完成攻击。', target: 5, progressKey: 'missionActiveTowerTypes' },
  { id: 'challenge-perfect-grid', name: '防线毫发无损', category: 'challenge', condition: '在3个不同关卡中取得基地满生命通关。', target: 3, progressKey: 'perfectMaps' },
  { id: 'challenge-night-city-legend', name: '夜之城传奇', category: 'challenge', condition: '在困难难度下完成3个不同关卡。', target: 3, progressKey: 'hardMaps' },

  { id: 'hidden-enforcer', name: '铁拳碎重锤', category: 'hidden', hidden: true, condition: '完成“NCPD·钢穹核心”，并摧毁亚当·重锤的全部3个部件。' },
  { id: 'hidden-arsaka', name: '幽灵终局', category: 'hidden', hidden: true, condition: '完成“荒坂·终焉天塔”，结束最终战役。' },
] as const

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((item) => [item.id, item])) as Record<string, AchievementDefinition>
export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.length
