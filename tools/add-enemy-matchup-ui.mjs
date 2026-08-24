import { readFile, writeFile } from 'node:fs/promises'
async function edit(path,changes){let t=await readFile(path,'utf8');for(const [a,b] of changes){if(!t.includes(a))throw new Error(`missing in ${path}: ${a.slice(0,40)}`);t=t.replace(a,b)}await writeFile(path,t,'utf8')}
await edit('src/data/enemies.ts',[
['  droneEvasion?: number\n  moveAnimation:','  droneEvasion?: number\n  countersTower?: string\n  counteredByTower?: string\n  moveAnimation:'],
['    railVulnerability: 0.4,\n    moveAnimation:',"    railVulnerability: 0.4,\n    countersTower: '电弧塔',\n    counteredByTower: '磁轨狙击',\n    moveAnimation:"],
['    droneEvasion: 0.72,\n    moveAnimation:',"    droneEvasion: 0.72,\n    countersTower: '无人机巢',\n    counteredByTower: '黑客中继',\n    moveAnimation:"]])
await edit('src/ui/BattleHud.ts',[
["        'network' in def && def.network ? '网络' : null,","        'network' in def && def.network ? '网络' : null,\n        'energyResistance' in def && def.energyResistance ? '抗能量' : null,\n        'droneEvasion' in def && def.droneEvasion ? '链路欺骗' : null,"],
["      const shield = 'shield' in def", "      const matchup = 'countersTower' in def && def.countersTower && def.counteredByTower\n        ? `<p class=\"intel-enemy__matchup\"><span>克制 ${def.countersTower}</span><b>弱点 ${def.counteredByTower}</b></p>` : ''\n      const shield = 'shield' in def"],
['            ${components}\n            <p class="intel-enemy__trait">','            ${components}\n            ${matchup}\n            <p class="intel-enemy__trait">']])
await edit('src/styles/theme.css',[[
'.intel-enemy__components { margin: 8px 0 0; color: #c7a8bd; font-size: 8px; line-height: 1.4; }',
'.intel-enemy__components { margin: 8px 0 0; color: #c7a8bd; font-size: 8px; line-height: 1.4; }\n.intel-enemy__matchup { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0 0; font: 800 8px/1 var(--font-mono); }\n.intel-enemy__matchup span, .intel-enemy__matchup b { padding: 4px 5px; border: 1px solid currentColor; font-weight: 800; }\n.intel-enemy__matchup span { color: #ff8ac5; }\n.intel-enemy__matchup b { color: #7effa2; }']])
console.log('matchup UI updated')
