import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const workspaceRoot = fileURLToPath(new URL('.', import.meta.url))
const publicDirectory = resolve(workspaceRoot, 'public')
const rawDirectory = resolve(publicDirectory, 'assets/generated/raw')
const cutoutDirectory = resolve(publicDirectory, 'assets/generated/cutout')
const publishDirectory = resolve(publicDirectory, 'assets/towers/fourth-tier')
const specificationPath = resolve(workspaceRoot, 'asset-generation-spec.json')

const allowedSizes = new Set(['1024x1024', '1536x1536', '1536x1024', '1024x1536'])
const safeIdPattern = /^[a-z0-9][a-z0-9-]{1,80}$/

interface AssetItem {
  id: string
  categoryId: string
  towerName: string
  name: string
  referenceAsset: string
  targetFile: string
  prompt: string
}

interface AssetSpecification {
  stylePrompt: string
  sizes: string[]
  items: AssetItem[]
}

interface ImageEnvironment {
  OG_API_KEY?: string
  OG_HOST?: string
  OG_IMAGE_EDIT_URL?: string
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request: IncomingMessage, maxBytes = 128_000): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) throw new Error('请求内容过大。')
    chunks.push(buffer)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

async function loadSpecification(): Promise<AssetSpecification> {
  const source = (await readFile(specificationPath, 'utf8')).replace(/^\uFEFF/, '')
  return JSON.parse(source) as AssetSpecification
}

function localPublicPath(assetUrl: string): string {
  if (!assetUrl.startsWith('/assets/')) throw new Error('只允许读取 public/assets 中的参考图。')
  const absolute = resolve(publicDirectory, assetUrl.replace(/^\/+/, ''))
  if (absolute !== publicDirectory && !absolute.startsWith(`${publicDirectory}${sep}`)) {
    throw new Error('素材路径越界。')
  }
  return absolute
}

function imageMime(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.webp': return 'image/webp'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    default: return 'image/png'
  }
}

function fileStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function extractImageBytes(payload: Record<string, any>): Promise<Buffer> {
  const image = payload.data?.[0]
  if (!image) throw new Error('图像服务没有返回图片。')
  if (typeof image.b64_json === 'string' && image.b64_json.length) {
    return Buffer.from(image.b64_json, 'base64')
  }
  if (typeof image.url === 'string' && image.url.length) {
    const download = await fetch(image.url)
    if (!download.ok) throw new Error(`无法下载生成图片：HTTP ${download.status}`)
    return Buffer.from(await download.arrayBuffer())
  }
  throw new Error('图像服务既没有返回 b64_json，也没有返回 url。')
}

