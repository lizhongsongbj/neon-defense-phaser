import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'public', 'assets', 'animations', 'enemies')
const outputDir = path.join(sourceDir, 'runtime')
const jobs = {
  gang: { move: 'enemy-01-gang-cyborg-side45-move-fixed-size.webp', death: 'enemy-01-gang-cyborg-death-kneel-8f.webp' },
  riot: { move: 'enemy-02-riot-mech-move-fixed-size.webp', attack: 'enemy-02-riot-mech-attack.webp', death: 'enemy-02-riot-mech-death.webp' },
  ninja: { move: 'enemy-03-phase-ninja-move-fixed-size.webp', attack: 'enemy-03-phase-ninja-attack.webp', death: 'enemy-03-phase-ninja-death-transparent.webp' },
  aerostat: { move: 'enemy-04-corporate-airship-fly.webp' },
  devourer: { move: 'enemy-05-data-devourer-move.webp' },
  faraday: { move: 'enemy-06-electromagnetic-riot-move.webp' },
  hijacker: { move: 'enemy-07-hijack-hovercraft-fly.webp' },
  neurohound: { move: 'enemy-08-neuro-hound-move.webp', attack: 'enemy-08-neuro-hound-attack.webp', death: 'enemy-08-neuro-hound-death.webp' },
  matriarch: { move: 'enemy-09-tissue-matriarch-move.webp', attack: 'enemy-09-tissue-matriarch-attack.webp', death: 'enemy-09-tissue-matriarch-death.webp' },
  bonebreaker: { move: 'enemy-10-bonebreaker-move.webp', attack: 'enemy-10-bonebreaker-attack.webp', death: 'enemy-10-bonebreaker-death.webp' },
}

for (const [enemyId, motions] of Object.entries(jobs)) {
  for (const [motion, filename] of Object.entries(motions)) {
    const input = path.join(sourceDir, filename)
    const metadata = await sharp(input, { animated: true }).metadata()
    const pages = metadata.pages ?? 1
    const target = path.join(outputDir, enemyId, motion)
    await fs.mkdir(target, { recursive: true })
    await Promise.all(Array.from({ length: pages }, async (_, index) => {
      const output = path.join(target, `frame-${String(index + 1).padStart(2, '0')}.webp`)
      await sharp(input, { page: index }).webp({ lossless: true, quality: 92 }).toFile(output)
    }))
    console.log(`${enemyId}/${motion}: ${pages} frames`)
  }
}
