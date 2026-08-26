import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceRoot = path.join(root, 'public/assets/animations/enemies/enemy-07-hijack-hovercraft-fly-frames')
const runtimeRoot = path.join(root, 'public/assets/animations/enemies/runtime/hijacker')
const frameCount = 12

for (const motion of ['move', 'attack']) {
  await fs.mkdir(path.join(runtimeRoot, motion), { recursive: true })
}

for (let frame = 1; frame <= frameCount; frame += 1) {
  const suffix = String(frame).padStart(2, '0')
  const source = path.join(sourceRoot, `frame-${suffix}.png`)
  const moveTarget = path.join(runtimeRoot, 'move', `frame-${suffix}.webp`)
  const attackTarget = path.join(runtimeRoot, 'attack', `frame-${suffix}.webp`)

  await sharp(source)
    .ensureAlpha()
    .webp({ lossless: true, alphaQuality: 100, effort: 6 })
    .toFile(moveTarget)

  // The runtime actor supplies recoil/tilt during attacks. Keep the complete
  // vehicle silhouette and only add a restrained energy lift to the frame.
  await sharp(source)
    .ensureAlpha()
    .modulate({ brightness: 1.045, saturation: 1.08 })
    .sharpen({ sigma: 0.45 })
    .webp({ lossless: true, alphaQuality: 100, effort: 6 })
    .toFile(attackTarget)
}

console.log(JSON.stringify({ repaired: 'hijacker', motions: ['move', 'attack'], frames: frameCount }, null, 2))
