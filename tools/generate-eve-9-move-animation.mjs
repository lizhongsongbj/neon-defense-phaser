import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = path.join(root, 'public/assets/enemies/mother-city-eve-9-clean-no-white.png')
const animationRoot = path.join(root, 'public/assets/animations/enemies')
const runtimeRoot = path.join(animationRoot, 'runtime/eve/move')
const output = path.join(animationRoot, 'boss-eve-9-move.webp')
const previewFramesRoot = path.join(animationRoot, 'boss-eve-9-move-frames')
const size = 512
const frameCount = 12
const baseSize = 444
const delay = 67

const wave = (frame, phase = 0) => Math.sin((frame / frameCount) * Math.PI * 2 + phase)
const pulse = (frame, phase = 0) => (wave(frame, phase) + 1) / 2

function energyLayer(frame) {
  const core = 0.45 + pulse(frame) * 0.5
  const side = 0.34 + pulse(frame, Math.PI) * 0.42
  const ring = 0.18 + pulse(frame, -Math.PI / 2) * 0.22
  const rotation = frame * 7
  return Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="core"><stop offset="0" stop-color="#efffff" stop-opacity="${core}"/><stop offset=".22" stop-color="#69fff5" stop-opacity="${core * .88}"/><stop offset=".58" stop-color="#00bcd4" stop-opacity="${core * .38}"/><stop offset="1" stop-color="#00a6c8" stop-opacity="0"/></radialGradient>
      <radialGradient id="red"><stop offset="0" stop-color="#fff1e8" stop-opacity="${core * .78}"/><stop offset=".2" stop-color="#ff7659" stop-opacity="${core * .72}"/><stop offset=".65" stop-color="#c6262e" stop-opacity="${core * .25}"/><stop offset="1" stop-color="#8a111b" stop-opacity="0"/></radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <g filter="url(#blur)">
      <circle cx="256" cy="285" r="54" fill="url(#red)" opacity="${core * .68}"/>
      <circle cx="108" cy="271" r="34" fill="url(#core)" opacity="${side}"/>
      <circle cx="391" cy="282" r="35" fill="url(#core)" opacity="${side * .96}"/>
      <circle cx="292" cy="403" r="34" fill="url(#core)" opacity="${side * .88}"/>
    </g>
    <g fill="none" transform="rotate(${rotation} 256 286)">
      <ellipse cx="256" cy="286" rx="151" ry="88" stroke="#62fff5" stroke-width="2" opacity="${ring}" stroke-dasharray="18 36"/>
      <ellipse cx="256" cy="286" rx="122" ry="68" stroke="#ff5a50" stroke-width="1.5" opacity="${ring * .7}" stroke-dasharray="10 28"/>
    </g>
  </svg>`)
}

function foregroundLayer(frame) {
  const scan = pulse(frame, Math.PI / 3)
  const blink = frame % 3 === 0 ? 1 : 0.4
  return Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <g fill="none" stroke-linecap="round">
      <ellipse cx="256" cy="286" rx="${132 + scan * 8}" ry="${72 + scan * 5}" stroke="#66fff5" stroke-width="2" opacity="${.08 + scan * .13}" stroke-dasharray="14 32" transform="rotate(-11 256 286)"/>
    </g>
    <g filter="url(#glow)">
      <circle cx="108" cy="271" r="6" fill="#dfffff" opacity="${blink * .72}"/>
      <circle cx="391" cy="282" r="6" fill="#dfffff" opacity="${(.4 + scan * .6) * .72}"/>
      <circle cx="292" cy="403" r="6" fill="#dfffff" opacity="${(.45 + (1 - scan) * .55) * .7}"/>
      <circle cx="256" cy="286" r="7" fill="#fff0e8" opacity="${(.5 + scan * .5) * .68}"/>
    </g>
  </svg>`)
}

async function actorLayer(frame) {
  const lift = Math.round(wave(frame) * 7)
  const drift = Math.round(wave(frame, Math.PI / 2) * 4)
  const roll = wave(frame, Math.PI / 3) * 0.85
  const breathe = wave(frame, Math.PI / 2)
  const width = Math.round(baseSize * (1 + breathe * 0.008))
  const height = Math.round(baseSize * (1 - breathe * 0.01))
  const actor = await sharp(source)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .rotate(roll, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .modulate({ brightness: 1.01 + pulse(frame) * 0.025, saturation: 1.04 })
    .png()
    .toBuffer()
  const meta = await sharp(actor).metadata()
  return {
    input: actor,
    left: Math.round((size - (meta.width ?? width)) / 2 + drift),
    top: Math.round((size - (meta.height ?? height)) / 2 + lift - 5),
  }
}

await fs.mkdir(runtimeRoot, { recursive: true })
await fs.mkdir(previewFramesRoot, { recursive: true })
const rawFrames = []
for (let frame = 0; frame < frameCount; frame += 1) {
  const actor = await actorLayer(frame)
  const canvas = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: energyLayer(frame), left: 0, top: 0 },
      actor,
      { input: foregroundLayer(frame), left: 0, top: 0 },
    ])
    .png()
    .toBuffer()
  const suffix = String(frame + 1).padStart(2, '0')
  await sharp(canvas).webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(path.join(runtimeRoot, `frame-${suffix}.webp`))
  await fs.writeFile(path.join(previewFramesRoot, `frame-${suffix}.png`), canvas)
  rawFrames.push(await sharp(canvas).ensureAlpha().raw().toBuffer())
}

await sharp(Buffer.concat(rawFrames), { raw: { width: size, height: size * frameCount, channels: 4, pageHeight: size } })
  .webp({ quality: 94, alphaQuality: 100, effort: 6, loop: 0, delay: Array(frameCount).fill(delay) })
  .toFile(output)

const metadata = await sharp(output, { animated: true }).metadata()
console.log(JSON.stringify({ output: path.relative(root, output), runtimeFrames: frameCount, pages: metadata.pages, pageHeight: metadata.pageHeight, delay: metadata.delay, hasAlpha: metadata.hasAlpha }, null, 2))
