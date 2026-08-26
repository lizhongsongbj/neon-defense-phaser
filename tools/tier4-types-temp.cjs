const fs=require('fs'); const edit=(p,f)=>{let s=fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'); fs.writeFileSync(p,f(s),'utf8')};
edit('src/systems/types.ts',s=>s.replace('  level: 1 | 2 | 3\n  spent:', '  level: 1 | 2 | 3 | 4\n  tier4BranchId: string | null\n  spent:'));
edit('src/state/EventBus.ts',s=>s.replace('  level: 1 | 2 | 3\n}', '  level: 1 | 2 | 3 | 4\n  tier4BranchId?: string | null\n}'));
edit('src/systems/SaveGame.ts',s=>s.replace('  level: number\n  spent:', '  level: number\n  tier4BranchId?: string | null\n  spent:'));
edit('src/entities/TowerActor.ts',s=>s
 .replace("import { ALL_TOWER_ACCENT_COLOR } from '../data/towerExpansion'", "import { ALL_TOWER_ACCENT_COLOR, TIER4_BRANCH_BY_ID } from '../data/towerExpansion'")
 .replace("  setLevel(level: number) {\n    this.levelTag.setText(`LV.${level}`)\n  }", "  setLevel(level: number, branchId?: string | null) {\n    const branch = branchId ? TIER4_BRANCH_BY_ID[branchId] : null\n    this.levelTag.setText(branch ? `LV.4-${branch.branch}` : `LV.${level}`)\n    if (level === 4 && branchId) {\n      const key = `tower-tier4-${branchId}`\n      if (this.scene.textures.exists(key)) this.sprite.setTexture(key).setDisplaySize(this.baseSize, this.baseSize)\n    }\n  }"));
