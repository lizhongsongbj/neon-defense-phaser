import fs from 'node:fs'
function edit(file, transform) { const before=fs.readFileSync(file,'utf8'); const after=transform(before); if(after===before) throw new Error(`No change: ${file}`); fs.writeFileSync(file,after,'utf8') }
function once(s,a,b,label){ if(!s.includes(a)) throw new Error(`Missing ${label}`); return s.replace(a,b) }

edit('src/data/waveComposition.ts', s => {
  const start=s.indexOf('export const CAMPAIGN_ENEMY_ROSTERS')
  if(start<0) throw new Error('rosters')
  return s.slice(0,start)+`export const CAMPAIGN_ENEMY_ROSTERS: EnemyId[][] = [
  ['gang', 'riot'],
  ['gang', 'riot', 'ninja', 'neurohound'],
  ['gang', 'riot', 'ninja', 'aerostat', 'neurohound'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'neurohound', 'matriarch'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker', 'neurohound', 'matriarch', 'bonebreaker'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker', 'neurohound', 'matriarch', 'bonebreaker'],
]\n`
})

edit('src/systems/WaveSpawner.ts', s => {
  s=once(s,`    if (wave >= 6 && i % 10 === 8) planned = 'hijacker'`, `    if (wave >= 6 && i % 10 === 8) planned = 'hijacker'
    if (wave >= 3 && i % 11 === 7) planned = 'neurohound'
    if (wave >= 5 && i % 13 === 9) planned = 'matriarch'
    if (wave >= 6 && i % 12 === 10) planned = 'bonebreaker'`, 'new wave rules')
  s=once(s,`      delay: planned === 'riot' || planned === 'faraday' ? 1.15 : planned === 'hijacker' ? 0.9 : 0.72,`, `      delay: planned === 'bonebreaker' ? 1.25
        : planned === 'riot' || planned === 'faraday' ? 1.15
          : planned === 'matriarch' ? 1.05
            : planned === 'hijacker' ? 0.9
              : planned === 'neurohound' ? 0.48 : 0.72,`, 'spawn delays')
  return s
})

edit('src/systems/AutoPilot.ts', s => {
  s=once(s,`  hijacker: number
  boss: number`, `  hijacker: number
  neurohound: number
  matriarch: number
  bonebreaker: number
  boss: number`, 'mix fields')
  s=once(s,`const mix: EnemyMixEstimate = { gang: 0, riot: 0, ninja: 0, aerostat: 0, devourer: 0, faraday: 0, hijacker: 0, boss: 0 }`, `const mix: EnemyMixEstimate = { gang: 0, riot: 0, ninja: 0, aerostat: 0, devourer: 0, faraday: 0, hijacker: 0, neurohound: 0, matriarch: 0, bonebreaker: 0, boss: 0 }`, 'mix defaults')
  s=once(s,`    'arc-neon': 1 + mix.gang * 2.2 + mix.ninja * 0.6 - mix.faraday * 1.4,
    'drone-hive': 1 + mix.aerostat * 4 + mix.ninja * 0.5 - mix.hijacker * 1.5,
    'hacker-relay': 0.8 + mix.ninja * 3.2 + mix.devourer * 3.2 + mix.hijacker * 4.2 + mix.boss * 0.8,
    'mag-rail-sniper': 1 + mix.riot * 3.4 + mix.faraday * 4.2 + mix.boss * 5 + mix.devourer * 0.7,
    'street-mercenary': 1 + (mix.gang + mix.riot + mix.ninja + mix.devourer + mix.faraday) * 1.15 - mix.aerostat * 1.2,`, `    'arc-neon': 1 + mix.gang * 2.2 + mix.ninja * 0.6 + mix.neurohound * 1.5 + mix.bonebreaker * 3.1 - mix.faraday * 1.4,
    'drone-hive': 1 + mix.aerostat * 4 + mix.ninja * 0.5 + mix.neurohound * 0.8 - mix.hijacker * 1.5,
    'hacker-relay': 0.8 + mix.ninja * 3.2 + mix.devourer * 3.2 + mix.hijacker * 4.2 + mix.neurohound * 1.2 + mix.boss * 0.8,
    'mag-rail-sniper': 1 + mix.riot * 3.4 + mix.faraday * 4.2 + mix.matriarch * 3.6 + mix.boss * 5 + mix.devourer * 0.7,
    'street-mercenary': 1 + (mix.gang + mix.riot + mix.ninja + mix.devourer + mix.faraday + mix.neurohound + mix.matriarch + mix.bonebreaker) * 1.15 - mix.aerostat * 1.2,`, 'tower weights')
  return s
})

edit('src/ui/BattleHud.ts', s => once(s,
`        'droneEvasion' in def && def.droneEvasion ? '链路欺骗' : null,`,
`        'droneEvasion' in def && def.droneEvasion ? '链路欺骗' : null,
        'enrageThreshold' in def && def.enrageThreshold ? '痛觉超频' : null,
        'healingAura' in def && def.healingAura ? '生物修复' : null,
        'energyResistance' in def && def.energyResistance < 0 ? '能量弱点' : null,
        !def.mechanical && def.armor >= 0.5 ? '骨铠' : null,`, 'badges'))
