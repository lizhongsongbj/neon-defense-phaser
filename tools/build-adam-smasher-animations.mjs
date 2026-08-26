import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const size = 512
const sourceRoot = path.join(root, 'public/assets/generated/raw/adam-smasher-animation-sheets')
const outputRoot = path.join(root, 'public/assets/animations/enemies')

const jobs = [
  { motion: 'move', source: 'adam-smasher-walk-sheet.png', cols: 4, rows: 2, frameRate: 9, delays: [115,105,115,105,115,105,115,105] },
  { motion: 'attack', source: 'adam-smasher-attack-sheet.png', cols: 4, rows: 2, frameRate: 8, delays: [150,125,110,90,90,115,135,165] },
  { motion: 'death', source: 'adam-smasher-death-sheet.png', cols: 4, rows: 2, frameRate: 7, delays: [135,125,125,135,145,160,190,300] },
]

function removeConnectedLightBackground(data, width, height) {
  const channels = 4
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const qualifies = (pixel) => {
    const offset = pixel * channels
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    return Math.min(r, g, b) >= 205 && Math.max(r, g, b) - Math.min(r, g, b) <= 24
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
    if (visited[pixel]) data[pixel * channels + 3] = 0
  }
  return data
}

await fs.mkdir(outputRoot, { recursive: true })
for (const job of jobs) {
  const input = path.join(sourceRoot, job.source)
  const metadata = await sharp(input).metadata()
  const cropWidth = Math.floor((metadata.width ?? 0) / job.cols)
  const cropHeight = Math.floor((metadata.height ?? 0) / job.rows)
  const offsetX = Math.floor(((metadata.width ?? cropWidth * job.cols) - cropWidth * job.cols) / 2)
  const offsetY = Math.floor(((metadata.height ?? cropHeight * job.rows) - cropHeight * job.rows) / 2)
  const framesDir = path.join(outputRoot, 'runtime', 'enforcer', job.motion)
  await fs.mkdir(framesDir, { recursive: true })
  const rawFrames = []

  for (let frame = 0; frame < job.cols * job.rows; frame += 1) {
    const col = frame % job.cols
    const row = Math.floor(frame / job.cols)
    const { data, info } = await sharp(input)
      .extract({ left: offsetX + col * cropWidth, top: offsetY + row * cropHeight, width: cropWidth, height: cropHeight })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    removeConnectedLightBackground(data, info.width, info.height)
    const cutout = await sharp(data, { raw: info }).png().toBuffer()
    const frameBuffer = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: cutout, left: Math.floor((size - info.width) / 2), top: Math.floor((size - info.height) / 2) }])
      .png()
      .toBuffer()
    const suffix = String(frame + 1).padStart(2, '0')
    await sharp(frameBuffer).webp({ lossless: true, quality: 94 }).toFile(path.join(framesDir, `frame-${suffix}.webp`))
    rawFrames.push(await sharp(frameBuffer).ensureAlpha().raw().toBuffer())
  }

  const previewPath = path.join(outputRoot, `boss-adam-smasher-${job.motion}.webp`)
  await sharp(Buffer.concat(rawFrames), { raw: { width: size, height: size * rawFrames.length, channels: 4, pageHeight: size } })
    .webp({ quality: 94, alphaQuality: 100, effort: 6, loop: 0, delay: job.delays })
    .toFile(previewPath)
  const previewMeta = await sharp(previewPath, { animated: true }).metadata()
  console.log(`${job.motion}: ${previewMeta.pages} frames, alpha=${previewMeta.hasAlpha}`)
}
