import { readFile, writeFile } from 'node:fs/promises'

async function edit(path, fn) { const before=await readFile(path,'utf8'); const after=fn(before); if(after===before) throw new Error(`No change: ${path}`); await writeFile(path,after,'utf8') }

await edit('src/data/enemies.ts', text => text
  .replace("export type EnemyId = 'gang' | 'riot' | 'ninja' | 'aerostat' | 'devourer'", "export type EnemyId = 'gang' | 'riot' | 'ninja' | 'aerostat' | 'devourer' | 'faraday' | 'hijacker'")
  .replace('  network?: boolean\n  moveAnimation: string', '  network?: boolean\n  energyResistance?: number\n  railVulnerability?: number\n  droneEvasion?: number\n  moveAnimation: string')
  .replace("  devourer: {\n", "  devourer: {\n")
  .replace("  },\n}\n\nexport const ENEMY_IDS: EnemyId[] = ['gang', 'riot', 'ninja', 'aerostat', 'devourer']", `  },
  faraday: {
    id: 'faraday',
    name: '�������',
    hp: 680,
    speed: 18,
    armor: 0.28,
    reward: 56,
    attack: 28,
    image: 'assets/enemies/new/enemy-06-electromagnetic-riot.png',
    size: 0.056,
    mechanical: true,
    energyResistance: 0.62,
    railVulnerability: 0.4,
    moveAnimation: 'assets/enemies/new/enemy-06-electromagnetic-riot.png',
    trait: '���������Ǽ���62%�����˺������Ƶ绡������гװ�׷챻�Ź�ѻ������ش�',
  },
  hijacker: {
    id: 'hijacker',
    name: '�ٳָ�����',
    hp: 430,
    shield: 150,
    speed: 31,
    armor: 0.1,
    reward: 54,
    attack: 0,
    image: 'assets/enemies/new/enemy-07-hijack-hovercraft.png',
    size: 0.061,
    air: true,
    mechanical: true,
    network: true,
    droneEvasion: 0.72,
    moveAnimation: 'assets/enemies/new/enemy-07-hijack-hovercraft.png',
    trait: 'δ��ɨ��ʱ��ƭ���˻���·������72%���˻��˺����ڿ��м̿��ƽ�αװ��ʩ������',
  },
}

export const ENEMY_IDS: EnemyId[] = ['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker']`))

await edit('src/systems/types.ts', text => text.replace('  phaseCapable: boolean\n  spawnTime:', '  phaseCapable: boolean\n  energyResistance: number\n  railVulnerability: number\n  droneEvasion: number\n  spawnTime:'))

await edit('src/systems/CombatSystem.ts', text => text
  .replace('  phase: boolean\n  components:', '  phase: boolean\n  energyResistance: number\n  railVulnerability: number\n  droneEvasion: number\n  components:')
  .replace('      phase: false,\n      components:', '      phase: false,\n      energyResistance: 0,\n      railVulnerability: 0,\n      droneEvasion: 0,\n      components:')
  .replace('    phase: Boolean(def.phase),\n    components:', '    phase: Boolean(def.phase),\n    energyResistance: def.energyResistance ?? 0,\n    railVulnerability: def.railVulnerability ?? 0,\n    droneEvasion: def.droneEvasion ?? 0,\n    components:')
  .replace('    phaseCapable: def.phase,\n    spawnTime:', '    phaseCapable: def.phase,\n    energyResistance: def.energyResistance,\n    railVulnerability: def.railVulnerability,\n    droneEvasion: def.droneEvasion,\n    spawnTime:')
  .replace("  if (kind === 'physical') {\n    damage *= 1 - enemy.armor * (1 - armorPenetration)\n  }", `  if (kind === 'energy') {
    damage *= 1 - enemy.energyResistance
  }
  if (kind === 'physical') {
    damage *= 1 - enemy.armor * (1 - armorPenetration)
  }
  if (source?.typeId === 'mag-rail-sniper') {
    damage *= 1 + enemy.railVulnerability
  }
  if (source?.typeId === 'drone-hive' && now >= enemy.revealedUntil) {
    damage *= 1 - enemy.droneEvasion
  }`))

