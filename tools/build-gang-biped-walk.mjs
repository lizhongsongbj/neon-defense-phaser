import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sources = {
  contact: path.join(root, 'public/assets/generated/raw/enemy-01-gang-cyborg-whole-contact-2026-08-24.jpg'),
  passing: path.join(root, 'public/assets/generated/raw/enemy-01-gang-cyborg-whole-passing-2026-08-24.jpg'),
}
const output = path.join(root, 'public/assets/animations/enemies/enemy-01-gang-cyborg-move.webp')
const size = 512

function removeStudioWhite(raw, width, height) {
  const data = Buffer.from(raw)
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const i = pixel * 4
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const minimum = Math.min(r, g, b)
    const maximum = Math.max(r, g, b)
    const spread = maximum - minimum
    if (minimum >= 236 && spread <= 22) data[i + 3] = 0
    else if (minimum >= 198 && spread <= 26) data[i + 3] = Math.min(data[i + 3], Math.round((236 - minimum) * 6.7))
  }
  return data
}

async function wholeCharacterFrame(source, mirror = false) {
  const { data, info } = await sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const transparent = removeStudioWhite(data, info.width, info.height)
  let image = sharp(transparent, { raw: info })
  if (mirror) image = image.flop()
  return image.raw().toBuffer()
}

// Every frame is a complete full-character image. No body region is cut, swapped, or composited.
const frames = [
  await wholeCharacterFrame(sources.contact, false),
  await wholeCharacterFrame(sources.passing, false),
  await wholeCharacterFrame(sources.contact, true),
  await wholeCharacterFrame(sources.passing, true),
]

await sharp(Buffer.concat(frames), {
  raw: { width: size, height: size * frames.length, channels: 4, pageHeight: size },
})
  .webp({ quality: 94, alphaQuality: 100, effort: 6, loop: 0, delay: [150, 150, 150, 150] })
  .toFile(output)

const metadata = await sharp(output, { animated: true }).metadata()
console.log(JSON.stringify({ output, pages: metadata.pages, pageHeight: metadata.pageHeight, delay: metadata.delay, hasAlpha: metadata.hasAlpha }, null, 2))
