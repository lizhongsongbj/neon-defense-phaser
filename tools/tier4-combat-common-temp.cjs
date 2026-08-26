const fs=require('fs'); const edit=(p,f)=>{let s=fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'); fs.writeFileSync(p,f(s),'utf8')};
edit('src/systems/towerBehaviors/common.ts', s=>s
 .replace("import { EXPANSION_TOWER_BY_ID, isExpansionTowerId, type AllTowerId } from '../../data/towerExpansion'", "import { EXPANSION_TOWER_BY_ID, TIER4_BRANCH_BY_ID, isExpansionTowerId, type AllTowerId, type Tier4BranchDefinition } from '../../data/towerExpansion'")
 .replace("/** 塔楼当前实际射程", "export function activeTier4Branch(tower: TowerState): Tier4BranchDefinition | null {\n  if (tower.level !== 4 || !tower.tier4BranchId) return null\n  const branch = TIER4_BRANCH_BY_ID[tower.tier4BranchId]\n  return branch?.towerId === tower.typeId ? branch : null\n}\n\n/** 塔楼当前实际射程")
 .replace("  const baseRange = isExpansionTowerId(typeId)", "  const branch = activeTier4Branch(tower)\n  const baseRange = branch ? branch.stats.range : isExpansionTowerId(typeId)")
 .replace("EXPANSION_TOWER_BY_ID[typeId].levels[tower.level - 1].range", "EXPANSION_TOWER_BY_ID[typeId].levels[Math.min(2, tower.level - 1)].range")
 .replace("(TOWER_COMBAT[typeId] as { ranges: [number, number, number] }).ranges[tower.level - 1]", "(TOWER_COMBAT[typeId] as { ranges: [number, number, number] }).ranges[Math.min(2, tower.level - 1)]"));
edit('src/systems/towerBehaviors/ExpansionTowers.ts', s=>s
 .replace("import { effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'", "import { activeTier4Branch, effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'")
 .replace("  const stats = definition.levels[tower.level - 1]", "  const branch = activeTier4Branch(tower)\n  const stats = branch?.stats ?? definition.levels[Math.min(2, tower.level - 1)]")
 .replace("  const includeAir = definition.targetLayer !== 'ground'", "  const targetLayer = branch?.targetLayer ?? definition.targetLayer\n  const includeAir = targetLayer !== 'ground'")
 .replace(".filter((enemy) => definition.targetLayer !== 'air' || enemy.air)", ".filter((enemy) => targetLayer !== 'air' || enemy.air)")
 .replace("    const echoScale = typeId === 'trajectory-rewriter' ? 1 + stats.echoRatio : 1", "    const echoScale = typeId === 'trajectory-rewriter' ? 1 + stats.echoRatio : 1")
 .replace("definition.damageKind, { position", "branch?.damageKind ?? definition.damageKind, { position")
 .replace("kind: definition.damageKind, result", "kind: branch?.damageKind ?? definition.damageKind, result"));
