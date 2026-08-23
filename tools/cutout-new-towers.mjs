import { chromium } from 'playwright-core'
import { readdir, writeFile, unlink } from 'node:fs/promises'
import { resolve, basename } from 'node:path'

const root = resolve('public/assets/towers/new-concepts')
const files = (await readdir(root)).filter(name => name.endsWith('.jpg'))
const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
const page = await browser.newPage()
await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' })

for (const file of files) {
  const url = `/assets/towers/new-concepts/${file}`
  const base64 = await page.evaluate(async (src) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = src
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(image, 0, 0)
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = frame
    const visited = new Uint8Array(width * height)
    const queue = new Int32Array(width * height)
    let head = 0
    let tail = 0
    const isBackground = (index) => {
      const offset = index * 4
      const r = data[offset]
      const g = data[offset + 1]
      const b = data[offset + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      return min >= 186 && max - min <= 24
    }
    const add = (index) => {
      if (visited[index] || !isBackground(index)) return
      visited[index] = 1
      queue[tail++] = index
    }
    for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x) }
    for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1) }
    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      if (x > 0) add(index - 1)
      if (x + 1 < width) add(index + 1)
      if (y > 0) add(index - width)
      if (y + 1 < height) add(index + width)
    }
    for (let i = 0; i < visited.length; i++) if (visited[i]) data[i * 4 + 3] = 0
    ctx.putImageData(frame, 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  }, url)
  const out = resolve(root, file.replace(/\.jpg$/i, '.png'))
  await writeFile(out, Buffer.from(base64, 'base64'))
  await unlink(resolve(root, file))
  console.log(basename(out))
}
await browser.close()
