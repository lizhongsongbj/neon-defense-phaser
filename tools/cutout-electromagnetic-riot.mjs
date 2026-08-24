import { chromium } from 'playwright-core'
import fs from 'node:fs'

const input = 'public/assets/enemies/new/enemy-06-electromagnetic-riot-source.jpg'
const output = 'public/assets/enemies/new/enemy-06-electromagnetic-riot.png'
const bytes = fs.readFileSync(input)
const browser = await chromium.launch({ executablePath: 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe', headless: true })
const page = await browser.newPage()
const pngBase64 = await page.evaluate(async ({ src }) => {
  const image = new Image()
  image.src = `data:image/jpeg;base64,${src}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(image, 0, 0)
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = frame.data
  const width = canvas.width
  const height = canvas.height
  const seen = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const isBackground = (i) => {
    const p = i * 4
    const r = data[p], g = data[p + 1], b = data[p + 2]
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    // The generated checkerboard is neutral light gray/white. Keep colored lights and dark armor.
    return min >= 174 && max - min <= 18
  }
  const enqueue = (i) => {
    if (seen[i] || !isBackground(i)) return
    seen[i] = 1
    queue[tail++] = i
  }
  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { enqueue(y * width); enqueue(y * width + width - 1) }
  while (head < tail) {
    const i = queue[head++]
    const x = i % width
    const y = Math.floor(i / width)
    if (x > 0) enqueue(i - 1)
    if (x + 1 < width) enqueue(i + 1)
    if (y > 0) enqueue(i - width)
    if (y + 1 < height) enqueue(i + width)
  }
  for (let i = 0; i < seen.length; i++) if (seen[i]) data[i * 4 + 3] = 0

  // Feather only the outer silhouette by lowering alpha on pixels bordering removed background.
  const alpha = new Uint8Array(seen.length)
  for (let i = 0; i < seen.length; i++) alpha[i] = data[i * 4 + 3]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      if (!alpha[i]) continue
      let transparentNeighbors = 0
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if ((ox || oy) && alpha[i + oy * width + ox] === 0) transparentNeighbors++
      }
      if (transparentNeighbors) data[i * 4 + 3] = Math.max(96, 255 - transparentNeighbors * 20)
    }
  }
  ctx.putImageData(frame, 0, 0)
  return canvas.toDataURL('image/png').split(',')[1]
}, { src: bytes.toString('base64') })
fs.writeFileSync(output, Buffer.from(pngBase64, 'base64'))
await browser.close()
console.log(output)

