import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const SIZE = 512
const FRAMES = 12
const ROOT = 'public/assets/animations/enemies'
const forms = [
  { stage: 2, source: 'public/assets/enemies/boss-forms/eve-9-stage-2-carrier.png', accent: '#36f4ff', secondary: '#b8ffff', coreY: 0.51 },
  { stage: 3, source: 'public/assets/enemies/boss-forms/eve-9-stage-3-core.png', accent: '#ff335f', secondary: '#fff0f5', coreY: 0.46 },
]

const pad = (n) => String(n).padStart(2, '0')
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

async function renderSprite(source, frame, motion) {
  const phase = (frame / FRAMES) * Math.PI * 2
  const attack = motion === 'attack'
  const charge = attack ? Math.sin(clamp(frame / 7, 0, 1) * Math.PI / 2) : 0
  const release = attack ? Math.max(0, 1 - Math.abs(frame - 8) / 3) : 0
  const scale = attack
    ? 0.975 + charge * 0.045 - release * 0.018
    : 0.985 + Math.sin(phase) * 0.014
  const angle = attack
    ? Math.sin(phase) * 0.45 - release * 0.7
    : Math.sin(phase) * 1.15
  const y = attack
    ? Math.round(Math.sin(phase) * 2 + release * 4)
    : Math.round(Math.sin(phase) * 5)
  const x = Math.round(Math.cos(phase) * (attack ? 1 : 2))
  const target = Math.round(366 * scale)
  const sprite = await sharp(source)
    .resize(target, target, { fit: 'contain' })
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const meta = await sharp(sprite).metadata()
  return { sprite, left: Math.round((SIZE - (meta.width ?? target)) / 2 + x), top: Math.round((SIZE - (meta.height ?? target)) / 2 + y) }
}

function attackFx(stage, frame, accent, secondary, coreY) {
  const t = frame / (FRAMES - 1)
  const charge = Math.sin(clamp(t / 0.62, 0, 1) * Math.PI / 2)
  const release = Math.max(0, 1 - Math.abs(frame - 8) / 3)
  const cx = SIZE / 2
  const cy = SIZE * coreY
  const ring = 30 + release * (stage === 2 ? 150 : 120)
  const core = 8 + charge * 18 + release * 9
  const ringOpacity = release * 0.72
  const spokes = stage === 2 && release > 0.05
    ? Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        const r1 = 45
        const r2 = 70 + release * 115
        return `<line x1="${cx + Math.cos(a) * r1}" y1="${cy + Math.sin(a) * r1}" x2="${cx + Math.cos(a) * r2}" y2="${cy + Math.sin(a) * r2}" stroke="${accent}" stroke-width="${1 + release * 3}" opacity="${release * 0.5}"/>`
      }).join('')
    : ''
  return Buffer.from(`<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="core"><stop offset="0" stop-color="${secondary}" stop-opacity="${0.95 * charge}"/><stop offset="0.28" stop-color="${accent}" stop-opacity="${0.85 * charge}"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${core * 2.4}" fill="url(#core)" filter="url(#blur)"/>
    <circle cx="${cx}" cy="${cy}" r="${core}" fill="url(#core)"/>
    <circle cx="${cx}" cy="${cy}" r="${ring}" fill="none" stroke="${accent}" stroke-width="${2 + release * 5}" opacity="${ringOpacity}"/>
    <circle cx="${cx}" cy="${cy}" r="${ring * 0.72}" fill="none" stroke="${secondary}" stroke-width="2" opacity="${ringOpacity * 0.75}"/>
    ${spokes}
  </svg>`)
}

async function makeFrame(form, motion, index) {
  const { sprite, left, top } = await renderSprite(form.source, index, motion)
  const layers = [{ input: sprite, left, top }]
  if (motion === 'attack') layers.push({ input: attackFx(form.stage, index, form.accent, form.secondary, form.coreY), left: 0, top: 0 })
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .webp({ quality: 92, alphaQuality: 100 })
    .toBuffer()
}

for (const form of forms) {
  for (const motion of ['move', 'attack']) {
    const dir = path.join(ROOT, 'runtime', `eve-stage-${form.stage}`, motion)
    await fs.mkdir(dir, { recursive: true })
    const frames = []
    for (let i = 0; i < FRAMES; i += 1) {
      const frame = await makeFrame(form, motion, i)
      frames.push(frame)
      await fs.writeFile(path.join(dir, `frame-${pad(i + 1)}.webp`), frame)
    }
    const stacked = await sharp({ create: { width: SIZE, height: SIZE * FRAMES, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(frames.map((input, i) => ({ input, left: 0, top: i * SIZE })))
      .webp({ quality: 90, alphaQuality: 100, pageHeight: SIZE, loop: 0, delay: Array(FRAMES).fill(motion === 'move' ? 67 : 83) })
      .toBuffer()
    await fs.writeFile(path.join(ROOT, `boss-eve-9-stage-${form.stage}-${motion}.webp`), stacked)
  }
}
console.log('Generated EVE-9 stage 2/3 move and attack animations.')
