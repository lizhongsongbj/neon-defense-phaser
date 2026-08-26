import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage, enemyPosition } from '../CombatSystem'
import { findNearestRoutePoint, projectedDistance } from '../PathSystem'
import type { EnemyState, TowerState } from '../types'
import { activeTier4Branch, effectiveDamage } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

const AIR_INTERCEPT_TYPES = new Set<EnemyState['typeId']>(['hijacker', 'aerostat'])
function station(tower: TowerState, ctx: TowerAttackContext) {
  if (!tower.rallyPoint) { const p=findNearestRoutePoint(ctx.geometry,tower.source); tower.rallyPoint={x:p.x,y:p.y} }
  return tower.rallyPoint
}
export function resolveDroneHive(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat=TOWER_COMBAT['drone-hive']; const branch=activeTier4Branch(tower); const home=station(tower,ctx)
  const patrol=(branch?.stats.range ?? combat.patrolRadii[Math.min(2,tower.level-1)])*ctx.growth.range*tower.rangeScale
  const nearby=ctx.enemies.filter(e=>!e.dead&&projectedDistance(home,enemyPosition(ctx.geometry,e))<=patrol)
  const unitCount=branch?.stats.unitCount||combat.drones
  nearby.filter(e=>AIR_INTERCEPT_TYPES.has(e.typeId)&&projectedDistance(home,enemyPosition(ctx.geometry,e))<=combat.interceptRadius)
    .sort((a,b)=>b.distance-a.distance).slice(0,unitCount).forEach(e=>{e.blocked=true})
  tower.cooldown-=ctx.dt; if(tower.cooldown>0)return []
  const target=nearby.sort((a,b)=>Number(b.air)-Number(a.air)||b.distance-a.distance)[0]
  if(!target){tower.targetId=null;tower.cooldown=.08;return []}
  const retargeted=tower.targetId!==target.id; tower.targetId=target.id
  const base=branch?.stats.damage ?? combat.damage*combat.damageScale[Math.min(2,tower.level-1)]
  const damage=effectiveDamage(base*(target.air?1+(branch?.stats.flyingBonus??combat.flyingBonus):1),ctx.growth.damage)
  const events:AttackEvent[]=[]
  for(let i=0;i<unitCount;i+=1){
    const result=applyDamage(ctx.geometry,target,damage,'physical',{position:home,typeId:'drone-hive'},branch?.stats.armorPenetration??0,ctx.now)
    tower.damageDealt+=result.dealt; events.push({targetId:target.id,damage,kind:'physical',result,effect:'drone',droneIndex:i})
  }
  tower.attacks+=1
  const distance=projectedDistance(home,enemyPosition(ctx.geometry,target))
  tower.cooldown+=(branch?.stats.cooldown??combat.cooldown)+(retargeted?distance/520:0)
  return events
}
