import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const jobs = [
  ['tools/image-sources/enemy-08-neuro-hound.jpg', 'public/assets/enemies/new/enemy-08-neuro-hound.png'],
  ['tools/image-sources/enemy-09-tissue-matriarch.jpg', 'public/assets/enemies/new/enemy-09-tissue-matriarch.png'],
  ['tools/image-sources/enemy-10-bonebreaker.jpg', 'public/assets/enemies/new/enemy-10-bonebreaker.png'],
]
const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
const page = await browser.newPage()
for (const [input, output] of jobs) {
  const src = fs.readFileSync(input).toString('base64')
  const png = await page.evaluate(async (base64) => {
    const image = new Image()
    image.src = `data:image/jpeg;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(image, 0, 0)
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = frame.data
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      const magenta = Math.min(r - g, b - g)
      const chroma = Math.min(r, b) - g
      if (r > 145 && b > 105 && magenta > 65 && chroma > 55) {
        d[i + 3] = 0
      }
    }
    ctx.putImageData(frame, 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  }, src)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, Buffer.from(png, 'base64'))
  console.log(output, fs.statSync(output).size)
}
await browser.close()


