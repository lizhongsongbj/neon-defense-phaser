import fs from 'node:fs'
let s=fs.readFileSync('src/ui/BattleHud.ts','utf8')
s=s.replace(`'energyResistance' in def && def.energyResistance < 0 ? '能量弱点' : null,`, `'energyResistance' in def && typeof def.energyResistance === 'number' && def.energyResistance < 0 ? '能量弱点' : null,`)
fs.writeFileSync('src/ui/BattleHud.ts',s,'utf8')
s=fs.readFileSync('tests/combatSystem.test.ts','utf8')
s=s.replace(`    droneEvasion: 0,\n    spawnTime: 0,`, `    droneEvasion: 0,\n    enrageThreshold: 0,\n    enrageSpeedBonus: 0,\n    healingAura: 0,\n    healingRadius: 0,\n    spawnTime: 0,`)
fs.writeFileSync('tests/combatSystem.test.ts',s,'utf8')
