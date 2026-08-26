export type AnimationCategory = 'tower' | 'enemy' | 'mercenary' | 'drone'
export type AnimationStatus = 'available' | 'planned'
export type AnimationMotion = 'pulse' | 'recoil' | 'arc' | 'scan' | 'scan-dual' | 'scan-deep' | 'scan-wide' | 'scan-focused' | 'launch' | 'gravity' | 'nano' | 'rewrite' | 'walk' | 'fly' | 'attack' | 'bomb' | 'death' | 'glitch' | 'burst'

export interface TowerHeadPulse { x:number; y:number; scale:number; accent:string; secondary:string }
export interface AnimationCatalogEntry {
  id:string; category:AnimationCategory; family:string; name:string; level:string; action:string
  description:string; timeline:string; referenceImage:string; previewAsset?:string; previewFrames?:readonly string[]
  attackEffectAsset?:string; attackEffectKind?:'hacker-pulse'|'arc-lightning'|'gravity-entangle'|'nano-orbit'|'trajectory-orbit'|'gang-rifle'
  status:AnimationStatus; motion:AnimationMotion; accent:string; tags:readonly string[]; headPulse?:TowerHeadPulse
}

type TowerSeed = Omit<AnimationCatalogEntry,'category'|'action'|'description'|'status'|'tags'> & { attack:string }
const tower = (seed:TowerSeed):AnimationCatalogEntry => ({
  ...seed,
  category:'tower',
  action:'攻击',
  status:seed.previewAsset||seed.attackEffectAsset||seed.attackEffectKind==='gravity-entangle'||seed.attackEffectKind==='nano-orbit'||seed.attackEffectKind==='trajectory-orbit'?'available':'planned',
  description:`${seed.name}发动“${seed.attack}”，使用与塔体相同的工业材质、发射结构和能量配色。`,
  tags:[seed.family,seed.level,seed.attack],
})
const hackerAsset='/assets/effects/hacker-relay-selected-pulse/hacker-relay-selected-pulse.webp'
const arcAsset='/assets/effects/arc-neon-lightning/arc-neon-lightning.webp'
const towers:AnimationCatalogEntry[]=[
  tower({id:'rail-l1',family:'磁轨狙击',name:'磁轨狙击',level:'Lv1',referenceImage:'/assets/towers/generated-raw-selected/tower-01-magnetic-rail-base-cutout.png',previewAsset:'/assets/animations/towers/tower-01-magnetic-rail-attack.webp',motion:'recoil',accent:'#34c9ff',attack:'单轨狙击',timeline:'磁轨充能 → 炮闩闭锁 → 高速弹芯曳光 → 金属命中碎屑'}),
  tower({id:'rail-l2',family:'磁轨狙击',name:'磁轨校准台',level:'Lv2',referenceImage:'/assets/generated/progression/tier-2/mag-rail-tier-2.png',previewAsset:'/assets/animations/towers/tower-01-magnetic-rail-tier-2-attack.webp?v=reference-l1-20260824',motion:'recoil',accent:'#34c9ff',attack:'校准穿刺',timeline:'瞄准器收束 → 轨道校准 → 弹芯贯穿 → 热雾消散'}),
  tower({id:'rail-l3',family:'磁轨狙击',name:'双极加速炮',level:'Lv3',referenceImage:'/assets/generated/cutout/mag-rail-tier-3-2026-08-23T11-48-26-946Z.png',previewAsset:'/assets/animations/towers/tower-01-magnetic-rail-tier-3-attack.webp?v=reference-l1-20260824',motion:'recoil',accent:'#63d9ff',attack:'双极加速',timeline:'双轨升压 → 弹芯出膛 → 空气扰流 → 后坐复位'}),
  tower({id:'rail-a',family:'磁轨狙击',name:'天穹裁决者',level:'Lv4-A',referenceImage:'/assets/generated/cutout/mag-rail-sky-verdict-2026-08-23T11-25-23-710Z.png',previewAsset:'/assets/animations/towers/tower-01-magnetic-rail-sky-verdict-attack.webp?v=reference-l1-20260824',motion:'burst',accent:'#8be9ff',attack:'天穹裁决',timeline:'高空锁定 → 电容释放 → 真实弹道贯穿 → 电离热雾'}),
  tower({id:'rail-b',family:'磁轨狙击',name:'量子贯城炮',level:'Lv4-B',referenceImage:'/assets/generated/cutout/mag-rail-city-piercer-2026-08-23T11-25-22-347Z.png',previewAsset:'/assets/animations/towers/tower-01-magnetic-rail-city-piercer-attack.webp?v=reference-l1-20260824',motion:'recoil',accent:'#9a7dff',attack:'贯城炮击',timeline:'炮身锁死 → 重型弹芯发射 → 装甲碎裂 → 热烟回流'}),
  tower({id:'arc-l1',family:'电弧塔',name:'电弧塔',level:'Lv1',referenceImage:'/assets/towers/generated-raw-selected/tower-02-arc-neon-base-cutout-1.png',previewAsset:'/assets/animations/towers/tower-02-arc-neon-attack.webp',motion:'arc',accent:'#20f4e6',attack:'三段电弧',timeline:'线圈升压 → 不规则电弧击穿 → 分叉放电 → 绝缘烟雾'}),
  ...[
    ['arc-l2','高压电弧塔','Lv2','/assets/generated/progression/tier-2/arc-neon-tier-2.png','#20f4e6','高压连锁'],
    ['arc-l3','霓虹电网塔','Lv3','/assets/generated/cutout/arc-neon-tier-3-2026-08-23T11-49-31-954Z.png','#5affeb','电网脉冲'],
    ['arc-a','霓虹雷暴核','Lv4-A','/assets/generated/cutout/arc-neon-storm-core-2026-08-23T11-25-45-551Z.png','#6efff3','五链雷暴'],
    ['arc-b','超导潮汐塔','Lv4-B','/assets/generated/cutout/arc-neon-superconductor-2026-08-23T11-25-37-154Z.png','#55ffc2','超导潮汐'],
  ].map(([id,name,level,referenceImage,accent,attack])=>tower({id,family:'电弧塔',name,level,referenceImage,motion:id==='arc-a'?'burst':'arc',accent,attack,timeline:'线圈定向 → 固定青绿色不规则闪电 → 目标导电碎屑 → 余电消散',attackEffectAsset:arcAsset,attackEffectKind:'arc-lightning'} as TowerSeed)),
  ...[
    ['hack-l1','黑客中继','Lv1','/assets/towers/generated-raw-selected/tower-04-hacker-relay-base-cutout.png','scan','#79ff9e',50,22,.82],
    ['hack-l2','入侵中继站','Lv2','/assets/generated/progression/tier-2/hacker-tier-2.png','scan-dual','#79ff9e',50,20,.94],
    ['hack-l3','深网控制台','Lv3','/assets/generated/cutout/hacker-tier-3-2026-08-23T11-53-44-631Z.png','scan-deep','#72ffbd',50,18,1.04],
    ['hack-a','零日统御台','Lv4-A','/assets/generated/cutout/hacker-zero-day-control-2026-08-23T11-11-56-802Z.png','scan-wide','#52ff9b',50,17,1.16],
    ['hack-b','黑冰崩解器','Lv4-B','/assets/generated/cutout/hacker-black-ice-breaker-2026-08-23T11-13-18-369Z.png','scan-focused','#d44bff',50,19,1.02],
  ].map(([id,name,level,referenceImage,motion,accent,x,y,scale])=>tower({id,family:'黑客中继',name,level,referenceImage,motion:motion as AnimationMotion,accent,attack:'入侵扫描',timeline:id==='hack-b'?'天线定向 → 固定紫色窄域扫描 → 数据扰动 → 回流':'天线定向 → 固定青绿色扫描 → 数据扰动 → 回流',attackEffectAsset:hackerAsset,attackEffectKind:'hacker-pulse',headPulse:{x:x as number,y:y as number,scale:scale as number,accent:'#79ff9e',secondary:'#c9ffe0'}} as TowerSeed)),
  ...[
    ['gravity-l1','重力钉','Lv1','/assets/towers/new-concepts/simplified/gravity-nail-level-1.png','#b45cff'],
    ['gravity-l2','重力钉 II','Lv2','/assets/towers/new-concepts/simplified/gravity-nail-level-2.png','#bd68ff'],
    ['gravity-l3','重力钉 III','Lv3','/assets/towers/new-concepts/simplified/gravity-nail-level-3.png','#c978ff'],
    ['gravity-a','深井封锁','Lv4-A','/assets/towers/new-concepts/simplified/gravity-nail-level-4-deep-well-lockdown.png','#9b4dff'],
    ['gravity-b','天幕偏转','Lv4-B','/assets/towers/new-concepts/simplified/gravity-nail-level-4-sky-deflection.png','#d788ff'],
  ].map(([id,name,level,referenceImage,accent])=>tower({id,name,level,referenceImage,motion:'gravity',accent,family:'重力钉',attack:'引力缠绕',timeline:'塔身紫色粒子缠绕 → 目标同步缠绕 → 引力收束（完成一次攻击）',attackEffectKind:'gravity-entangle'} as TowerSeed)),
  ...[
    ['grey-l1','灰潮解构站','Lv1','/assets/towers/new-concepts/revised/grey-tide-level-1.png','#75d89c'],
    ['grey-l2','灰潮解构站 II','Lv2','/assets/towers/new-concepts/revised/grey-tide-level-2.png','#69e69b'],
    ['grey-l3','灰潮解构站 III','Lv3','/assets/towers/new-concepts/revised/grey-tide-level-3.png','#79f2a8'],
    ['grey-a','噬甲集群','Lv4-A','/assets/towers/new-concepts/revised/grey-tide-level-4-armor-eater-swarm.png','#58ef8d'],
    ['grey-b','清道夫协议','Lv4-B','/assets/towers/new-concepts/revised/grey-tide-level-4-scavenger-protocol.png','#9be870'],
  ].map(([id,name,level,referenceImage,accent])=>tower({id,name,level,referenceImage,motion:'nano',accent,family:'灰潮解构站',attack:'纳米解构潮',timeline:'塔芯绿色纳米粒子增殖 → 围绕塔体中心高速旋转 → 向内收束完成一次解构脉冲',attackEffectKind:'nano-orbit'} as TowerSeed)),
  ...[
    ['trajectory-l1','轨迹回写器','Lv1','/assets/towers/new-concepts/revised/trajectory-rewriter-level-1.png','#70dfff'],
    ['trajectory-l2','轨迹回写器 II','Lv2','/assets/towers/new-concepts/revised/trajectory-rewriter-level-2.png','#66d8ff'],
    ['trajectory-l3','轨迹回写器 III','Lv3','/assets/towers/new-concepts/revised/trajectory-rewriter-level-3.png','#86e7ff'],
    ['trajectory-a','回滚节点','Lv4-A','/assets/towers/new-concepts/revised/trajectory-rewriter-level-4-rollback-node.png','#59cbff'],
    ['trajectory-b','断点处决','Lv4-B','/assets/towers/new-concepts/revised/trajectory-rewriter-level-4-breakpoint-execution.png','#9cecff'],
  ].map(([id,name,level,referenceImage,accent])=>tower({id,name,level,referenceImage,motion:'rewrite',accent,family:'轨迹回写器',attack:'轨迹回写脉冲',timeline:'中央镜面记录轨迹 → 天蓝粒子围绕门环核心旋转 → 粒子逆向收束完成一次轨迹回写',attackEffectKind:'trajectory-orbit'} as TowerSeed)),
]

