import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const size = 512
const sourceRoot = path.join(root, 'public/assets/generated/raw/adam-smasher-stage-animation-sheets')
const outputRoot = path.join(root, 'public/assets/animations/enemies')

const jobs = [
  { stage: 2, motion: 'move', source: 'adam-smasher-stage-2-move-sheet.png', delays: [105, 95, 105, 95, 105, 95, 105, 95] },
  { stage: 2, motion: 'attack', source: 'adam-smasher-stage-2-attack-sheet.png', delays: [150, 125, 110, 90, 90, 115, 135, 165] },
  { stage: 3, motion: 'move', source: 'adam-smasher-stage-3-move-sheet.png', delays: [120, 105, 115, 100, 120, 105, 115, 100] },
  { stage: 3, motion: 'attack', source: 'adam-smasher-stage-3-attack-sheet.png', delays: [155, 130, 110, 95, 100, 125, 145, 175] },
]

function removeConnectedCheckerboard(data, width, height) {
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const qualifies = (pixel) => {
    const offset = pixel * 4
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    return Math.min(r, g, b) >= 218 && Math.max(r, g, b) - Math.min(r, g, b) <= 18
  }
  const enqueue = (pixel) => {
    if (visited[pixel] || !qualifies(pixel)) return
    visited[pixel] = 1
    queue[tail++] = pixel
  }
  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }
  while (head < tail) {
    const pixel = queue[head++]
    const x = pixel % width
    const y = Math.floor(pixel / width)
    if (x > 0) enqueue(pixel - 1)
    if (x + 1 < width) enqueue(pixel + 1)
    if (y > 0) enqueue(pixel - width)
    if (y + 1 < height) enqueue(pixel + width)
  }
  for (let pixel = 0; pixel < visited.length; pixel += 1) {
    if (!visited[pixel]) continue
    const offset = pixel * 4
    data[offset] = 0
    data[offset + 1] = 0
    data[offset + 2] = 0
    data[offset + 3] = 0
  }
}

function alphaBounds(data, width, height) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 12) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  if (right < left || bottom < top) throw new Error('No visible subject after background removal')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

async function cutFrames(job) {
  const input = path.join(sourceRoot, job.source)
  const metadata = await sharp(input).metadata()
  const sheetWidth = metadata.width ?? 0
  const sheetHeight = metadata.height ?? 0
  const cropWidth = Math.floor(sheetWidth / 4)
  const cropHeight = Math.floor(sheetHeight / 2)
  const offsetX = Math.floor((sheetWidth - cropWidth * 4) / 2)
  const offsetY = Math.floor((sheetHeight - cropHeight * 2) / 2)
  const extracted = []

  for (let frame = 0; frame < 8; frame += 1) {
    const col = frame % 4
    const row = Math.floor(frame / 4)
    const { data, info } = await sharp(input)
      .extract({ left: offsetX + col * cropWidth, top: offsetY + row * cropHeight, width: cropWidth, height: cropHeight })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    removeConnectedCheckerboard(data, info.width, info.height)
    const bounds = alphaBounds(data, info.width, info.height)
    const cutout = await sharp(data, { raw: info }).extract(bounds).png().toBuffer()
    extracted.push({ cutout, bounds })
  }

  const maxWidth = Math.max(...extracted.map((item) => item.bounds.width))
  const maxHeight = Math.max(...extracted.map((item) => item.bounds.height))
  const scale = Math.min(438 / maxWidth, 468 / maxHeight)
  const framesDir = path.join(outputRoot, 'runtime', `enforcer-stage-${job.stage}`, job.motion)
  await fs.mkdir(framesDir, { recursive: true })
  const rawFrames = []

  for (let frame = 0; frame < extracted.length; frame += 1) {
    const item = extracted[frame]
    const width = Math.max(1, Math.round(item.bounds.width * scale))
    const height = Math.max(1, Math.round(item.bounds.height * scale))
    const resized = await sharp(item.cutout).resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 }).png().toBuffer()
    const left = Math.round((size - width) / 2)
    const top = 492 - height
    const frameBuffer = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, left, top }])
      .png()
      .toBuffer()
    const suffix = String(frame + 1).padStart(2, '0')
    const framePath = path.join(framesDir, `frame-${suffix}.webp`)
    await sharp(frameBuffer).webp({ lossless: true, quality: 95, alphaQuality: 100 }).toFile(framePath)
    rawFrames.push(await sharp(frameBuffer).ensureAlpha().raw().toBuffer())
  }

  const previewPath = path.join(outputRoot, `boss-adam-smasher-stage-${job.stage}-${job.motion}.webp`)
  await sharp(Buffer.concat(rawFrames), { raw: { width: size, height: size * rawFrames.length, channels: 4, pageHeight: size } })
    .webp({ quality: 95, alphaQuality: 100, effort: 6, loop: 0, delay: job.delays })
    .toFile(previewPath)
  const previewMeta = await sharp(previewPath, { animated: true }).metadata()
  console.log(`stage ${job.stage} ${job.motion}: ${previewMeta.pages} frames, ${previewMeta.width}x${previewMeta.pageHeight}, alpha=${previewMeta.hasAlpha}`)
}

await fs.mkdir(outputRoot, { recursive: true })
for (const job of jobs) await cutFrames(job)
