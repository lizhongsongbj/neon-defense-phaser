const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/assets/animations/enemies');
const SIZE = 512;
const FRAME_DELAY = 120;

const jobs = [
  {
    id: 'enemy-02-riot-mech',
    base: path.join(ROOT, 'public/assets/enemies/generated-raw-selected/enemy-02-riot-mech-base-cutout.png'),
    generated: 'C:/Users/1/.codex/generated_images/01a03384-aace-70b0-8be4-40cc65f4fa16/call_F5iuE32kV5Hf9AnrqLf61AQQ.png',
    maxWidth: 438,
    maxHeight: 438,
    bottom: 496,
  },
  {
    id: 'enemy-03-phase-ninja',
    base: path.join(ROOT, 'public/assets/enemies/generated-raw-selected/enemy-03-phase-ninja-base-cutout.png'),
    generated: 'C:/Users/1/.codex/generated_images/01a03384-aace-70b0-8be4-40cc65f4fa16/call_Dn0j6glYCZjiwp02MvkjOLHl.png',
    maxWidth: 452,
    maxHeight: 438,
    bottom: 496,
  },
];

function isBackgroundPixel(r, g, b) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= 174 && max - min <= 32;
}

async function removeBakedCheckerboard(input, output) {
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * channels;
    if (!isBackgroundPixel(data[i], data[i + 1], data[i + 2])) return;
    visited[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = Math.floor(p / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  for (let p = 0; p < visited.length; p++) {
    if (visited[p]) data[p * channels + 3] = 0;
  }

  // Feather only pixels directly touching the cleared background to avoid a pale checkerboard halo.
  const alpha = new Uint8Array(width * height);
  for (let p = 0; p < alpha.length; p++) alpha[p] = data[p * channels + 3];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (alpha[p] === 0) continue;
      if (alpha[p - 1] === 0 || alpha[p + 1] === 0 || alpha[p - width] === 0 || alpha[p + width] === 0) {
        const i = p * channels;
        const min = Math.min(data[i], data[i + 1], data[i + 2]);
        const max = Math.max(data[i], data[i + 1], data[i + 2]);
        if (min > 150 && max - min < 42) data[i + 3] = Math.min(data[i + 3], 96);
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(output);
}

async function alphaBounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || bottom < top) throw new Error(`No visible pixels in ${file}`);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function normalizeSprite(file, maxWidth, maxHeight, bottom) {
  const bounds = await alphaBounds(file);
  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const left = Math.round((SIZE - width) / 2);
  const top = Math.max(0, Math.round(bottom - height));
  const sprite = await sharp(file)
    .extract(bounds)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: sprite, left, top }])
    .raw()
    .toBuffer();
}

function blendPremultiplied(a, b, t, darken = 1) {
  const out = Buffer.allocUnsafe(a.length);
  const inv = 1 - t;
  for (let i = 0; i < a.length; i += 4) {
    const aa = a[i + 3] / 255;
    const ba = b[i + 3] / 255;
    const oa = aa * inv + ba * t;
    if (oa <= 0.0001) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }
    out[i] = Math.round(((a[i] * aa * inv + b[i] * ba * t) / oa) * darken);
    out[i + 1] = Math.round(((a[i + 1] * aa * inv + b[i + 1] * ba * t) / oa) * darken);
    out[i + 2] = Math.round(((a[i + 2] * aa * inv + b[i + 2] * ba * t) / oa) * darken);
    out[i + 3] = Math.round(oa * 255);
  }
  return out;
}

async function build(job) {
  const keyPath = path.join(OUT_DIR, `${job.id}-death-key.png`);
  const frameDir = path.join(OUT_DIR, `${job.id}-death-frames`);
  const animationPath = path.join(OUT_DIR, `${job.id}-death.webp`);
  fs.mkdirSync(frameDir, { recursive: true });

  await removeBakedCheckerboard(job.generated, keyPath);
  const base = await normalizeSprite(job.base, job.maxWidth, job.maxHeight, job.bottom);
  const death = await normalizeSprite(keyPath, job.maxWidth, job.maxHeight, job.bottom);
  const stages = [0, 0.08, 0.22, 0.42, 0.66, 0.84, 1, 1];
  const frames = [];

  for (let index = 0; index < stages.length; index++) {
    const raw = blendPremultiplied(base, death, stages[index], index === 7 ? 0.9 : 1);
    frames.push(raw);
    await sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 4 } })
      .png()
      .toFile(path.join(frameDir, `frame-${String(index + 1).padStart(2, '0')}.png`));
  }

  await sharp(Buffer.concat(frames), {
    raw: { width: SIZE, height: SIZE * frames.length, channels: 4, pageHeight: SIZE },
  })
    .webp({ quality: 93, alphaQuality: 100, effort: 6, loop: 0, delay: Array(frames.length).fill(FRAME_DELAY) })
    .toFile(animationPath);

  const meta = await sharp(animationPath, { animated: true }).metadata();
  console.log(job.id, {
    keyPath,
    animationPath,
    pages: meta.pages,
    pageHeight: meta.pageHeight,
    hasAlpha: meta.hasAlpha,
    delay: meta.delay,
  });
}

(async () => {
  for (const job of jobs) await build(job);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
