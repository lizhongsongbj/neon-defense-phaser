import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const reportDate = '2026-08-24'
const growthLevels = [0,1,2,3].map(level => ({level, damage: 1 + level * 0.06, range: 1 + level * 0.03, cost: level === 0 ? 0 : level}))
const towers = [
  {id:'arc-neon', name:'电弧塔', cost:110, role:'连锁清场 / 潮湿增伤', color:'#20f4e6', ranges:[120,134,148], cooldown:1.05, kind:'能量', details:'最多连锁 3 个地面目标；链距 65；路线距离 390–520 为潮湿区，伤害 +20%。', branch:['霓虹雷暴核','超导潮汐塔']},
  {id:'drone-hive', name:'无人机巢', cost:135, role:'空中拦截 / 远程追击', color:'#e8ffff', ranges:[175,195,215], cooldown:0.68, kind:'物理', details:'2 架无人机；对空 +45%；已有锁定后追击距离 +30；换目标增加“目标距离 ÷ 420”秒旅行延迟。', branch:['蜂后制空母巢','蜂群湮灭工厂']},
  {id:'hacker-relay', name:'黑客中继', cost:115, role:'揭露隐身 / 护盾干扰', color:'#79ff9e', ranges:[145,160,175], cooldown:2.4, kind:'能量', details:'范围内全体脉冲；标记持续 3.2 秒；减速标记 22%；易伤 16%；揭露相位；写入护盾恢复阻断标记。', branch:['零日统御台','黑冰崩解器']},
  {id:'mag-rail-sniper', name:'磁轨狙击', cost:130, role:'重甲击破 / 超远射程', color:'#34c9ff', ranges:[220,240,260], cooldown:1.7, kind:'物理', details:'穿甲 35%；盲区 55；对地/对空；优先总耐久（生命+护盾）最高目标。', branch:['天穹裁决者','量子贯城炮']},
  {id:'street-mercenary', name:'街头兵营', cost:100, role:'地面拦截 / 阵线维持', color:'#c99245', ranges:[105,118,132], cooldown:0.9, kind:'物理', details:'2 名佣兵；拦截半径 32；阵亡后 8 秒复活；每名佣兵独立锁定不同地面目标。', branch:['铬钢不破营','血刃夜行队']},
]
const rnd = (n, d=2) => Number(n.toFixed(d)).toString()
const money = towers.map(t => {
  const u12 = Math.round(t.cost * .7), u23 = Math.round(t.cost * 1.05)
  const spent = [t.cost, t.cost+u12, t.cost+u12+u23]
  const refund = spent.map(s => Math.min(Math.floor(s*.6), Math.floor(t.cost*.8)))
  return {...t,u12,u23,spent,refund}
})
const rangeRows = towers.flatMap(t => growthLevels.map(g => [t.name, `研发 ${g.level}`, ...t.ranges.map(r => rnd(r*g.range))]))
const railHits=[100,138,182], railDps=railHits.map(x=>x/1.7)
const arcChains=[[38,30,22],[50.16,39.6,29.04],[63.84,50.4,36.96]]
const droneSingle=[28,36.4,47.04]
const mercHit=[19,24.7,31.35]
const hackerHit=[7,14,21]
const mdTable=(heads,rows)=>`| ${heads.join(' | ')} |\n|${heads.map(()=> '---').join('|')}|\n${rows.map(r=>`| ${r.join(' | ')} |`).join('\n')}`
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
const htmlTable=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`

let md=`# 《霓虹防线》防御塔完整数值报告\n\n- **报告日期：** ${reportDate}\n- **项目目录：** \`${root}\`\n- **统计口径：** 以当前项目源代码实际参与战斗的数值为准；概念图、提示词和尚未接入的设计不作为已实装数值。\n\n> **最重要结论：** 当前真正接入建造、升级与战斗系统的防御塔为 **5 种**，战斗等级为 **1–3 级**。五种原塔的第四级双分支已有名称和图像设计，但没有战斗数值；另外三种新塔只有视觉概念，同样没有接入战斗。\n\n## 1. 实装状态总览\n\n${mdTable(['类别','数量','当前状态'],[
['实装原塔','5','可建造、可升级、可攻击；等级上限 3'],
['第四级分支','10','已有名称/图像规格；无费用、伤害、射程、冷却和行为代码'],
['新概念塔','3','已有 1–3 级与第四级分支视觉规格；未加入 TowerId 和战斗系统'],
['连携系统','0','项目代码中未发现连携伤害或终极连携结算实现'],
])}\n\n## 2. 五种实装塔基础总览\n\n${mdTable(['防御塔','内部 ID','建造费','定位','伤害类型','基础冷却','1/2/3级射程','主题色'],towers.map(t=>[t.name,`${t.id}`,t.cost,t.role,t.kind,`${t.cooldown}秒`,t.ranges.join(' / '),t.color]).map(r=>{r[1]=`${r[1].slice(1)}`;return r}).map(r=>{r[1]='`'+r[1].replaceAll('','')+'`';return r}))}\n\n## 3. 建造、升级与拆除经济\n\n升级公式：\n\n- 1→2 级：\`Math.round(建造费 × 0.70)\`\n- 2→3 级：\`Math.round(建造费 × 1.05)\`\n- 拆除返还：\`min(floor(累计投入 × 0.60), floor(建造费 × 0.80))\`\n\n${mdTable(['防御塔','建造','1→2','2→3','二级累计投入','三级累计投入','Lv1返还','Lv2返还','Lv3返还','三级净沉没成本'],money.map(t=>[t.name,t.cost,t.u12,t.u23,t.spent[1],t.spent[2],...t.refund,t.spent[2]-t.refund[2]]))}\n\n**经济观察：** 1 级拆除返还为基础建造费的 60%；升到 2 级后触及“基础建造费 80%”的返还上限，继续升到 3 级不会再提高返还。\n\n## 4. 永久研发成长\n\n每种塔拥有独立的研发等级 0–3。每级固定增加 **6%伤害** 和 **3%射程**，不改变冷却、单位数量、生命、穿甲、控制强度或持续时间。\n\n${mdTable(['研发等级','升到该级费用','累计研发点','伤害倍率','射程倍率'],growthLevels.map(g=>[g.level,g.level===0?'—':g.cost,[0,1,3,6][g.level],`×${rnd(g.damage)}`,`×${rnd(g.range)}`]))}\n\n- 单塔从 0 级升满需要 1+2+3 = **6 研发点**。\n- 五种实装塔全部升满需要 **30 研发点**。\n- 项目初始研发点为 **5**。\n\n### 4.1 所有塔在各研发等级下的实际射程（普通塔位 rangeScale=1）\n\n${mdTable(['防御塔','研发等级','塔Lv1','塔Lv2','塔Lv3'],rangeRows)}\n\n## 5. 磁轨狙击完整数值\n\n### 5.1 基础与机制\n\n- 建造费 130；升级费 91 / 137；三级累计投入 358；拆除返还为 78 / 104 / 104（对应塔 Lv1/Lv2/Lv3）。\n- 物理伤害；攻击间隔 1.7 秒；穿甲 35%；盲区半径 55。\n- 射程 220 / 240 / 260；可攻击地面和空中。\n- 索敌：射程内且盲区外，选择“当前生命 + 护盾”最高者。\n- 普通护甲 A 下伤害倍率：\`1 - A × (1 - 0.35) = 1 - 0.65A\`。\n- 若敌人具有磁轨易损属性，还会再乘 \`1 + railVulnerability\`。\n\n${mdTable(['塔等级','每击原始伤害','裸甲理论DPS','满研发每击','满研发DPS','基础射程','满研发射程'],[0,1,2].map(i=>[i+1,railHits[i],rnd(railDps[i]),rnd(railHits[i]*1.18),rnd(railDps[i]*1.18),[220,240,260][i],rnd([220,240,260][i]*1.09)]))}\n\n## 6. 电弧塔完整数值\n\n### 6.1 基础与机制\n\n- 建造费 110；升级费 77 / 116；三级累计投入 303；拆除返还为 66 / 88 / 88（对应塔 Lv1/Lv2/Lv3）。\n- 能量伤害；攻击间隔 1.05 秒；只能选择地面目标。\n- 最多连锁 3 个目标，后续目标必须距离上一目标不超过 65。\n- 第一目标按敌人路线 distance **从小到大**选择；后续目标选择离上一目标最近者。\n- 路线 distance 390–520 的敌人为潮湿目标，单独获得 +20%伤害。每一跳分别判断是否潮湿。\n\n${mdTable(['塔等级','第1跳','第2跳','第3跳','三目标总伤害','三目标DPS','潮湿三目标总伤害','潮湿三目标DPS','满研发三目标DPS','满研发潮湿DPS'],arcChains.map((a,i)=>{const sum=a.reduce((x,y)=>x+y,0);return[i+1,...a.map(x=>rnd(x)),rnd(sum),rnd(sum/1.05),rnd(sum*1.2),rnd(sum*1.2/1.05),rnd(sum/1.05*1.18),rnd(sum*1.2/1.05*1.18)]}))}\n\n> 单目标场景只造成第 1 跳伤害；两目标场景只计算前两跳。因此“三目标 DPS”是目标链完整时的理论总输出。\n\n## 7. 街头兵营完整数值\n\n### 7.1 基础与机制\n\n- 建造费 100；升级费 70 / 105；三级累计投入 275；拆除返还为 60 / 80 / 80（对应塔 Lv1/Lv2/Lv3）。\n- 2 名佣兵；物理伤害；单佣兵攻击间隔 0.9 秒。\n- 集结范围 105 / 118 / 132；拦截半径 32；阵亡复活时间 8 秒。\n- 只能拦截地面、存活且当前未处于未揭露相位状态的敌人。\n- 每名佣兵优先锁定一个不同目标；锁定成功后令敌人 blocked=true，使其当帧停止移动。\n- 佣兵承伤公式：\`佣兵HP -= 敌人attack × dt秒\`。\n- 研发只提高伤害和集结范围，不提高佣兵生命、数量、拦截半径或复活速度。\n\n${mdTable(['塔等级','单佣兵HP','双佣兵总HP','单佣兵每击','单佣兵DPS','双佣兵理论DPS','满研发单击','满研发双佣兵DPS'],[0,1,2].map(i=>{const hp=[190,243.2,304][i];return[i+1,rnd(hp),rnd(hp*2),rnd(mercHit[i]),rnd(mercHit[i]/.9),rnd(mercHit[i]*2/.9),rnd(mercHit[i]*1.18),rnd(mercHit[i]*2/.9*1.18)]}))}\n\n> 双佣兵 DPS 假设两人都存活、都有可拦截目标且持续攻击；死亡、换目标或缺少地面目标都会降低实际输出。\n\n## 8. 黑客中继完整数值\n\n### 8.1 基础与机制\n\n- 建造费 115；升级费 81 / 121；三级累计投入 317；拆除返还为 69 / 92 / 92（对应塔 Lv1/Lv2/Lv3）。\n- 能量伤害；范围 145 / 160 / 175；脉冲冷却 2.4 秒。\n- 每次对射程内**所有敌人**生效，不限制目标数量。\n- 直接伤害按 \`7 × 塔等级\`计算。\n- 标记持续 3.2 秒：揭露相位、减速字段 22%、易伤 16%、护盾恢复阻断字段。\n- 3.2 秒持续时间大于 2.4 秒冷却，连续有目标时标记理论刷新余量 0.8 秒。\n- 易伤已被伤害结算读取，会使后续伤害乘 1.16。\n\n${mdTable(['塔等级','每目标每次伤害','每目标理论DPS','满研发每次伤害','满研发每目标DPS','射程','满研发射程'],[0,1,2].map(i=>[i+1,hackerHit[i],rnd(hackerHit[i]/2.4),rnd(hackerHit[i]*1.18),rnd(hackerHit[i]/2.4*1.18),[145,160,175][i],rnd([145,160,175][i]*1.09)]))}\n\n### 8.2 当前实现审计提醒\n\n- **已实际生效：** 相位揭露、16%易伤、直接能量伤害。\n- **仅写入状态但未被主战斗循环读取：** 22%减速字段；当前移动仍直接使用 enemy.speed。\n- **仅写入状态但项目中没有护盾恢复循环可阻断：** shieldBlockedUntil。\n- 因此界面定位中的“减速/护盾干扰”目前并未形成完整实战效果，报告不能把它们当作已兑现收益。\n- TowerState.utility 字段存在，但黑客行为未累计 utility，当前工具贡献统计可能保持 0。\n\n## 9. 无人机巢完整数值\n\n### 9.1 基础与机制\n\n- 建造费 135；升级费 95 / 142；三级累计投入 372；拆除返还为 81 / 108 / 108（对应塔 Lv1/Lv2/Lv3）。\n- 2 架无人机；物理伤害；每轮冷却 0.68 秒。\n- 射程 175 / 195 / 215；可攻击地面和空中；对空伤害 +45%。\n- 索敌优先级：空中优先；同为空中或同为地面时，路线 distance 最大者优先。\n- 已有锁定目标时搜索范围额外 +30；重新锁定目标时，下一轮冷却额外增加 \`目标距离 ÷ 420\`秒。\n- 无目标时 targetId 清空，冷却置为 0.08 秒。\n- 每轮两架无人机各结算一次伤害，但 tower.attacks 只增加 1。\n- 若敌人未被揭露，无人机伤害还会乘 \`1 - droneEvasion\`。\n\n${mdTable(['塔等级','单机每击','双机每轮','地面持续DPS','对空每轮','对空持续DPS','满研发地面DPS','满研发对空DPS'],droneSingle.map((x,i)=>[i+1,rnd(x),rnd(x*2),rnd(x*2/.68),rnd(x*2*1.45),rnd(x*2*1.45/.68),rnd(x*2/.68*1.18),rnd(x*2*1.45/.68*1.18)]))}\n\n> 表中持续 DPS 不含首次锁定/换目标旅行延迟，也不含敌人的护甲、无人机闪避、护盾、易伤或 Boss 部件分流。\n\n## 10. 五塔横向理论输出对比\n\n${mdTable(['塔等级','磁轨单体DPS','电弧三目标DPS','兵营双人DPS','黑客每目标DPS','无人机地面DPS','无人机对空DPS'],[0,1,2].map(i=>[i+1,rnd(railDps[i]),rnd(arcChains[i].reduce((a,b)=>a+b,0)/1.05),rnd(mercHit[i]*2/.9),rnd(hackerHit[i]/2.4),rnd(droneSingle[i]*2/.68),rnd(droneSingle[i]*2*1.45/.68)]))}\n\n**比较口径限制：**\n\n- 磁轨、兵营、无人机为物理伤害，通常会受护甲影响；电弧和黑客为能量伤害，受 energyResistance 影响。\n- 电弧按完整三目标链计算，黑客列为“每个目标”，其总输出会随范围内敌人数线性增长。\n- 兵营按两名佣兵同时作战计算；无人机不含换目标延迟。\n- 因此此表适合看数值上限，不代表每场战斗中的最终伤害排行。\n\n## 11. 通用伤害结算顺序与公式\n\n一次命中按以下顺序处理：\n\n1. 目标死亡或未揭露相位：直接返回 0。\n2. 研发伤害倍率在进入结算前乘入。\n3. 易伤：\`伤害 × (1 + vulnerability)\`，黑客标记为 ×1.16。\n4. 能量抗性：能量伤害 \`× (1 - energyResistance)\`。\n5. 物理护甲：物理伤害 \`× [1 - armor × (1 - armorPenetration)]\`。\n6. 磁轨专属易损：\`× (1 + railVulnerability)\`。\n7. 无人机闪避：目标未揭露时 \`× (1 - droneEvasion)\`。\n8. 防暴单位 riot 背刺：若攻击源位于其路线方向后方，\`×1.25\`。\n9. 护盾优先吸收。\n10. 若 Boss 尚有存活部件：当前剩余伤害的 35%打部件，本体只承受 65%。\n11. 剩余伤害扣除生命；生命不高于 0 时死亡。\n\n### 11.1 重要统计细节\n\n- damageDealt 记录的是结算后进入本体的 dealt；护盾吸收量和分给 Boss 部件的 35%不计入返回的 dealt。\n- 攻击事件里的 damage 是进入 applyDamage 前的数值，不一定等于实际扣除生命。\n- 能量伤害不是绝对无减免：它绕过普通护甲，但仍受 enemy.energyResistance 影响。\n\n## 12. 射程、塔位与显示投影\n\n实际战斗射程：\n\n\`等级基础射程 × 永久研发射程倍率 × 塔位 rangeScale\`\n\n特殊塔位：\n\n${mdTable(['地图','塔位（数组序号，从0开始）','rangeScale'],[['H4','1','1.30'],['H4','3','1.03'],['神舆','3','1.12'],['神舆','6','1.18'],['神舆','9','1.16'],['神舆','10','1.26'],['神舆','11','1.26']])}\n\n- 其余塔位默认 rangeScale=1。\n- 战斗场景直接使用 slot.rangeScale；自动代理/演示规划器会用 Math.max(1, rangeScale)。当前地图没有低于 1 的特殊值。\n- 2.5D 射程圈 Y 轴投影常量：\`(1672 / 941) × 0.62 ≈ ${rnd((1672/941)*.62,4)}\`。这是显示投影，不是额外战斗增益。\n\n### 12.1 满研发 + 最强 1.30 塔位的射程\n\n${mdTable(['防御塔','Lv1','Lv2','Lv3'],towers.map(t=>[t.name,...t.ranges.map(r=>rnd(r*1.09*1.3))]))}\n\n## 13. 等级视觉命名与第四级双分支\n\n二、三级名称来自生图规格；当前战斗代码只使用数值等级，不会因这些名称切换成新的战斗行为。\n\n${mdTable(['原塔 / Lv1','Lv2视觉名','Lv3视觉名','Lv4 A','Lv4 B'],[["磁轨狙击","磁轨校准台","双极加速炮","天穹裁决者","量子贯城炮"],["电弧塔","高压电弧站","霓虹电网核","霓虹雷暴核","超导潮汐塔"],["街头兵营","铬街前哨","战术承包营","铬钢不破营","血刃夜行队"],["黑客中继","入侵中继站","深网控制台","零日统御台","黑冰崩解器"],["无人机巢","蜂群发射巢","自律蜂群母站","蜂后制空母巢","蜂群湮灭工厂"]])}\n\n### 13.1 第四级数值状态\n\n${mdTable(['原塔','第四级 A 分支','第四级 B 分支','当前数值状态'],towers.map(t=>[t.name,t.branch[0],t.branch[1],'未实装：无费用/伤害/射程/冷却/机制参数']))}\n\n当前代码证据：TowerState.level 只允许 1 | 2 | 3；战斗界面 maxLevel=3；达到 3 级后禁止继续升级。第四级图像不会改变战斗行为。\n\n## 14. 三种新概念塔：全部数值缺失\n\n${mdTable(['概念塔','第四级 A','第四级 B','缺少内容'],[
['重力钉','深井封锁','天幕偏转','TowerId、建造费、1–4级伤害/射程/冷却、索敌、行为代码、升级与分支逻辑'],
['灰潮解构站','噬甲集群','清道夫协议','TowerId、建造费、1–4级伤害/射程/冷却、减甲/纳米机制、行为代码、升级与分支逻辑'],
['轨迹回写器','回滚节点','断点处决','TowerId、建造费、1–4级伤害/射程/冷却、回写机制、行为代码、升级与分支逻辑'],
])}\n\n> 这些塔虽然在 asset-generation-spec.json 中已有视觉规格和图片生成任务，但不在 TOWER_TYPES、TOWER_COMBAT 或 towerBehaviors 中，不能在当前游戏里建造。\n\n## 15. 当前尚未接入的系统\n\n- 四种普通连携与两种终极连携目前没有代码、触发条件、伤害倍率、冷却或 UI 数据。\n- 第二、三级与第四级图像目前属于生图资产工作流；战斗数值仍仅按 level 数字读取同一基础塔行为。\n- 若后续补齐第四级和新塔，至少需要确定：建造/分支升级费用、伤害、射程、冷却、目标数、伤害类型、控制强度、持续时间、触发概率、Boss规则、研发成长规则和连携规则。\n\n## 16. 数据来源\n\n- \`src/data/towers.ts\`：塔名称、建造费、定位、基础战斗常量。\n- \`src/data/balance.ts\`：研发费用、伤害/射程成长、射程投影。\n- \`src/systems/Economy.ts\`：升级费与拆除返还公式。\n- \`src/systems/towerBehaviors/*.ts\`：五塔索敌、攻击与特殊行为。\n- \`src/systems/CombatSystem.ts\`：护盾、部件、护甲、易伤、相位和背刺结算。\n- \`src/scenes/BattleScene.ts\`：等级上限、塔位倍率、主战斗循环。\n- \`src/data/maps.ts\`：特殊塔位 rangeScale。\n- \`asset-generation-spec.json\`：二三级视觉名、第四级分支与三种概念塔视觉规格。\n\n---\n\n*本报告为当前代码快照的审计结果。理论 DPS 均按持续攻击、没有帧损耗的数学值计算；实战会受目标数量、护甲、抗性、护盾、相位、换目标、单位死亡、Boss部件和塔位覆盖影响。*\n`
// remove accidental control-safe workaround if any
md=md.replaceAll('\u001b','')
md=md.replace('当前真正接入建造、升级与战斗系统的防御塔为 **5 种**，战斗等级为 **1–3 级**。五种原塔的第四级双分支已有名称和图像设计，但没有战斗数值；另外三种新塔只有视觉概念，同样没有接入战斗。','当前运行时已接入 **5种塔、1–3级**；扩展平衡数据现已补齐：**3种新塔的1–3级、8种塔共16个四级分支、4种普通连携、2种终极连携**。扩展数值已写入正式数据文件，但尚未接入实际战斗循环。')
md=md.replace('| 第四级分支 | 10 | 已有名称/图像规格；无费用、伤害、射程、冷却和行为代码 |','| 第四级分支 | 16 | 数值与规则已补齐；尚未接入分支升级和行为代码 |')
md=md.replace('| 新概念塔 | 3 | 已有 1–3 级与第四级分支视觉规格；未加入 TowerId 和战斗系统 |','| 扩展塔 | 3 | 1–3级与双分支数值已补齐；尚未加入运行时 TowerId 和建造菜单 |')
md=md.replace('| 连携系统 | 0 | 项目代码中未发现连携伤害或终极连携结算实现 |','| 连携系统 | 6 | 4种普通+2种终极数值已补齐；触发与结算代码尚未接入 |')
md=md.replace(/## 13\.[\s\S]*?(?=## 16\. 数据来源)/,`## 13. 扩展数值已经补齐\n\n本次新增的完整数值包括：\n\n- 重力钉、灰潮解构站、轨迹回写器的1–3级建造、升级、伤害、射程、冷却、目标数与特殊机制。\n- 八种塔共16个第四级分支的升级费、攻击、控制、单位、削抗、处决和经济参数。\n- 四种普通连携与两种终极连携的触发窗口、内置冷却、伤害、范围、控制与Boss规则。\n\n详细报告页面：\`http://127.0.0.1:5174/tower-expansion-report.html\`\n\n数据文件：\`src/data/towerExpansion.ts\`\n\n## 14. 八种塔的第四级分支\n\n${mdTable(['原塔','第四级A','第四级B','数值状态'],[['磁轨狙击','天穹裁决者','量子贯城炮','已完成'],['电弧塔','霓虹雷暴核','超导潮汐塔','已完成'],['街头兵营','铬钢不破营','血刃夜行队','已完成'],['黑客中继','零日统御台','黑冰崩解器','已完成'],['无人机巢','蜂后制空母巢','蜂群湮灭工厂','已完成'],['重力钉','深井封锁','天幕偏转','已完成'],['灰潮解构站','噬甲集群','清道夫协议','已完成'],['轨迹回写器','回滚节点','断点处决','已完成']])}\n\n## 15. 当前接入状态\n\n- **数值层：已完成。** 所有扩展参数均集中在 \`src/data/towerExpansion.ts\`。\n- **运行时：尚未完成。** 当前可玩战斗仍只有五塔、最高三级。\n- 仍需实现建造菜单扩展、第四级分支选择、三种新塔行为、连携标记/冷却/结算和对应UI。\n\n`)
md=md.replace('- `asset-generation-spec.json`：二三级视觉名、第四级分支与三种概念塔视觉规格。','- `asset-generation-spec.json`：二三级视觉名、第四级分支与三种概念塔视觉规格。\n- `src/data/towerExpansion.ts`：三种扩展塔、16个第四级分支、4个普通连携与2个终极连携的完整数值。')

const sections = md.split('\n## ').map((part,i)=> i===0 ? part : '## '+part)
function inline(s){return esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')}
function mdToHtml(src){
  const lines=src.split('\n'); let out='', list=false, ol=false, quote=false
  const close=()=>{if(list){out+='</ul>';list=false} if(ol){out+='</ol>';ol=false} if(quote){out+='</blockquote>';quote=false}}
  for(let i=0;i<lines.length;i++){
    const l=lines[i]
    if(l.startsWith('| ')){
      close(); const block=[]; while(i<lines.length&&lines[i].startsWith('|')) block.push(lines[i++]); i--
      const parse=x=>x.slice(1,-1).split('|').map(v=>v.trim()); const heads=parse(block[0]); const rows=block.slice(2).map(parse)
      out+=htmlTable(heads,rows); continue
    }
    if(/^# /.test(l)){close();out+=`<h1>${inline(l.slice(2))}</h1>`;continue}
    if(/^## /.test(l)){close();out+=`<h2>${inline(l.slice(3))}</h2>`;continue}
    if(/^### /.test(l)){close();out+=`<h3>${inline(l.slice(4))}</h3>`;continue}
    if(l.startsWith('> ')){if(!quote){close();out+='<blockquote>';quote=true}out+=`<p>${inline(l.slice(2))}</p>`;continue}else if(quote){out+='</blockquote>';quote=false}
    if(/^\d+\. /.test(l)){if(!ol){close();out+='<ol>';ol=true}out+=`<li>${inline(l.replace(/^\d+\. /,''))}</li>`;continue}else if(ol){out+='</ol>';ol=false}
    if(l.startsWith('- ')){if(!list){close();out+='<ul>';list=true}out+=`<li>${inline(l.slice(2))}</li>`;continue}else if(list){out+='</ul>';list=false}
    if(l==='---'){close();out+='<hr>';continue}
    if(!l.trim()){close();continue}
    out+=`<p>${inline(l)}</p>`
  }
  close(); return out
}
const contentHtml=mdToHtml(md)
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>霓虹防线 · 防御塔完整数值报告</title><style>
:root{color-scheme:dark;--bg:#071015;--panel:#0d1b22;--line:#1b4953;--cyan:#20f4e6;--text:#d9f7f4;--muted:#8fb5b5;--gold:#ffc96b}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#12313b 0,transparent 35%),var(--bg);color:var(--text);font:15px/1.72 "Microsoft YaHei",system-ui,sans-serif}.layout{display:grid;grid-template-columns:270px minmax(0,1fr);max-width:1500px;margin:auto}.nav{position:sticky;top:0;height:100vh;padding:28px 20px;border-right:1px solid var(--line);overflow:auto;background:#071015dd}.nav b{display:block;color:var(--cyan);font-size:18px;margin-bottom:14px}.nav a{display:block;color:var(--muted);text-decoration:none;padding:5px 8px;border-radius:6px}.nav a:hover{background:#12313b;color:#fff}.content{padding:42px 5vw 80px;min-width:0}h1{font-size:38px;color:#fff;text-shadow:0 0 18px #20f4e655;margin:0 0 24px}h2{margin-top:54px;padding-bottom:8px;border-bottom:1px solid var(--line);color:var(--cyan)}h3{color:var(--gold);margin-top:30px}p,li{max-width:1050px}code{color:#8affd9;background:#071015;padding:2px 5px;border:1px solid #19434a;border-radius:4px}.table-wrap{overflow:auto;margin:16px 0 28px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}table{width:100%;border-collapse:collapse;white-space:nowrap}th,td{padding:10px 12px;border-bottom:1px solid #15363e;text-align:left}th{position:sticky;top:0;background:#112a32;color:#7fffee}tr:hover td{background:#10252c}blockquote{margin:20px 0;padding:12px 18px;border-left:4px solid var(--gold);background:#2b211255;color:#ffe6b4}hr{border:0;border-top:1px solid var(--line);margin:50px 0}@media(max-width:850px){.layout{display:block}.nav{display:none}.content{padding:25px 16px}h1{font-size:28px}}
</style></head><body><div class="layout"><nav class="nav"><b>防御塔数值报告</b><a href="/tower-expansion-report.html">扩展塔与连携报告</a>${sections.slice(1).map((s,i)=>{const title=s.split('\n')[0].replace('## ','');return `<a href="#s${i+1}">${esc(title)}</a>`}).join('')}</nav><main class="content">${contentHtml}</main></div><script>document.querySelectorAll('h2').forEach((h,i)=>h.id='s'+(i+1))</script></body></html>`

fs.mkdirSync(path.join(root,'docs'),{recursive:true})
fs.mkdirSync(path.join(root,'public'),{recursive:true})
fs.writeFileSync(path.join(root,'docs','防御塔完整数值报告.md'),md,'utf8')
fs.writeFileSync(path.join(root,'public','tower-stats-report.html'),html,'utf8')
console.log('Generated reports')


