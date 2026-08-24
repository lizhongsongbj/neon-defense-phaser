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

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'level-01-lights-on', name: '灯还亮着', category: 'campaign', condition: '首次完成“超级建筑4号”。' },
  { id: 'level-02-above-clouds', name: '云层之上', category: 'campaign', condition: '完成“H8”，并在一次任务中使用酸雨雷暴使至少10名相位忍者显形。', target: 10, progressKey: 'h8StormReveals' },
  { id: 'level-03-front-door', name: '请走正门', category: 'campaign', condition: '在“绀碧大厦”的一次任务中，使用封锁闸门迫使累计15名敌人转入庭院绕行路线并完成关卡。', target: 15, progressKey: 'konpekiReroutes' },
  { id: 'level-04-wanted', name: '全城通缉', category: 'campaign', condition: '在“余烬”的一次任务中，消灭25名受到全域标记影响的敌人。', target: 25, progressKey: 'embersMarkedKills' },
  { id: 'level-05-afterlife-legend', name: '来生传奇', category: 'campaign', condition: '在“来生酒吧”的一次任务中，使用临时佣兵累计阻挡20名不同的敌人。', target: 20, progressKey: 'afterlifeBlockedEnemies' },
  { id: 'level-06-enforcement-ended', name: '执法终止', category: 'campaign', condition: '在“夜之城警察局总部”摧毁亚当·重锤的盾牌、导弹舱和推进器，然后将其击败。' },
  { id: 'level-07-permanent-silence', name: '永久静默', category: 'campaign', condition: '在“神舆”对夏娃-9载体成功使用记忆回溯减速，并将其击败。' },
  { id: 'level-08-ghost-protocol', name: '幽灵协议终止', category: 'campaign', condition: '完成“荒坂塔”，击败中段的亚当·重锤与最终阶段的夏娃-9。' },

  { id: 'tower-rail-sky-piercer', name: '天穹穿孔', category: 'tower', condition: '使用磁轨狙击累计消灭30名重甲或空中敌人。', target: 30, progressKey: 'railHeavyKills' },
  { id: 'tower-arc-blackout', name: '连锁停电', category: 'tower', condition: '使用电弧塔累计完成100次有效连锁跳跃。', target: 100, progressKey: 'arcChainJumps' },
  { id: 'tower-merc-wall', name: '钢铁人墙', category: 'tower', condition: '在单次任务中，街头兵营的佣兵累计阻挡敌人60秒。', target: 60, progressKey: 'missionMercenaryBlockSeconds' },
  { id: 'tower-hacker-zero-day', name: '零日权限', category: 'tower', condition: '使用黑客中继累计使20名相位忍者提前显形。', target: 20, progressKey: 'hackerReveals' },
  { id: 'tower-drone-air-control', name: '蜂群制空', category: 'tower', condition: '使用无人机巢累计消灭30个空中单位。', target: 30, progressKey: 'droneAirKills' },
  { id: 'tower-gravity-well', name: '人造引力井', category: 'tower', condition: '重力钉的一次攻击同时命中并牵引5名敌人。', target: 5, progressKey: 'gravityMaxTargets' },
  { id: 'tower-grey-dismantle', name: '拆解许可', category: 'tower', condition: '累计消灭50名处于灰潮解构站护甲削弱状态下的装甲敌人。', target: 50, progressKey: 'greyShredKills' },
  { id: 'tower-rewriter-yesterday', name: '昨日重现', category: 'tower', condition: '使用轨迹回写器累计将敌人回退1000点路径距离。', target: 1000, progressKey: 'rewriteDistance' },

  { id: 'challenge-all-hostiles', name: '全目标数据库', category: 'challenge', condition: '至少消灭过全部12种怪物各一次。', target: 12, progressKey: 'enemyKinds' },
  { id: 'challenge-eight-towers', name: '八塔联合阵线', category: 'challenge', condition: '在同一次任务中部署全部8种防御塔，并让每一种塔至少完成一次有效攻击。', target: 8, progressKey: 'missionActiveTowerTypes' },
  { id: 'challenge-perfect-grid', name: '防线毫发无损', category: 'challenge', condition: '在全部8个关卡中分别取得一次基地满生命通关记录。', target: 8, progressKey: 'perfectMaps' },
  { id: 'challenge-night-city-legend', name: '夜之城传奇', category: 'challenge', condition: '在困难难度下完成全部8个关卡。', target: 8, progressKey: 'hardMaps' },

  { id: 'hidden-iron-fist-smasher', name: '铁拳碎重锤', category: 'hidden', hidden: true, condition: '由街头兵营生成的佣兵对亚当·重锤完成最后一击。' },
  { id: 'hidden-deja-vu', name: '似曾相识', category: 'hidden', hidden: true, condition: '在“神舆”让同一名敌人同时受到轨迹回写器和记忆回溯影响，并累计三次经过同一路径检查点。' },
] as const

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((item) => [item.id, item])) as Record<string, AchievementDefinition>
export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.length
