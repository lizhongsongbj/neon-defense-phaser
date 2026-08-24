import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const outputRoot = path.join(root, 'public/assets/animations/enemies')
const size = 512
const frameCount = 14

const enemies = [
  { id: 'enemy-08-neuro-hound', source: 'public/assets/enemies/new/enemy-08-neuro-hound.png', accent: '#00ecff', danger: '#ff315c', base: 430 },
  { id: 'enemy-09-tissue-matriarch', source: 'public/assets/enemies/new/enemy-09-tissue-matriarch.png', accent: '#76ff7a', danger: '#ff5caf', base: 420 },
  { id: 'enemy-10-bonebreaker', source: 'public/assets/enemies/new/enemy-10-bonebreaker.png', accent: '#19dfff', danger: '#ff8a33', base: 440 },
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const wave = (frame, phase = 0) => Math.sin((frame / frameCount) * Math.PI * 2 + phase)

async function actorLayer(source, base, options = {}) {
  const sx = options.scaleX ?? 1
  const sy = options.scaleY ?? 1
  const width = Math.max(1, Math.round(base * sx))
  const height = Math.max(1, Math.round(base * sy))
  let image = sharp(source).resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  if (options.rotate) image = image.rotate(options.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  if (options.brightness || options.saturation) {
    image = image.modulate({ brightness: options.brightness ?? 1, saturation: options.saturation ?? 1 })
  }
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const opacity = clamp(options.opacity ?? 1, 0, 1)
  if (opacity < 1) for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * opacity)
  return sharp(data, { raw: info }).png().toBuffer()
}

function effectsSvg(kind, enemy, frame) {
  const t = frame / (frameCount - 1)
  const pulse = (wave(frame) + 1) / 2
  if (kind === 'move') {
    if (enemy.id.includes('neuro')) return `<svg width="512" height="512"><g fill="none" stroke="${enemy.accent}" stroke-linecap="round" opacity="${0.16 + pulse * 0.18}"><path d="M110 390 L48 404" stroke-width="7"/><path d="M135 415 L78 444" stroke-width="4"/></g></svg>`
    if (enemy.id.includes('matriarch')) return `<svg width="512" height="512"><g fill="none" stroke="${enemy.accent}" opacity="${0.12 + pulse * 0.2}"><ellipse cx="256" cy="397" rx="${110 + pulse * 22}" ry="${24 + pulse * 5}" stroke-width="5"/><ellipse cx="256" cy="397" rx="${76 + pulse * 16}" ry="${15 + pulse * 4}" stroke-width="3"/></g></svg>`
    return `<svg width="512" height="512"><g fill="none" stroke="${enemy.accent}" opacity="${0.1 + pulse * 0.18}"><path d="M92 421 Q256 ${438 + pulse * 8} 420 421" stroke-width="5"/><path d="M132 438 Q256 ${452 + pulse * 5} 380 438" stroke-width="3"/></g></svg>`
  }
  if (kind === 'attack') {
    const strike = Math.exp(-Math.pow((t - 0.58) / 0.16, 2))
    if (enemy.id.includes('neuro')) return `<svg width="512" height="512"><g fill="none" stroke-linecap="round" opacity="${strike}"><path d="M105 165 L430 318" stroke="${enemy.danger}" stroke-width="13"/><path d="M92 198 L418 347" stroke="${enemy.accent}" stroke-width="6"/><circle cx="144" cy="240" r="${18 + strike * 22}" stroke="${enemy.danger}" stroke-width="7"/></g></svg>`
    if (enemy.id.includes('matriarch')) return `<svg width="512" height="512"><g fill="none" opacity="${0.1 + strike * 0.9}"><circle cx="256" cy="268" r="${50 + strike * 95}" stroke="${enemy.accent}" stroke-width="9"/><circle cx="256" cy="268" r="${30 + strike * 62}" stroke="${enemy.danger}" stroke-width="5"/><path d="M256 270 C170 215 130 170 84 124 M256 270 C340 212 390 172 438 126" stroke="${enemy.accent}" stroke-width="6"/></g></svg>`
    return `<svg width="512" height="512"><g fill="none" opacity="${strike}"><ellipse cx="260" cy="418" rx="${55 + strike * 155}" ry="${15 + strike * 35}" stroke="${enemy.danger}" stroke-width="11"/><ellipse cx="260" cy="418" rx="${28 + strike * 105}" ry="${8 + strike * 22}" stroke="${enemy.accent}" stroke-width="5"/><path d="M170 390 L125 345 M345 390 L395 345" stroke="${enemy.danger}" stroke-width="8"/></g></svg>`
  }
  const fade = clamp((t - 0.35) / 0.65, 0, 1)
  return `<svg width="512" height="512"><g fill="${enemy.danger}" opacity="${fade * 0.72}"><circle cx="${130 + frame * 13}" cy="${190 + frame * 5}" r="6"/><circle cx="${385 - frame * 9}" cy="${235 + frame * 7}" r="5"/><rect x="${190 + frame * 6}" y="${120 + frame * 9}" width="10" height="4" transform="rotate(${frame * 17})"/><rect x="${330 - frame * 5}" y="${160 + frame * 8}" width="8" height="3" transform="rotate(${-frame * 21})"/></g><g fill="none" stroke="${enemy.accent}" opacity="${fade * 0.5}"><path d="M120 ${350 + frame * 2} L410 ${330 + frame * 4}" stroke-width="4" stroke-dasharray="18 14"/></g></svg>`
}

function motion(enemy, kind, frame) {
  const t = frame / (frameCount - 1)
  if (kind === 'move') {
    if (enemy.id.includes('neuro')) return { x: Math.round(wave(frame) * 9), y: Math.round(wave(frame * 2) * 8), sx: 1 + wave(frame) * 0.018, sy: 1 - wave(frame) * 0.025, rotate: wave(frame) * 1.5 }
    if (enemy.id.includes('matriarch')) return { x: Math.round(wave(frame) * 4), y: Math.round(wave(frame) * 7), sx: 1 + wave(frame, 1) * 0.018, sy: 1 + wave(frame, 1) * 0.025, rotate: wave(frame) * 0.7 }
    return { x: Math.round(wave(frame) * 4), y: Math.round(Math.abs(wave(frame)) * 9), sx: 1 + wave(frame) * 0.012, sy: 1 - Math.abs(wave(frame)) * 0.025, rotate: wave(frame) * 0.8 }
  }
  if (kind === 'attack') {
    const windup = t < 0.38 ? t / 0.38 : 1
    const strike = Math.exp(-Math.pow((t - 0.58) / 0.13, 2))
    if (enemy.id.includes('neuro')) return { x: Math.round(-22 * windup + 88 * strike), y: Math.round(8 * strike), sx: 1 + strike * 0.12, sy: 1 - strike * 0.08, rotate: -5 * windup + 10 * strike }
    if (enemy.id.includes('matriarch')) return { x: 0, y: Math.round(12 * windup - 17 * strike), sx: 1 + strike * 0.09, sy: 1 + strike * 0.13, rotate: wave(frame) * 1.2 }
    return { x: Math.round(-12 * windup + 26 * strike), y: Math.round(-20 * windup + 46 * strike), sx: 1 + strike * 0.08, sy: 1 - strike * 0.1, rotate: -3 * windup + 6 * strike }
  }
  const fall = clamp((t - 0.18) / 0.82, 0, 1)
  return { x: Math.round(fall * (enemy.id.includes('matriarch') ? 24 : 42)), y: Math.round(fall * 75), sx: 1 - fall * 0.16, sy: 1 - fall * 0.42, rotate: fall * (enemy.id.includes('neuro') ? 18 : enemy.id.includes('matriarch') ? -12 : 14), opacity: 1 - clamp((t - 0.68) / 0.32, 0, 1) }
}

async function makeAnimation(enemy, kind) {
  const frames = []
  for (let frame = 0; frame < frameCount; frame += 1) {
    const m = motion(enemy, kind, frame)
    const actor = await actorLayer(path.join(root, enemy.source), enemy.base, {
      scaleX: m.sx, scaleY: m.sy, rotate: m.rotate, opacity: m.opacity,
      brightness: kind === 'attack' ? 1.02 : 1,
    })
    const meta = await sharp(actor).metadata()
    const left = Math.round((size - (meta.width ?? enemy.base)) / 2 + m.x)
    const top = Math.round((size - (meta.height ?? enemy.base)) / 2 + m.y)
    const effect = Buffer.from(effectsSvg(kind, enemy, frame))
    const composites = kind === 'move'
      ? [{ input: effect, top: 0, left: 0 }, { input: actor, top, left }]
      : [{ input: actor, top, left }, { input: effect, top: 0, left: 0 }]
    const canvas = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(composites).png().toBuffer()
    frames.push(await sharp(canvas).ensureAlpha().raw().toBuffer())
  }
  const strip = Buffer.concat(frames)
  const delays = Array.from({ length: frameCount }, (_, index) => kind === 'death' && index === frameCount - 1 ? 420 : kind === 'move' ? 78 : 85)
  const output = path.join(outputRoot, `${enemy.id}-${kind}.webp`)
  await sharp(strip, { raw: { width: size, height: size * frameCount, channels: 4, pageHeight: size } })
    .webp({ quality: 92, alphaQuality: 100, effort: 5, loop: 0, delay: delays })
    .toFile(output)
  return output
}

await fs.mkdir(outputRoot, { recursive: true })
for (const enemy of enemies) {
  for (const kind of ['move', 'attack', 'death']) {
    const output = await makeAnimation(enemy, kind)
    const meta = await sharp(output, { animated: true }).metadata()
    console.log(path.relative(root, output), `${meta.pages} frames`)
  }
}


