import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const runtimeRoot = path.join(root, 'public', 'assets', 'animations', 'enemies', 'runtime')
const jobs = {
  aerostat: { count: 12, accent: '#72ddff', secondary: '#ffb24a', attackKind: 'guns' },
  devourer: { count: 12, accent: '#77ffb6', secondary: '#6c8dff', attackKind: 'shield' },
  faraday: { count: 8, accent: '#ffe26b', secondary: '#ff8c3a', attackKind: 'arc' },
  hijacker: { count: 12, accent: '#64e9ff', secondary: '#b56cff', attackKind: 'hack' },
}

const esc = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
function attackSvg(id, frame, accent, secondary, kind) {
  const phase = frame / jobs[id].count
  const pulse = 0.55 + 0.45 * Math.sin(phase * Math.PI * 2)
  const a = esc(accent), b = esc(secondary)
  if (kind === 'guns') {
    const spread = 14 + Math.round(10 * pulse)
    return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round"><path d="M55 285 L12 ${260 - spread} M55 285 L8 285 M55 285 L12 ${310 + spread}" stroke="${a}" stroke-width="5" opacity=".92"/><path d="M55 285 L0 ${260 - spread}" stroke="#ffffff" stroke-width="1.5" opacity=".9"/><circle cx="55" cy="285" r="${10 + Math.round(8 * pulse)}" fill="${b}" opacity=".72"/></g></svg>`
  }
  if (kind === 'shield') {
    const r = 125 + Math.round(24 * pulse)
    return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="270" r="${r}" fill="none" stroke="${a}" stroke-width="5" opacity=".35" stroke-dasharray="18 12"/><circle cx="256" cy="270" r="${r - 14}" fill="none" stroke="${b}" stroke-width="2" opacity=".7"/><path d="M112 270 Q185 ${210 - Math.round(18 * pulse)} 256 270 T400 270" fill="none" stroke="${a}" stroke-width="4" opacity=".72"/></svg>`
  }
  if (kind === 'arc') {
    return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round"><path d="M80 250 Q150 ${155 - Math.round(30 * pulse)} 224 265 T365 200 T445 260" stroke="${a}" stroke-width="6" opacity=".9"/><path d="M92 315 Q155 245 232 300 T360 285 T430 220" stroke="${b}" stroke-width="3" opacity=".78"/><circle cx="255" cy="270" r="${28 + Math.round(16 * pulse)}" fill="none" stroke="#fff7c2" stroke-width="3" opacity=".65"/></g></svg>`
  }
  return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round"><path d="M60 270 C150 ${145 - Math.round(25 * pulse)} 245 ${380 + Math.round(20 * pulse)} 450 235" stroke="${a}" stroke-width="4" opacity=".9" stroke-dasharray="12 9"/><path d="M74 300 C180 260 265 250 430 280" stroke="${b}" stroke-width="2" opacity=".72" stroke-dasharray="4 12"/><circle cx="${120 + Math.round(220 * phase)}" cy="${210 + Math.round(70 * pulse)}" r="8" fill="${a}" opacity=".9"/></g></svg>`
}

function deathSvg(frame, count, accent, secondary) {
  const p = frame / Math.max(1, count - 1)
  const a = esc(accent), b = esc(secondary)
  const sparks = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 8
    const r1 = 145 + ((frame * 17 + i * 11) % 25)
    const r2 = r1 + 22 + Math.round(p * 35)
    const x1 = 256 + Math.cos(angle) * r1, y1 = 270 + Math.sin(angle) * r1
    const x2 = 256 + Math.cos(angle) * r2, y2 = 270 + Math.sin(angle) * r2
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${i % 2 ? b : a}" stroke-width="${Math.max(1, 4 - Math.round(p * 2))}" opacity="${Math.max(.15, 1 - p * .8)}"/>`
  }).join('')
  return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round">${sparks}</g><circle cx="256" cy="270" r="${20 + Math.round(p * 80)}" fill="none" stroke="${a}" stroke-width="3" opacity="${Math.max(0, .52 - p * .45)}"/></svg>`
}

async function alphaScale(buffer, factor) {
  const image = sharp(buffer)
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 3; i < data.length; i += info.channels) data[i] = Math.round(data[i] * factor)
  return sharp(data, { raw: info }).png().toBuffer()
}

for (const [id, job] of Object.entries(jobs)) {
  const moveDir = path.join(runtimeRoot, id, 'move')
  const attackDir = path.join(runtimeRoot, id, 'attack')
  const deathDir = path.join(runtimeRoot, id, 'death')
  await fs.mkdir(attackDir, { recursive: true })
  await fs.mkdir(deathDir, { recursive: true })
  for (let i = 1; i <= job.count; i += 1) {
    const suffix = String(i).padStart(2, '0')
    const source = path.join(moveDir, `frame-${suffix}.webp`)
    const sourceBuffer = await fs.readFile(source)
    const attackOverlay = Buffer.from(attackSvg(id, i, job.accent, job.secondary, job.attackKind))
    await sharp(sourceBuffer).composite([{ input: attackOverlay }]).webp({ lossless: true, quality: 92 }).toFile(path.join(attackDir, `frame-${suffix}.webp`))

    const deathFrame = await sharp(sourceBuffer)
      .rotate((i - 1) * (id === 'faraday' ? 4.5 : 3.2), { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(512, 512, { fit: 'contain' })
      .png()
      .toBuffer()
    const fade = i <= 2 ? 1 : Math.max(0.12, 1 - ((i - 2) / Math.max(1, job.count - 2)) * 0.92)
    const faded = await alphaScale(deathFrame, fade)
    const deathOverlay = Buffer.from(deathSvg(i - 1, job.count, job.accent, job.secondary))
    await sharp(faded).composite([{ input: deathOverlay }]).webp({ lossless: true, quality: 92 }).toFile(path.join(deathDir, `frame-${suffix}.webp`))
  }
  console.log(`${id}: generated ${job.count} attack + ${job.count} death frames`)
}
