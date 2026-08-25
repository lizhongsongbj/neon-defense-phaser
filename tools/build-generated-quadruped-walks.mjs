import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const size = 512
const cols = 4
const rows = 2
const jobs = [
  {
    id: 'faraday',
    input: 'tools/image-sources/enemy-06-electromagnetic-riot-walk-sheet-2026-08-25.png',
    framesDir: 'public/assets/animations/enemies/faraday-walk-frames',
    output: 'public/assets/animations/enemies/enemy-06-electromagnetic-riot-move.webp',
    delay: 118,
  },
  {
    id: 'neurohound',
    input: 'tools/image-sources/enemy-08-neuro-hound-walk-sheet-2026-08-25.png',
    framesDir: 'public/assets/animations/enemies/neurohound-walk-frames',
    output: 'public/assets/animations/enemies/enemy-08-neuro-hound-move.webp',
    delay: 78,
  },
  {
    id: 'bonebreaker',
    input: 'tools/image-sources/enemy-10-bonebreaker-walk-sheet-2026-08-25.png',
    framesDir: 'public/assets/animations/enemies/bonebreaker-walk-frames',
    output: 'public/assets/animations/enemies/enemy-10-bonebreaker-move.webp',
    delay: 132,
  },
]

const pixelOffset = (x, y, width) => (y * width + x) * 4

function isStrongMagenta(r, g, b) {
  return r > 155 && b > 145 && g < 125 && Math.min(r, b) - g > 58 && Math.abs(r - b) < 105
}

function isSoftMagenta(r, g, b) {
  return r > 90 && b > 82 && g < 135 && Math.min(r, b) - g > 28 && Math.abs(r - b) < 125
}

function removeConnectedMagenta(input, width, height) {
  const data = Buffer.from(input)
  const removed = new Uint8Array(width * height)

  // Pure chroma can also be enclosed between legs, so remove the unmistakable key color globally.
  for (let p = 0; p < width * height; p += 1) {
    const i = p * 4
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r > 205 && b > 195 && g < 75 && Math.min(r, b) - g > 135 && Math.abs(r - b) < 75) removed[p] = 1
  }
  const queueX = new Int32Array(width * height)
  const queueY = new Int32Array(width * height)
  let head = 0
  let tail = 0

  const enqueueStrong = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const p = y * width + x
    if (removed[p]) return
    const i = p * 4
    if (!isStrongMagenta(data[i], data[i + 1], data[i + 2])) return
    removed[p] = 1
    queueX[tail] = x
    queueY[tail] = y
    tail += 1
  }

  for (let x = 0; x < width; x += 1) {
    enqueueStrong(x, 0)
    enqueueStrong(x, height - 1)
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueueStrong(0, y)
    enqueueStrong(width - 1, y)
  }

  while (head < tail) {
    const x = queueX[head]
    const y = queueY[head]
    head += 1
    enqueueStrong(x - 1, y)
    enqueueStrong(x + 1, y)
    enqueueStrong(x, y - 1)
    enqueueStrong(x, y + 1)
  }

  // Peel off antialiased chroma fringe only when it touches already-cleared background.
  for (let pass = 0; pass < 10; pass += 1) {
    const added = []
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = y * width + x
        if (removed[p]) continue
        const touches =
          (x > 0 && removed[p - 1]) ||
          (x + 1 < width && removed[p + 1]) ||
          (y > 0 && removed[p - width]) ||
          (y + 1 < height && removed[p + width])
        if (!touches) continue
        const i = p * 4
        if (isSoftMagenta(data[i], data[i + 1], data[i + 2])) added.push(p)
      }
    }
    if (!added.length) break
    for (const p of added) removed[p] = 1
  }

  let removedCount = 0
  for (let p = 0; p < removed.length; p += 1) {
    const i = p * 4
    if (removed[p]) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 0
      removedCount += 1
    }
  }
  return { data, removedCount }
}


function keepLargestForegroundComponent(input, width, height) {
  const data = Buffer.from(input)
  const visited = new Uint8Array(width * height)
  let largest = []
  const neighbors = [-width - 1, -width, -width + 1, -1, 1, width - 1, width, width + 1]
  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || data[start * 4 + 3] <= 18) continue
    const component = []
    const queue = [start]
    visited[start] = 1
    for (let head = 0; head < queue.length; head += 1) {
      const p = queue[head]
      component.push(p)
      const x = p % width
      const y = Math.floor(p / width)
      for (const delta of neighbors) {
        const n = p + delta
        if (n < 0 || n >= width * height || visited[n]) continue
        const nx = n % width
        const ny = Math.floor(n / width)
        if (Math.abs(nx - x) > 1 || Math.abs(ny - y) > 1) continue
        if (data[n * 4 + 3] <= 18) continue
        visited[n] = 1
        queue.push(n)
      }
    }
    if (component.length > largest.length) largest = component
  }
  const keep = new Uint8Array(width * height)
  for (const p of largest) keep[p] = 1
  for (let p = 0; p < width * height; p += 1) {
    if (!keep[p]) {
      const i = p * 4
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 0
    }
  }
  return data
}
function alphaBounds(data, width, height, threshold = 18) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[pixelOffset(x, y, width) + 3] <= threshold) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < left || bottom < top) throw new Error('No foreground survived chroma cleanup')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

