import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const backupRoot = path.join(root, 'tools', 'asset-alpha-backup-2026-08-24-visible-white')
const targets = [
  'public/assets/towers/generated-raw-selected/tower-02-arc-neon-base-cutout-1.png',
  'public/assets/generated/progression/tier-2/arc-neon-tier-2.png',
  'public/assets/generated/cutout/arc-neon-tier-3-2026-08-23T11-49-31-954Z.png',
  'public/assets/generated/cutout/arc-neon-storm-core-2026-08-23T11-25-45-551Z.png',
  'public/assets/generated/cutout/arc-neon-superconductor-2026-08-23T11-25-37-154Z.png',
  'public/assets/towers/generated-raw-selected/tower-04-hacker-relay-base-cutout.png',
  'public/assets/generated/progression/tier-2/hacker-tier-2.png',
  'public/assets/generated/cutout/hacker-tier-3-2026-08-23T11-53-44-631Z.png',
  'public/assets/generated/cutout/hacker-zero-day-control-2026-08-23T11-11-56-802Z.png',
  'public/assets/generated/cutout/hacker-black-ice-breaker-2026-08-23T11-13-18-369Z.png',
  'public/assets/animations/towers/tower-02-arc-neon-attack.webp',
  'public/assets/animations/towers/tower-04-hacker-relay-attack.webp',
]

function removeVisibleWhite(data, width, totalHeight, channels, pageHeight) {
  const pages = Math.max(1, Math.round(totalHeight / pageHeight))
  let removed = 0
  let components = 0
  for (let page = 0; page < pages; page += 1) {
    const offsetY = page * pageHeight
    const count = width * pageHeight
    const visited = new Uint8Array(count)
    const minimumComponent = Math.max(24, Math.round(count * 0.000048))
    const candidate = (localIndex) => {
      const y = Math.floor(localIndex / width) + offsetY
      const x = localIndex % width
      const offset = (y * width + x) * channels
      const red = data[offset]
      const green = data[offset + 1]
      const blue = data[offset + 2]
      const alpha = data[offset + 3]
      return alpha > 16 && Math.min(red, green, blue) >= 225 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 45
    }
    for (let start = 0; start < count; start += 1) {
      if (visited[start] || !candidate(start)) continue
      const queue = [start]
      const pixels = []
      visited[start] = 1
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor]
        pixels.push(index)
        const x = index % width
        const y = Math.floor(index / width)
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nextX = x + dx
          const nextY = y + dy
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= pageHeight) continue
          const next = nextY * width + nextX
          if (!visited[next] && candidate(next)) {
            visited[next] = 1
            queue.push(next)
          }
        }
      }
      if (pixels.length < minimumComponent) continue
      components += 1
      for (const index of pixels) {
        const y = Math.floor(index / width) + offsetY
        const x = index % width
        data[(y * width + x) * channels + 3] = 0
        removed += 1
      }
    }
  }
  return { removed, components }
}

for (const relative of targets) {
  const file = path.join(root, relative)
  const backup = path.join(backupRoot, relative)
  await fs.mkdir(path.dirname(backup), { recursive: true })
  try { await fs.access(backup) } catch { await fs.copyFile(file, backup) }

  const image = sharp(file, { animated: true, limitInputPixels: false }).ensureAlpha()
  const metadata = await image.metadata()
  const { data: source, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const data = Buffer.from(source)
  const pageHeight = metadata.pageHeight ?? info.height
  const result = removeVisibleWhite(data, info.width, info.height, info.channels, pageHeight)
  const temp = `${file}.visible-white-temp`
  const output = sharp(data, { raw: { width: info.width, height: info.height, channels: 4, pageHeight } })
  if (metadata.format === 'webp') {
    await output.webp({ quality: 95, alphaQuality: 100, effort: 5, loop: metadata.loop ?? 0, delay: metadata.delay }).toFile(temp)
  } else {
    await output.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(temp)
  }
  await fs.rename(temp, file)
  console.log(JSON.stringify({ file: relative, pages: metadata.pages ?? 1, ...result }))
}
