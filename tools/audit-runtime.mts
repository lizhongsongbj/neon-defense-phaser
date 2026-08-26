import { ENEMY_RUNTIME_ANIMATIONS } from '../src/data/enemyRuntimeAnimations'
import fs from 'node:fs'
import path from 'node:path'

const missing: string[] = []
let total = 0
for (const [id, set] of Object.entries(ENEMY_RUNTIME_ANIMATIONS)) {
  for (const [motion, spec] of Object.entries(set)) {
    if (!spec) continue
    for (let frame = 1; frame <= spec.frames; frame += 1) {
      total += 1
      const assetPath = path.join('public', 'assets', 'animations', 'enemies', 'runtime', id, motion, `frame-${String(frame).padStart(2, '0')}.webp`)
      if (!fs.existsSync(assetPath)) missing.push(assetPath)
    }
  }
}
console.log(JSON.stringify({ total, missing }, null, 2))