async function requestOriginImage(
  environment: ImageEnvironment,
  prompt: string,
  size: string,
  referencePath: string | null,
): Promise<Buffer> {
  const apiKey = environment.OG_API_KEY?.trim()
  if (!apiKey) throw new Error('OG_API_KEY 尚未配置，请在 .env.local 中设置。')

  let upstream: Response
  if (!referencePath) {
    const host = (environment.OG_HOST || 'https://origingame.dev').replace(/\/$/, '')
    upstream = await fetch(`${host}/gw/v1/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt,
        size,
        response_format: 'b64_json',
      }),
    })
  } else {
    const referenceBytes = await readFile(referencePath)
    const form = new FormData()
    form.set('model', 'gpt-image-2')
    form.set('prompt', prompt)
    form.set('size', size)
    form.set('response_format', 'b64_json')
    form.append(
      'image[]',
      new Blob([new Uint8Array(referenceBytes)], { type: imageMime(referencePath) }),
      `reference${extname(referencePath) || '.png'}`,
    )
    upstream = await fetch(environment.OG_IMAGE_EDIT_URL || 'https://api.origingame.dev/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
  }

  const payload = await upstream.json().catch(() => ({})) as Record<string, any>
  if (!upstream.ok) {
    throw new Error(payload.error?.message || payload.message || `图像接口请求失败：HTTP ${upstream.status}`)
  }
  return extractImageBytes(payload)
}

interface TransparencyResult {
  buffer: Buffer
  removedWhitePixels: number
  alphaChecked: true
}

const whiteBackgroundMinimum = 235
const whiteBackgroundMaxSpread = 26

function removeWhiteRegion(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  options: { whiteMinimum: number; maxSpread: number; seedTransparentPixels: boolean },
): number {
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  let removed = 0

  const state = (index: number) => {
    const offset = index * channels
    const red = data[offset]
    const green = data[offset + 1]
    const blue = data[offset + 2]
    const alpha = data[offset + 3]
    return {
      transparent: alpha <= 8,
      white: alpha > 8
        && Math.min(red, green, blue) >= options.whiteMinimum
        && Math.max(red, green, blue) - Math.min(red, green, blue) <= options.maxSpread,
    }
  }

  const enqueue = (index: number) => {
    if (index < 0 || index >= width * height || visited[index]) return
    const pixel = state(index)
    if (!pixel.white && !(options.seedTransparentPixels && pixel.transparent)) return
    visited[index] = 1
    queue[tail] = index
    tail += 1
  }

  if (options.seedTransparentPixels) {
    for (let index = 0; index < width * height; index += 1) {
      if (data[index * channels + 3] <= 8) enqueue(index)
    }
  } else {
    for (let x = 0; x < width; x += 1) {
      enqueue(x)
      enqueue((height - 1) * width + x)
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueue(y * width)
      enqueue(y * width + width - 1)
    }
  }

  while (head < tail) {
    const index = queue[head]
    head += 1
    const pixel = state(index)
    if (pixel.white) {
      data[index * channels + 3] = 0
      removed += 1
    }
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) enqueue(index - 1)
    if (x < width - 1) enqueue(index + 1)
    if (y > 0) enqueue(index - width)
    if (y < height - 1) enqueue(index + width)
  }
  return removed
}

async function removeEdgeWhiteBackground(source: Buffer): Promise<TransparencyResult> {
  const image = sharp(source, { limitInputPixels: false }).ensureAlpha()
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const backgroundRemoved = removeWhiteRegion(data, width, height, channels, {
    whiteMinimum: whiteBackgroundMinimum,
    maxSpread: whiteBackgroundMaxSpread,
    seedTransparentPixels: false,
  })
  const fringeRemoved = removeWhiteRegion(data, width, height, channels, {
    whiteMinimum: 210,
    maxSpread: 35,
    seedTransparentPixels: true,
  })
  const buffer = await sharp(data, { raw: { width, height, channels } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
  return { buffer, removedWhitePixels: backgroundRemoved + fringeRemoved, alphaChecked: true }
}

interface GeneratedAssetRecord {
  id: string
  name: string
  fileName: string
  rawUrl: string
  imageUrl: string
  cutoutApplied: boolean
  alphaChecked: boolean
  removedWhitePixels: number
}

async function listGeneratedAssets(specification: AssetSpecification): Promise<GeneratedAssetRecord[]> {
  const readNames = async (directory: string): Promise<string[]> => {
    try {
      return await readdir(directory)
    } catch {
      return []
    }
  }

  const [rawNames, cutoutNames] = await Promise.all([
    readNames(rawDirectory),
    readNames(cutoutDirectory),
  ])
  const rawSet = new Set(rawNames)
  const cutoutSet = new Set(cutoutNames)

  return specification.items.flatMap((item) => {
    const candidates = [...new Set([...rawNames, ...cutoutNames])]
      .filter((name) => name.startsWith(`${item.id}-`) && name.toLowerCase().endsWith('.png'))
      .sort((left, right) => right.localeCompare(left))
    const fileName = candidates[0]
    if (!fileName) return []
    const cutoutApplied = cutoutSet.has(fileName)
    return [{
      id: item.id,
      name: item.name,
      fileName,
      rawUrl: rawSet.has(fileName) ?  `/assets/generated/raw/${fileName}` : `/assets/generated/cutout/${fileName}`,
      imageUrl: cutoutApplied ? `/assets/generated/cutout/${fileName}` : `/assets/generated/raw/${fileName}`,
      cutoutApplied,
      alphaChecked: cutoutApplied,
      removedWhitePixels: 0,
    }]
  })
}
function imageStudioPlugin(environment: ImageEnvironment): Plugin {
  return {
    name: 'neon-image-studio-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname
        if (!pathname.startsWith('/api/image-studio') && pathname !== '/api/generate-asset' && pathname !== '/api/publish-asset') {
          next()
          return
        }

        try {
          const specification = await loadSpecification()

          if (request.method === 'GET' && pathname === '/api/image-studio/generated') {
            sendJson(response, 200, { assets: await listGeneratedAssets(specification) })
            return
          }
          if (request.method === 'GET' && pathname === '/api/image-studio/config') {
            sendJson(response, 200, {
              keyConfigured: Boolean(environment.OG_API_KEY?.trim()),
              sizes: specification.sizes.filter((size) => allowedSizes.has(size)),
              stylePrompt: specification.stylePrompt,
              items: specification.items,
            })
            return
          }

          if (request.method === 'POST' && pathname === '/api/generate-asset') {
            const body = await readJsonBody(request)
            const id = String(body.id || '')
            if (!safeIdPattern.test(id)) throw new Error('素材 ID 无效。')
            const item = specification.items.find((candidate) => candidate.id === id)
            if (!item) throw new Error('没有找到对应的素材配置。')

            const size = allowedSizes.has(String(body.size)) ? String(body.size) : '1024x1024'
            const itemPrompt = String(body.prompt || item.prompt).trim().slice(0, 12_000)
            if (!itemPrompt) throw new Error('提示词不能为空。')
            const prompt = `${specification.stylePrompt}\n\n具体升级要求：${itemPrompt}`
            const referencePath = localPublicPath(item.referenceAsset)

            const bytes = await requestOriginImage(environment, prompt, size, referencePath)
            await mkdir(rawDirectory, { recursive: true })
            await mkdir(cutoutDirectory, { recursive: true })
            const baseName = `${item.id}-${fileStamp()}.png`
            const rawPath = resolve(rawDirectory, baseName)
            await writeFile(rawPath, bytes)

            const transparency = await removeEdgeWhiteBackground(bytes)
            await writeFile(resolve(cutoutDirectory, baseName), transparency.buffer)
            const imageUrl = `/assets/generated/cutout/${baseName}`
            const cutoutApplied = true

            sendJson(response, 200, {
              id: item.id,
              name: item.name,
              fileName: baseName,
              rawUrl: `/assets/generated/raw/${baseName}`,
              imageUrl,
              cutoutApplied,
              alphaChecked: transparency.alphaChecked,
              removedWhitePixels: transparency.removedWhitePixels,
            })
            return
          }

          if (request.method === 'POST' && pathname === '/api/publish-asset') {
            const body = await readJsonBody(request)
            const id = String(body.id || '')
            const imageUrl = String(body.imageUrl || '')
            const item = specification.items.find((candidate) => candidate.id === id)
            if (!item) throw new Error('没有找到对应的素材配置。')
            if (!imageUrl.startsWith('/assets/generated/raw/') && !imageUrl.startsWith('/assets/generated/cutout/')) {
              throw new Error('只能发布本工作台生成的候选图。')
            }
            const source = localPublicPath(imageUrl)
            const transparency = await removeEdgeWhiteBackground(await readFile(source))
            await mkdir(publishDirectory, { recursive: true })
            const target = resolve(publishDirectory, item.targetFile)
            await writeFile(target, transparency.buffer)
            sendJson(response, 200, {
              id: item.id,
              gameUrl: `/assets/towers/fourth-tier/${item.targetFile}`,
              targetFile: item.targetFile,
              alphaChecked: transparency.alphaChecked,
              removedWhitePixels: transparency.removedWhitePixels,
            })
            return
          }

          sendJson(response, 404, { message: '接口不存在。' })
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误。'
          sendJson(response, message.includes('OG_API_KEY') ? 503 : 400, { message })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, workspaceRoot, '') as ImageEnvironment
  return {
    base: './',
    plugins: [imageStudioPlugin(environment)],
    server: {
      port: 5174,
    },
    build: {
      target: 'es2020',
    },
  }
})