type EnemySeed={id:string;family:string;image:string;accent:string;move:string;attack:string;air?:boolean;previewBase?:string}
const enemySeeds:EnemySeed[]=[
 ['gang','帮派义体兵','/assets/enemies/generated-raw-selected/enemy-01-gang-cyborg-side45-base-cutout.png','#ff5b65','义体冲锋','手枪点射'],
 ['riot','防暴镇压机','/assets/enemies/generated-raw-selected/enemy-02-riot-mech-base-cutout.png','#ff9b55','重装踏步','盾击镇压'],
 ['ninja','相位忍者','/assets/enemies/generated-raw-selected/enemy-03-phase-ninja-base-cutout.png','#c87cff','相位疾走','瞬移斩击'],
 ['aerostat','企业浮空艇','/assets/enemies/generated-raw-selected/enemy-04-corporate-airship-base-cutout.png','#72ddff','推进飞行','机炮扫射'],
 ['devourer','数据吞噬者','/assets/enemies/generated-raw-selected/enemy-05-data-devourer-base-cutout.png','#77ffb6','数据爬行','护盾吞噬'],
 ['faraday','电磁镇暴体','/assets/enemies/new/enemy-06-electromagnetic-riot.png','#ffe26b','镇暴推进','电磁冲击'],
 ['hijacker','劫持浮游体','/assets/enemies/new/enemy-07-hijack-hovercraft.png','#64e9ff','浮游飞行','链路劫持'],
 ['neurohound','神经猎犬','/assets/enemies/new/enemy-08-neuro-hound.png','#ff4f73','痛觉超频疾走','扑咬与神经电弧'],
 ['matriarch','育质母体','/assets/enemies/new/enemy-09-tissue-matriarch.png','#78ff8e','组织脉动爬行','组织灌注脉冲'],
 ['bonebreaker','骨铠破障兽','/assets/enemies/new/enemy-10-bonebreaker.png','#66e8ff','骨铠重踏','破障冲撞'],
 ['enforcer','执法者·零号','/assets/enemies/boss-01-enforcer-zero-cutout.png','#ff4f74','重型推进','盾牌导弹齐射'],
 ['adam-smasher','亚当·重锤','/assets/enemies/adam-smasher.png','#ff684f','重装突进','义体重炮'],
 ['eve','夏娃-9','/assets/enemies/mother-city-eve-9-clean-no-white.png','#ff62d3','节点迁移','核心城市脉冲'],
].map(([id,family,image,accent,move,attack])=>({id,family,image,accent,move,attack}))
const moveAssets:Record<string,string>={enforcer:'/assets/animations/enemies/boss-adam-smasher-move.webp?v=rebuilt-heavy-motion-20260826','adam-smasher':'/assets/animations/enemies/boss-adam-smasher-move.webp?v=rebuilt-heavy-motion-20260826',gang:'/assets/animations/enemies/enemy-01-gang-cyborg-side45-move-fixed-size.webp?v=fixed-character-size-20260825',riot:'/assets/animations/enemies/enemy-02-riot-mech-move-fixed-size.webp?v=fixed-character-size-20260825',ninja:'/assets/animations/enemies/enemy-03-phase-ninja-move-fixed-size.webp?v=fixed-character-size-20260825',aerostat:'/assets/animations/enemies/enemy-04-corporate-airship-fly.webp',devourer:'/assets/animations/enemies/enemy-05-data-devourer-move.webp',faraday:'/assets/animations/enemies/enemy-06-electromagnetic-riot-move.webp?v=generated-crawl-20260825',neurohound:'/assets/animations/enemies/enemy-08-neuro-hound-move.webp?v=generated-crawl-20260825',matriarch:'/assets/animations/enemies/enemy-09-tissue-matriarch-move.webp?v=no-color-lines-20260824',bonebreaker:'/assets/animations/enemies/enemy-10-bonebreaker-move.webp?v=generated-crawl-20260825',hijacker:'/assets/animations/enemies/enemy-07-hijack-hovercraft-fly.webp?v=generated-flight-20260825'}
const actionAssets:Record<string,string>={enforcer:'/assets/animations/enemies/boss-adam-smasher-attack.webp?v=rebuilt-heavy-motion-20260826','adam-smasher':'/assets/animations/enemies/boss-adam-smasher-attack.webp?v=rebuilt-heavy-motion-20260826',riot:'/assets/animations/enemies/enemy-02-riot-mech-attack.webp?v=regenerated-attack-20260825',ninja:'/assets/animations/enemies/enemy-03-phase-ninja-attack.webp?v=regenerated-attack-20260825',aerostat:'/assets/animations/enemies/runtime/aerostat/attack/frame-01.webp?v=generated-actions-20260826',devourer:'/assets/animations/enemies/runtime/devourer/attack/frame-01.webp?v=generated-actions-20260826',faraday:'/assets/animations/enemies/runtime/faraday/attack/frame-01.webp?v=generated-actions-20260826',hijacker:'/assets/animations/enemies/runtime/hijacker/attack/frame-01.webp?v=generated-actions-20260826',neurohound:'/assets/animations/enemies/enemy-08-neuro-hound-attack.webp?v=no-color-lines-20260824',matriarch:'/assets/animations/enemies/enemy-09-tissue-matriarch-attack.webp?v=no-color-lines-20260824',bonebreaker:'/assets/animations/enemies/enemy-10-bonebreaker-attack.webp?v=no-color-lines-20260825'}
const runtimePreviewFrames:Record<string,readonly string[]>={aerostat:Array.from({length:12},(_,i)=>`/assets/animations/enemies/runtime/aerostat/ATTACK/frame-${String(i+1).padStart(2,'0')}.webp?v=clean-action-20260826`),devourer:Array.from({length:12},(_,i)=>`/assets/animations/enemies/runtime/devourer/ATTACK/frame-${String(i+1).padStart(2,'0')}.webp?v=clean-action-20260826`),faraday:Array.from({length:8},(_,i)=>`/assets/animations/enemies/runtime/faraday/ATTACK/frame-${String(i+1).padStart(2,'0')}.webp?v=clean-action-20260826`),hijacker:Array.from({length:12},(_,i)=>`/assets/animations/enemies/runtime/hijacker/ATTACK/frame-${String(i+1).padStart(2,'0')}.webp?v=clean-action-20260826`)}
const deathAssets:Record<string,string>={enforcer:'/assets/animations/enemies/boss-adam-smasher-death.webp?v=rebuilt-heavy-motion-20260826','adam-smasher':'/assets/animations/enemies/boss-adam-smasher-death.webp?v=rebuilt-heavy-motion-20260826',gang:'/assets/animations/enemies/enemy-01-gang-cyborg-death-kneel-8f.webp?v=kneeling-death-8f-20260825-v2',riot:'/assets/animations/enemies/enemy-02-riot-mech-death.webp?v=generated-death-20260825',ninja:'/assets/animations/enemies/enemy-03-phase-ninja-death-transparent.webp?v=transparent-white-v2-20260826',aerostat:'/assets/animations/enemies/runtime/aerostat/death/frame-01.webp?v=generated-actions-20260826',devourer:'/assets/animations/enemies/runtime/devourer/death/frame-01.webp?v=generated-actions-20260826',faraday:'/assets/animations/enemies/runtime/faraday/death/frame-01.webp?v=generated-actions-20260826',hijacker:'/assets/animations/enemies/runtime/hijacker/death/frame-01.webp?v=generated-actions-20260826',neurohound:'/assets/animations/enemies/enemy-08-neuro-hound-death.webp?v=no-color-lines-20260824',matriarch:'/assets/animations/enemies/enemy-09-tissue-matriarch-death.webp?v=no-color-lines-20260824',bonebreaker:'/assets/animations/enemies/enemy-10-bonebreaker-death.webp?v=no-color-lines-20260825'}
const enemies:AnimationCatalogEntry[]=enemySeeds.flatMap(seed=>[
 {id:`${seed.id}-${seed.id==='aerostat'||seed.id==='hijacker'?'fly':'walk'}`,category:'enemy',family:seed.family,name:seed.family,level:'移动',action:seed.id==='aerostat'||seed.id==='hijacker'?'飞行':'行走',description:seed.move,timeline:'启动 → 稳定移动 → 受击反馈 → 继续推进',referenceImage:seed.image,previewAsset:moveAssets[seed.id],status:moveAssets[seed.id]?'available':'planned',motion:seed.id==='aerostat'||seed.id==='hijacker'?'fly':'walk',accent:seed.accent,tags:[seed.family,'移动']},
 {id:`${seed.id}-attack`,category:'enemy',family:seed.family,name:seed.family,level:'攻击',action:seed.id==='gang'?'举枪点射':'攻击',description:seed.id==='gang'?'帮派义体兵压低重心，将步枪从巡逻姿态抬至肩线，完成短促三连点射并承受真实后坐。':seed.id==='riot'?'防暴镇压机降低机械重心，宽脚撑地，以胸前重盾向前冲撞并抬起警棍准备补击。':seed.id==='ninja'?'相位忍者从疾走姿态急停转髋，以低重心完成横向能量刀斩击并迅速回收。':seed.attack,timeline:seed.id==='gang'?'发现目标 → 双手举枪贴肩 → 瞄准锁定 → 三连点射 → 后坐复位 → 放低枪口':seed.id==='riot'?'锁定目标 → 液压下沉 → 重盾前推 → 冲撞命中 → 警棍回摆 → 复位':seed.id==='ninja'?'相位接近 → 前脚落地 → 转髋拔刀 → 水平斩击 → 刀光消散 → 回收架势':'锁定 → 动作蓄力 → 命中 → 收势',referenceImage:seed.image,previewAsset:actionAssets[seed.id],previewFrames:runtimePreviewFrames[seed.id]?.map((url)=>url.replace('/ATTACK/','/attack/')),attackEffectKind:seed.id==='gang'?'gang-rifle':undefined,status:actionAssets[seed.id]||seed.id==='gang'?'available':'planned',motion:'attack',accent:seed.accent,tags:[seed.family,'攻击',...(seed.id==='gang'?['举枪','步枪点射']:[])]},
 {id:`${seed.id}-death`,category:'enemy',family:seed.family,name:seed.family,level:'死亡',action:'死亡',description:seed.id==='riot'?'防暴镇压机液压系统失压，重盾先行坠地，机体跪倒后侧翻，并在地面留下机械零件。':seed.id==='ninja'?'相位忍者的隐身轮廓失稳，能量刀熄灭，身体跪倒后向侧面倒下。':'单位受到致命伤害后失去支撑，完成倒地并留下对应的死亡残留特效。',timeline:seed.id==='riot'?'致命受击 → 液压失压 → 重盾坠地 → 跪倒侧翻 → 零件残留':seed.id==='ninja'?'致命受击 → 相位失稳 → 能量刀熄灭 → 跪倒 → 侧向倒地':'致命受击 → 动作失衡 → 倒地 → 残留出现 → 淡出',referenceImage:seed.image,previewAsset:deathAssets[seed.id],previewFrames:runtimePreviewFrames[seed.id]?.map((url)=>url.replace('/ATTACK/','/death/')),status:deathAssets[seed.id]?'available':'planned',motion:'death',accent:seed.accent,tags:[seed.family,'死亡']},
] as AnimationCatalogEntry[])

