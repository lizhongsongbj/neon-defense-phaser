import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = path.join(root, 'public/assets/enemies/new/enemy-07-hijack-hovercraft.png')
const outputRoot = path.join(root, 'public/assets/animations/enemies')
const framesRoot = path.join(outputRoot, 'enemy-07-hijack-hovercraft-fly-frames')
const output = path.join(outputRoot, 'enemy-07-hijack-hovercraft-fly.webp')
const size = 512
const frameCount = 12
const baseSize = 448

const wave = (frame, phase = 0) => Math.sin((frame / frameCount) * Math.PI * 2 + phase)
const pulse = (frame, phase = 0) => (wave(frame, phase) + 1) / 2

async function actorFrame(frame) {
  const lift = Math.round(wave(frame) * 6)
  const drift = Math.round(wave(frame, Math.PI / 2) * 3)
  const roll = wave(frame, Math.PI / 3) * 1.15
  const scaleX = 1 + wave(frame, Math.PI / 2) * 0.009
  const scaleY = 1 - wave(frame, Math.PI / 2) * 0.012
  const width = Math.round(baseSize * scaleX)
  const height = Math.round(baseSize * scaleY)
  const actor = await sharp(source)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .rotate(roll, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .modulate({ brightness: 1.02 + pulse(frame) * 0.025, saturation: 1.05 })
    .png()
    .toBuffer()
  const meta = await sharp(actor).metadata()
  return {
    input: actor,
    left: Math.round((size - (meta.width ?? baseSize)) / 2 + drift),
    top: Math.round((size - (meta.height ?? baseSize)) / 2 + lift - 7),
  }
}

function rearEffects(frame) {
  const engine = 0.48 + pulse(frame, 0.35) * 0.5
  const secondary = 0.28 + pulse(frame, Math.PI) * 0.34
  const dash = (frame * 13) % 52
  return Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="cyan"><stop offset="0" stop-color="#efffff" stop-opacity="${engine}"/><stop offset=".18" stop-color="#49fff4" stop-opacity="${engine * .9}"/><stop offset=".55" stop-color="#00bcca" stop-opacity="${engine * .4}"/><stop offset="1" stop-color="#00a8c8" stop-opacity="0"/></radialGradient>
      <radialGradient id="mag"><stop offset="0" stop-color="#fff0ff" stop-opacity="${secondary}"/><stop offset=".3" stop-color="#ff52d8" stop-opacity="${secondary * .7}"/><stop offset="1" stop-color="#b500aa" stop-opacity="0"/></radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <g fill="none" stroke-linecap="round">
      <path d="M38 357 Q103 342 166 322" stroke="#33f7ff" stroke-width="7" opacity="${engine * .18}" filter="url(#blur)"/>
      <path d="M28 385 Q98 365 160 341" stroke="#7ffff8" stroke-width="3" opacity="${engine * .42}" stroke-dasharray="34 20" stroke-dashoffset="-${dash}"/>
      <path d="M55 414 Q111 391 171 364" stroke="#26cfe7" stroke-width="2" opacity="${engine * .3}" stroke-dasharray="18 24" stroke-dashoffset="${dash}"/>
      <path d="M95 438 Q137 414 183 392" stroke="#ff47ce" stroke-width="2" opacity="${secondary * .22}" stroke-dasharray="12 28" stroke-dashoffset="-${dash}"/>
    </g>
    <ellipse cx="258" cy="395" rx="82" ry="23" fill="url(#cyan)" opacity="${engine * .34}" filter="url(#blur)"/>
    <ellipse cx="258" cy="392" rx="45" ry="10" fill="none" stroke="#55fff5" stroke-width="4" opacity="${engine * .5}"/>
    <ellipse cx="258" cy="392" rx="28" ry="6" fill="none" stroke="#dfffff" stroke-width="2" opacity="${engine * .7}"/>
    <circle cx="77" cy="393" r="35" fill="url(#cyan)" opacity="${engine * .65}"/>
    <circle cx="446" cy="318" r="36" fill="url(#cyan)" opacity="${engine * .7}"/>
    <circle cx="430" cy="183" r="29" fill="url(#cyan)" opacity="${engine * .55}"/>
    <circle cx="330" cy="139" r="25" fill="url(#mag)" opacity="${secondary * .28}"/>
  </svg>`)
}

function frontEffects(frame) {
  const scan = pulse(frame, -Math.PI / 2)
  const blink = frame % 3 === 0 ? 1 : 0.35
  return Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <g fill="none" stroke-linecap="round">
      <ellipse cx="260" cy="260" rx="${108 + scan * 18}" ry="${52 + scan * 7}" stroke="#38f4ee" stroke-width="2" opacity="${.08 + scan * .16}" stroke-dasharray="22 34" transform="rotate(-7 260 260)"/>
      <path d="M154 278 Q258 ${223 - scan * 16} 372 270" stroke="#ff54cf" stroke-width="2" opacity="${scan * .22}" stroke-dasharray="9 24"/>
    </g>
    <g filter="url(#glow)">
      <circle cx="129" cy="160" r="7" fill="#ff52d4" opacity="${blink * .65}"/>
      <circle cx="324" cy="66" r="7" fill="#5efff4" opacity="${(.45 + scan * .55) * .7}"/>
      <circle cx="409" cy="101" r="6" fill="#ff52d4" opacity="${(.5 + (1 - scan) * .5) * .65}"/>
    </g>
  </svg>`)
}

await fs.mkdir(framesRoot, { recursive: true })
const rawFrames = []
for (let frame = 0; frame < frameCount; frame += 1) {
  const actor = await actorFrame(frame)
  const canvas = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: rearEffects(frame), left: 0, top: 0 },
      actor,
      { input: frontEffects(frame), left: 0, top: 0 },
    ])
    .png()
    .toBuffer()
  const framePath = path.join(framesRoot, `frame-${String(frame + 1).padStart(2, '0')}.png`)
  await fs.writeFile(framePath, canvas)
  rawFrames.push(await sharp(canvas).ensureAlpha().raw().toBuffer())
}

await sharp(Buffer.concat(rawFrames), { raw: { width: size, height: size * frameCount, channels: 4, pageHeight: size } })
  .webp({ quality: 94, alphaQuality: 100, effort: 6, loop: 0, delay: Array(frameCount).fill(67) })
  .toFile(output)

const metadata = await sharp(output, { animated: true }).metadata()
console.log(JSON.stringify({ output: path.relative(root, output), pages: metadata.pages, pageHeight: metadata.pageHeight, delay: metadata.delay, hasAlpha: metadata.hasAlpha }, null, 2))