async function processJob(job) {
  const input = path.join(root, job.input)
  const metadata = await sharp(input).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read ${input}`)
  fs.mkdirSync(path.join(root, job.framesDir), { recursive: true })
  const prepared = []

  for (let index = 0; index < cols * rows; index += 1) {
    const col = index % cols
    const row = Math.floor(index / cols)
    const left = Math.round(col * metadata.width / cols)
    const right = Math.round((col + 1) * metadata.width / cols)
    const top = Math.round(row * metadata.height / rows)
    const bottom = Math.round((row + 1) * metadata.height / rows)
    const { data, info } = await sharp(input)
      .extract({ left, top, width: right - left, height: bottom - top })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const cleaned = removeConnectedMagenta(data, info.width, info.height)
    const isolated = keepLargestForegroundComponent(cleaned.data, info.width, info.height)
    const bounds = alphaBounds(isolated, info.width, info.height)
    prepared.push({ raw: isolated, info, bounds, removedCount: cleaned.removedCount })
  }

  const maxW = Math.max(...prepared.map(frame => frame.bounds.width))
  const maxH = Math.max(...prepared.map(frame => frame.bounds.height))
  const scale = Math.min(470 / maxW, 446 / maxH)
  const targetW = Math.max(1, Math.round(maxW * scale))
  const targetH = Math.max(1, Math.round(maxH * scale))
  const rawFrames = []
  const results = []

  for (let index = 0; index < prepared.length; index += 1) {
    const frame = prepared[index]
    const localW = Math.max(1, Math.round(frame.bounds.width * scale))
    const localH = Math.max(1, Math.round(frame.bounds.height * scale))
    const cut = await sharp(frame.raw, { raw: frame.info })
      .extract({ left: frame.bounds.left, top: frame.bounds.top, width: frame.bounds.width, height: frame.bounds.height })
      .resize(localW, localH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer()
    const left = Math.round((size - localW) / 2)
    const top = Math.max(4, 494 - localH)
    const png = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: cut, left, top }])
      .png({ compressionLevel: 9 })
      .toBuffer()
    const framePath = path.join(root, job.framesDir, `frame-${String(index + 1).padStart(2, '0')}.png`)
    await sharp(png).toFile(framePath)
    rawFrames.push(await sharp(png).ensureAlpha().raw().toBuffer())
    results.push({ index: index + 1, sourceBounds: frame.bounds, placed: { left, top, width: localW, height: localH }, removed: frame.removedCount })
  }

  const output = path.join(root, job.output)
  await sharp(Buffer.concat(rawFrames), {
    raw: { width: size, height: size * rawFrames.length, channels: 4, pageHeight: size },
  })
    .webp({ lossless: true, quality: 100, alphaQuality: 100, effort: 6, loop: 0, delay: Array(8).fill(job.delay) })
    .toFile(output)

  const contactTiles = []
  for (let index = 0; index < 8; index += 1) {
    const framePath = path.join(root, job.framesDir, `frame-${String(index + 1).padStart(2, '0')}.png`)
    const tile = await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 15, g: 24, b: 39, alpha: 1 } } })
      .composite([{ input: await sharp(framePath).resize(240, 240, { fit: 'contain' }).png().toBuffer(), left: 8, top: 8 }])
      .png()
      .toBuffer()
    contactTiles.push({ input: tile, left: (index % 4) * 256, top: Math.floor(index / 4) * 256 })
  }
  const contactPath = path.join(root, `.tmp-${job.id}-walk-contact.png`)
  await sharp({ create: { width: 1024, height: 512, channels: 4, background: { r: 8, g: 13, b: 24, alpha: 1 } } })
    .composite(contactTiles)
    .png()
    .toFile(contactPath)

  const outMeta = await sharp(output, { animated: true }).metadata()
  return { id: job.id, output: job.output, contactPath, source: { width: metadata.width, height: metadata.height }, normalizedMax: { width: targetW, height: targetH }, metadata: { width: outMeta.width, pageHeight: outMeta.pageHeight, pages: outMeta.pages, delay: outMeta.delay, loop: outMeta.loop, hasAlpha: outMeta.hasAlpha }, frames: results }
}

const result = []
for (const job of jobs) result.push(await processJob(job))
console.log(JSON.stringify(result, null, 2))