const unit=(id:string,category:'mercenary'|'drone',family:string,name:string,action:string,image:string,motion:AnimationMotion,accent:string,description:string):AnimationCatalogEntry=>({id,category,family,name,level:action,action,description,timeline:`准备 → ${action}主体动作 → 命中/落地反馈 → 收势`,referenceImage:image,status:'planned',motion,accent,tags:[family,name,action]})
const units:AnimationCatalogEntry[]=[
 ...['walk','attack','death'].map((a,i)=>unit(`merc-shield-${a}`,'mercenary','街头兵营佣兵','铬钢盾兵',['行走','攻击','死亡'][i],'/assets/units/mercenary-shield.png',['walk','attack','death'][i] as AnimationMotion,'#d4a75c','盾兵以真实装备重量完成动作。')),
 ...['walk','attack','death'].map((a,i)=>unit(`merc-rifle-${a}`,'mercenary','街头兵营佣兵','街头步枪兵',['行走','攻击','死亡'][i],'/assets/units/mercenary-rifle.png',['walk','attack','death'][i] as AnimationMotion,'#e4b76c','步枪兵保持战术姿态与真实后坐。')),
 ...['walk','attack','death'].map((a,i)=>unit(`merc-blade-${a}`,'mercenary','街头兵营佣兵','血刃夜行者',['行走','攻击','死亡'][i],'/assets/generated/cutout/street-mercenary-unit-2026-08-23T12-16-30-502Z.png',['walk','attack','death'][i] as AnimationMotion,'#ff4d62','夜行者以低姿态完成动作。')),
 ...['fly','bomb','death'].map((a,i)=>unit(`drone-scout-${a}`,'drone','无人机单位','截击无人机',['飞行','轰炸','死亡'][i],'/assets/towers/drone-hive-unit-tight.png',['fly','bomb','death'][i] as AnimationMotion,'#dfffff','无人机依靠旋翼、惯性和撞击完成动作。')),
 ...['fly','bomb','death'].map((a,i)=>unit(`drone-bomber-${a}`,'drone','无人机单位','爆破无人机',['飞行','轰炸','死亡'][i],'/assets/generated/cutout/drone-hive-unit-2026-08-23T23-59-59-999Z.png',['fly','bomb','death'][i] as AnimationMotion,'#ff7848','重型无人机以载荷重量完成动作。')),
 ...['fly','bomb','death'].map((a,i)=>unit(`drone-queen-${a}`,'drone','无人机单位','蜂后指挥机',['飞行','轰炸','死亡'][i],'/assets/towers/drone-hive-unit-generated.png',['fly','bomb','death'][i] as AnimationMotion,'#8beeff','指挥机以稳定悬浮和失稳坠落完成动作。')),
]
export const ANIMATION_CATALOG:readonly AnimationCatalogEntry[]=[...towers,...enemies,...units]
export const ANIMATION_CATEGORY_LABEL:Record<AnimationCategory,string>={tower:'防御塔攻击',enemy:'怪物动画',mercenary:'佣兵动画',drone:'无人机动画'}

