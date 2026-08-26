import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const publicRoot = path.join(root, 'public')

const towerSources = {
  'mag-rail-sniper': 'assets/animations/towers/tower-01-magnetic-rail-attack.webp',
  'arc-neon': 'assets/animations/towers/tower-02-arc-neon-attack.webp',
  'street-mercenary': 'assets/animations/towers/tower-03-mercenary-outpost-attack.webp',
  'hacker-relay': 'assets/animations/towers/tower-04-hacker-relay-attack.webp',
  'drone-hive': 'assets/animations/towers/tower-05-drone-hive-attack.webp',
}

async function extractAnimatedWebp(id, relative) {
  const source = path.join(publicRoot, relative)
  const metadata = await sharp(source, { animated: true }).metadata()
  const pages = metadata.pages ?? 1
  const outDir = path.join(publicRoot, 'assets/animations/towers/runtime', id, 'attack')
  await fs.mkdir(outDir, { recursive: true })
  for (let page = 0; page < pages; page += 1) {
    await sharp(source, { page }).png().toFile(path.join(outDir, `frame-${String(page + 1).padStart(2, '0')}.png`))
  }
  return pages
}

const unitSources = {
  'merc-shield': 'assets/units/mercenary-shield.png',
  'merc-rifle': 'assets/units/mercenary-rifle.png',
  'merc-blade': 'assets/generated/cutout/street-mercenary-unit-2026-08-23T12-16-30-502Z.png',
  'drone-scout': 'assets/towers/drone-hive-unit-tight.png',
  'drone-bomber': 'assets/generated/cutout/drone-hive-unit-2026-08-23T23-59-59-999Z.png',
  'drone-queen': 'assets/towers/drone-hive-unit-generated.png',
}

const motionProfiles = {
  walk: [
    { angle: -2, scale: .91, x: -2, y: 4 }, { angle: 1, scale: .95, x: 0, y: 1 },
    { angle: 3, scale: .92, x: 2, y: 4 }, { angle: 0, scale: .96, x: 0, y: 0 },
    { angle: -3, scale: .92, x: -2, y: 4 }, { angle: 0, scale: .95, x: 0, y: 1 },
  ],
  attack: [
    { angle: 0, scale: .93, x: 0, y: 2 }, { angle: -2, scale: .96, x: 3, y: 0 },
    { angle: 4, scale: 1, x: 7, y: -1 }, { angle: -3, scale: .94, x: -4, y: 3 },
    { angle: 1, scale: .95, x: 1, y: 1 }, { angle: 0, scale: .93, x: 0, y: 2 },
  ],
  death: [
    { angle: 0, scale: .94, x: 0, y: 1 }, { angle: 14, scale: .92, x: 2, y: 5 },
    { angle: 32, scale: .88, x: 5, y: 10 }, { angle: 52, scale: .82, x: 8, y: 16 },
    { angle: 70, scale: .75, x: 11, y: 22 }, { angle: 82, scale: .68, x: 13, y: 28 },
  ],
  fly: [
    { angle: -2, scale: .91, x: -2, y: 1 }, { angle: 0, scale: .95, x: 0, y: -3 },
    { angle: 2, scale: .93, x: 2, y: 0 }, { angle: 0, scale: .96, x: 0, y: 3 },
    { angle: -2, scale: .93, x: -2, y: 0 }, { angle: 0, scale: .95, x: 0, y: -3 },
  ],
  bomb: [
    { angle: 0, scale: .94, x: 0, y: 0 }, { angle: -5, scale: .98, x: 3, y: 4 },
    { angle: 7, scale: 1, x: 7, y: 10 }, { angle: -4, scale: .91, x: -4, y: -3 },
    { angle: 2, scale: .94, x: 1, y: -1 }, { angle: 0, scale: .94, x: 0, y: 0 },
  ],
}

async function buildUnitFrames(id, relative) {
  const drone = id.startsWith('drone-')
  const motions = drone ? ['fly', 'bomb', 'death'] : ['walk', 'attack', 'death']
  const source = path.join(publicRoot, relative)
  for (const motion of motions) {
    const outDir = path.join(publicRoot, 'assets/animations/units/runtime', id, motion)
    await fs.mkdir(outDir, { recursive: true })
    for (let i = 0; i < motionProfiles[motion].length; i += 1) {
      const p = motionProfiles[motion][i]
      const size = Math.round(105 * p.scale)
      const buffer = await sharp(source)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .rotate(p.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
      await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: buffer, gravity: 'center', left: Math.max(0, Math.round((128 - size) / 2 + p.x)), top: Math.max(0, Math.round((128 - size) / 2 + p.y)) }])
        .png()
        .toFile(path.join(outDir, `frame-${String(i + 1).padStart(2, '0')}.png`))
    }
  }
}

const towerCounts = {}
for (const [id, source] of Object.entries(towerSources)) towerCounts[id] = await extractAnimatedWebp(id, source)
for (const [id, source] of Object.entries(unitSources)) await buildUnitFrames(id, source)
await fs.writeFile(path.join(publicRoot, 'assets/animations/towers/runtime/manifest.json'), JSON.stringify(towerCounts, null, 2) + '\n')
console.log(JSON.stringify(towerCounts))