for (const file of ['ArcNeon.ts','DroneHive.ts','HackerRelay.ts','MagRailSniper.ts','StreetMercenary.ts']) {
  const path=`src/systems/towerBehaviors/${file}`
  const towerId = ({ArcNeon:'arc-neon',DroneHive:'drone-hive',HackerRelay:'hacker-relay',MagRailSniper:'mag-rail-sniper',StreetMercenary:'street-mercenary'})[file.replace('.ts','')]
  await edit(path, text => text.replaceAll('{ position: tower.source }', `{ position: tower.source, typeId: '${towerId}' }`))
}

await edit('src/data/waveComposition.ts', text => text.replace(`  ['gang', 'riot', 'ninja', 'aerostat', 'devourer'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer'],`, `  ['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker'],`))

await edit('src/systems/WaveSpawner.ts', text => text
  .replace("    if (wave >= 4 && i % 8 === 6) planned = 'aerostat'", "    if (wave >= 4 && i % 8 === 6) planned = 'aerostat'\n    if (wave >= 5 && i % 9 === 4) planned = 'faraday'\n    if (wave >= 6 && i % 10 === 8) planned = 'hijacker'")
  .replace("      delay: planned === 'riot' ? 1.15 : 0.72,", "      delay: planned === 'riot' || planned === 'faraday' ? 1.15 : planned === 'hijacker' ? 0.9 : 0.72,"))

await edit('src/systems/AutoPilot.ts', text => text
  .replace('  devourer: number\n  boss:', '  devourer: number\n  faraday: number\n  hijacker: number\n  boss:')
  .replace('{ gang: 0, riot: 0, ninja: 0, aerostat: 0, devourer: 0, boss: 0 }', '{ gang: 0, riot: 0, ninja: 0, aerostat: 0, devourer: 0, faraday: 0, hijacker: 0, boss: 0 }')
  .replace("'arc-neon': 1 + mix.gang * 2.2 + mix.ninja * 0.6,", "'arc-neon': 1 + mix.gang * 2.2 + mix.ninja * 0.6 - mix.faraday * 1.4,")
  .replace("'drone-hive': 1 + mix.aerostat * 4 + mix.ninja * 0.5,", "'drone-hive': 1 + mix.aerostat * 4 + mix.ninja * 0.5 - mix.hijacker * 1.5,")
  .replace("'hacker-relay': 0.8 + mix.ninja * 3.2 + mix.devourer * 3.2 + mix.boss * 0.8,", "'hacker-relay': 0.8 + mix.ninja * 3.2 + mix.devourer * 3.2 + mix.hijacker * 4.2 + mix.boss * 0.8,")
  .replace("'mag-rail-sniper': 1 + mix.riot * 3.4 + mix.boss * 5 + mix.devourer * 0.7,", "'mag-rail-sniper': 1 + mix.riot * 3.4 + mix.faraday * 4.2 + mix.boss * 5 + mix.devourer * 0.7,")
  .replace('mix.gang + mix.riot + mix.ninja + mix.devourer', 'mix.gang + mix.riot + mix.ninja + mix.devourer + mix.faraday')
  .replace("mix.ninja + mix.devourer > 0", "mix.ninja + mix.devourer + mix.hijacker > 0"))

await edit('src/audio/voiceManifest.ts', text => text
  .replace("  | 'devourer'", "  | 'devourer'\n  | 'faraday'\n  | 'hijacker'")
  .replace("  devourer: {\n    spawn: ['data_devourer/open_port.mp3', 'data_devourer/strip_access.mp3', 'data_devourer/memory_belongs.mp3'],\n  },", "  devourer: {\n    spawn: ['data_devourer/open_port.mp3', 'data_devourer/strip_access.mp3', 'data_devourer/memory_belongs.mp3'],\n  },\n  faraday: { spawn: [] },\n  hijacker: { spawn: [] },")
  .replace("['gang', 'riot', 'ninja', 'aerostat', 'devourer']", "['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker']"))

console.log('enemy mechanics updated')

