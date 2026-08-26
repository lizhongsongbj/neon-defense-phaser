const fs = require('fs');
function edit(path, fn){ const s=fs.readFileSync(path,'utf8').replace(/^\uFEFF/,''); fs.writeFileSync(path,fn(s),'utf8'); }
edit('src/data/towerExpansion.ts', s => {
  const anchor = 'export interface SynergyDefinition {';
  if (s.includes('TIER4_BRANCH_IMAGE_BY_ID')) return s;
  const block = `export const TIER4_BRANCH_IMAGE_BY_ID: Readonly<Record<string, string>> = {\n  'rail-sky-judicator': 'assets/generated/cutout/mag-rail-sky-verdict-2026-08-23T11-25-23-710Z.png',\n  'rail-quantum-citybreaker': 'assets/generated/cutout/mag-rail-city-piercer-2026-08-23T11-25-22-347Z.png',\n  'arc-neon-storm-core': 'assets/generated/cutout/arc-neon-storm-core-2026-08-23T11-25-45-551Z.png',\n  'arc-superconductor-tide': 'assets/generated/cutout/arc-neon-superconductor-2026-08-23T11-25-37-154Z.png',\n  'merc-chrome-fortress': 'assets/generated/cutout/mercenary-chrome-fortress-2026-08-23T11-25-49-027Z.png',\n  'merc-night-blades': 'assets/generated/cutout/mercenary-night-blades-2026-08-23T11-25-52-392Z.png',\n  'hacker-zero-day-control': 'assets/generated/cutout/hacker-zero-day-control-2026-08-23T11-11-56-802Z.png',\n  'hacker-black-ice-breaker': 'assets/generated/cutout/hacker-black-ice-breaker-2026-08-23T11-13-18-369Z.png',\n  'drone-swarm-interceptor': 'assets/generated/cutout/drone-swarm-annihilator-2026-08-23T11-15-14-016Z.png',\n  'drone-queen-carrier': 'assets/generated/cutout/drone-queen-air-carrier-2026-08-23T11-26-55-854Z.png',\n  'gravity-deep-well-lockdown': 'assets/towers/new-concepts/simplified/gravity-nail-level-4-deep-well-lockdown.png',\n  'gravity-sky-deflection': 'assets/towers/new-concepts/simplified/gravity-nail-level-4-sky-deflection.png',\n  'grey-armor-eater-swarm': 'assets/towers/new-concepts/revised/grey-tide-level-4-armor-eater-swarm.png',\n  'grey-scavenger-protocol': 'assets/towers/new-concepts/revised/grey-tide-level-4-scavenger-protocol.png',\n  'trajectory-rollback-node': 'assets/towers/new-concepts/revised/trajectory-rewriter-level-4-rollback-node.png',\n  'trajectory-breakpoint-execution': 'assets/towers/new-concepts/revised/trajectory-rewriter-level-4-breakpoint-execution.png',\n}\n\nexport function tier4BranchesForTower(towerId: AllTowerId): readonly Tier4BranchDefinition[] {\n  return TIER4_BRANCHES.filter((branch) => branch.towerId === towerId)\n}\n\nexport function tier4BranchById(branchId: string | null | undefined): Tier4BranchDefinition | null {\n  if (!branchId) return null\n  return TIER4_BRANCH_BY_ID[branchId] ?? null\n}\n\n`;
  if (!s.includes(anchor)) throw new Error('synergy anchor missing');
  return s.replace(anchor, block + anchor);
});

edit('src/systems/types.ts', s => s
  .replace('level: 1 | 2 | 3\n  spent:', 'level: 1 | 2 | 3 | 4\n  tier4BranchId: string | null\n  spent:'));
edit('src/state/EventBus.ts', s => s
  .replace('level: 1 | 2 | 3\n}', 'level: 1 | 2 | 3 | 4\n  tier4BranchId?: string | null\n}'));
edit('src/systems/SaveGame.ts', s => s
  .replace('level: number\n  spent:', 'level: number\n  tier4BranchId?: string | null\n  spent:'));
