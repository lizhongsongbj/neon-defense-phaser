import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const jobs = [
  {
    id: 'gang',
    input: 'public/assets/animations/enemies/enemy-01-gang-cyborg-side45-move.webp',
    output: 'public/assets/animations/enemies/enemy-01-gang-cyborg-side45-move-fixed-size.webp',
    targetMaxHeight: 466,
    groundY: 494,
  },
  {
    id: 'riot',
    input: 'public/assets/animations/enemies/enemy-02-riot-mech-move.webp',
    output: 'public/assets/animations/enemies/enemy-02-riot-mech-move-fixed-size.webp',
    targetMaxHeight: 460,
    groundY: 494,
  },
  {
    id: 'ninja',
    input: 'public/assets/animations/enemies/enemy-03-phase-ninja-move.webp',
    output: 'public/assets/animations/enemies/enemy-03-phase-ninja-move-fixed-size.webp',
    targetMaxHeight: 461,
    groundY: 494,
  },
]

async function alphaBounds(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= 8) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('Frame has no visible pixels')
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

for (const job of jobs) {
  const input = path.join(root, job.input)
  const output = path.join(root, job.output)
  const metadata = await sharp(input, { animated: true }).metadata()
  const frameCount = metadata.pages ?? 1
  const canvasWidth = metadata.width ?? 512
  const canvasHeight = metadata.pageHeight ?? 512
  const sourceFrames = []

  for (let index = 0; index < frameCount; index += 1) {
    const frame = await sharp(input, { page: index, pages: 1 }).png().toBuffer()
    sourceFrames.push({ frame, bounds: await alphaBounds(frame) })
  }

  // Every frame uses exactly the same scale factor. Pose changes remain intact,
  // while generated zoom-in/zoom-out is never introduced between frames.
  const sourceMaxHeight = Math.max(...sourceFrames.map(({ bounds }) => bounds.height))
  const fixedScale = job.targetMaxHeight / sourceMaxHeight
  const rawFrames = []
  const report = []

  for (let index = 0; index < sourceFrames.length; index += 1) {
    const { frame, bounds } = sourceFrames[index]
    const visible = await sharp(frame)
      .extract({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
      .png()
      .toBuffer()

    let width = Math.round(bounds.width * fixedScale)
    let height = Math.round(bounds.height * fixedScale)
    const maxWidth = canvasWidth - 24
    if (width > maxWidth) throw new Error(`${job.id} frame ${index + 1} exceeds the fixed canvas width`)

    const normalized = Math.abs(fixedScale - 1) < 0.0001
      ? visible
      : await sharp(visible).resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 }).png().toBuffer()
    const left = Math.round((canvasWidth - width) / 2)
    const top = Math.max(0, job.groundY - height)
    const canvas = await sharp({
      create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: normalized, left, top }])
      .png()
      .toBuffer()
    rawFrames.push(await sharp(canvas).ensureAlpha().raw().toBuffer())
    report.push({ frame: index + 1, source: bounds, fixedScale, normalized: { left, top, width, height } })
  }

  const temporary = `${output}.tmp.webp`
  await sharp(Buffer.concat(rawFrames), {
    raw: { width: canvasWidth, height: canvasHeight * frameCount, channels: 4, pageHeight: canvasHeight },
  })
    .webp({
      quality: 95,
      alphaQuality: 100,
      effort: 6,
      loop: metadata.loop ?? 0,
      delay: metadata.delay ?? Array(frameCount).fill(100),
    })
    .toFile(temporary)
  await fs.copyFile(temporary, output)
  await fs.unlink(temporary)
  console.log(JSON.stringify({ id: job.id, fixedScale, frameCount, report }, null, 2))
}
