import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
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
const audioDirectory = resolve(publicDirectory, 'assets/audio')
const generatedSfxDirectory = resolve(audioDirectory, 'generated-sfx')

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
  OG_AI_GATEWAY?: string
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

function imageRequestRetryable(status: number, message: string): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500
    || /retry|temporar|timeout|timed out|渠道不存在|暂无可用渠道|服务繁忙|稍后重试/i.test(message)
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}

async function requestOriginImage(
  environment: ImageEnvironment,
  prompt: string,
  size: string,
  referencePath: string | null,
): Promise<Buffer> {
  const apiKey = environment.OG_API_KEY?.trim()
  if (!apiKey) throw new Error('OG_API_KEY 尚未配置，请复制 .env.example 为 .env.local，填入有效密钥后重启服务。')

  let referenceBytes: Buffer | null = null
  if (referencePath) {
    try {
      referenceBytes = await readFile(referencePath)
    } catch {
      const displayPath = referencePath.replace(publicDirectory, '/public').replaceAll('\\', '/')
      throw new Error(`参考素材不存在：${displayPath}`)
    }
  }

  const maximumAttempts = 3
  let lastMessage = '未知错误'
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    let upstream: Response
    try {
      if (!referencePath || !referenceBytes) {
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
          signal: AbortSignal.timeout(600_000),
        })
      } else {
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
          signal: AbortSignal.timeout(600_000),
        })
      }
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : '无法连接图像生成服务'
      if (attempt < maximumAttempts) {
        await wait(attempt * 4_000)
        continue
      }
      throw new Error(`图像生成服务连接失败，已自动重试 ${maximumAttempts} 次：${lastMessage}`)
    }

    const payload = await upstream.json().catch(() => ({})) as Record<string, any>
    if (upstream.ok) return extractImageBytes(payload)

    lastMessage = payload.error?.message || payload.message || `图像接口请求失败：HTTP ${upstream.status}`
    if (attempt < maximumAttempts && imageRequestRetryable(upstream.status, lastMessage)) {
      await wait(attempt * 4_000)
      continue
    }
    throw new Error(lastMessage)
  }

  throw new Error(`图像生成失败：${lastMessage}`)
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
            const items = await Promise.all(specification.items.map(async (item) => {
              try {
                await stat(localPublicPath(item.referenceAsset))
                return { ...item, referenceAvailable: true }
              } catch {
                return { ...item, referenceAvailable: false }
              }
            }))
            sendJson(response, 200, {
              keyConfigured: Boolean(environment.OG_API_KEY?.trim()),
              sizes: specification.sizes.filter((size) => allowedSizes.has(size)),
              stylePrompt: specification.stylePrompt,
              items,
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

type AudioCategory = 'music' | 'voice' | 'generated'

interface AudioLibraryItem {
  id: string
  name: string
  category: AudioCategory
  group: string
  url: string
  fileName: string
  byteLength: number
  prompt?: string
}

const supportedAudioExtensions = new Set(['.mp3', '.wav', '.ogg', '.m4a'])
const allowedAudioDurations = new Set([1, 2, 3, 5, 8])

const musicChineseNames: Record<string, string> = {
  'boss-01-enforcer-zero': '首领战：亚当·重锤',
  'boss-02-eve-9': '首领战：夏娃-9',
  'level-01-megastructure-h4': '第一关：H4 巨型建筑',
  'level-02-underground-mercenary-bar': '第二关：地下佣兵酒吧',
  'level-03-neon-market-braindance-club': '第三关：霓虹市场超梦俱乐部',
  'level-04-megatower-cloud-club': '第四关：巨塔云端会所',
  'level-05-corporate-hotel-siege': '第五关：企业酒店围攻',
}

const voiceGroupChineseNames: Record<string, string> = {
  corp_airship: '企业武装飞艇',
  data_devourer: '数据吞噬者',
  enforcer_zero: '亚当·重锤',
  eve_9: '夏娃-9',
  gang_cyborg: '帮派义体人',
  gray_falcon: '灰隼',
  iron_fist: '铁拳',
  lan: '岚·战场指挥',
  phase_ninja: '相位忍者',
  queen_bee: '蜂后无人机',
  riot_machine: '镇暴机兵',
  spark: '火花',
  zero_day: '零日',
}

const audioChineseNames: Record<string, string> = {
  anti_air_mode: '切换防空模式', area_locked: '区域已经封锁', blade_mode: '切换刀刃模式',
  bomb_mode: '切换轰炸模式', bounty: '悬赏目标', break_shield: '击破护盾', build: '部署完成',
  capture_node: '夺取节点', chain_attack: '连锁攻击', charge: '发起冲锋', clear_resistance: '清除抵抗',
  control_enemy: '控制敌人', core_exposed: '核心已经暴露', core_revealed: '核心显露', data_kill: '数据抹杀',
  defeat: '防线失守', defeated: '目标被击败', drone_destroyed: '无人机被摧毁', drop_countdown: '空投倒计时',
  elite_kill: '精英目标击杀', enemy_incoming: '敌军来袭', enraged: '进入狂暴状态', entrance: '首领登场',
  final_phase: '进入最终阶段', final_wave: '最终波次来袭', fortress_damaged: '堡垒遭到破坏', get_down: '立即趴下',
  hack_failed: '入侵失败', intercept_elite: '拦截精英单位', invade_node: '入侵防御节点', invisible: '进入隐形状态',
  jammed: '武器受到干扰', lock_tower: '锁定防御塔', lockdown: '执行区域封锁', mechanical_kill: '机械目标击杀',
  memory_belongs: '记忆属于我们', missile_destroyed: '导弹发射器被摧毁', multi_pierce: '多重贯穿', node_attacked: '节点遭到攻击',
  open_port: '开放数据端口', opening: '战斗开场', player_defeat: '玩家战败', repair_mode: '切换维修模式',
  retreat: '撤离战场', return: '无人机返航', route_split: '敌军路线分流', select: '单位已选中',
  shield_broken: '护盾已经击破', shield_mode: '切换护盾模式', shutdown: '系统关闭', skill: '释放战术技能',
  skill_charge: '技能蓄能', skill_fire: '技能开火', strip_access: '剥夺访问权限', suppression_mode: '启动压制模式',
  target_ahead: '发现前方目标', teammate_down: '队友倒下', thruster_destroyed: '推进器被摧毁', transfer_body: '转移躯体',
  upgrade: '升级完成', victory: '防守胜利', vision_cut: '切断视觉', weak_firepower: '火力太弱', wet_target: '目标处于潮湿状态',
}

function readableAudioName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '')
  if (musicChineseNames[stem]) return musicChineseNames[stem]
  if (audioChineseNames[stem]) return audioChineseNames[stem]
  if (/^sfx-\d{4}-\d{2}-\d{2}T/.test(stem)) return stem.replace(/^sfx-\d{4}-\d{2}-\d{2}T/, 'AI 生成音效 ')
  return '未命名音效'
}

async function readGeneratedPrompt(audioPath: string): Promise<string | undefined> {
  try {
    const metadata = JSON.parse(await readFile(audioPath.replace(/\.[^.]+$/, '.json'), 'utf8')) as { prompt?: unknown }
    return typeof metadata.prompt === 'string' ? metadata.prompt : undefined
  } catch {
    return undefined
  }
}

async function scanAudioFiles(directory: string, category: AudioCategory, groupRoot: string): Promise<AudioLibraryItem[]> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }

  const items: AudioLibraryItem[] = []
  for (const entry of entries) {
    const absolute = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      items.push(...await scanAudioFiles(absolute, category, groupRoot))
      continue
    }
    if (!entry.isFile() || !supportedAudioExtensions.has(extname(entry.name).toLowerCase())) continue
    if (extname(entry.name).toLowerCase() === '.mp3') {
      const wavSibling = resolve(directory, entry.name.replace(/\.mp3$/i, '.wav'))
      try {
        await stat(wavSibling)
        continue
      } catch {
        // 没有男声替换文件时继续展示原始 MP3。
      }
    }
    const relative = absolute.slice(audioDirectory.length + 1).split(sep).join('/')
    const groupPath = absolute.slice(groupRoot.length + 1).split(sep).slice(0, -1).join(' / ')
    const details = await stat(absolute)
    const prompt = category === 'generated' ? await readGeneratedPrompt(absolute) : undefined
    items.push({
      id: relative.toLowerCase(),
      name: readableAudioName(entry.name),
      category,
      group: category === 'music' ? '游戏背景音乐' : category === 'generated' ? 'AI 生成音效' : (voiceGroupChineseNames[groupPath] || '角色语音'),
      url: `/assets/audio/${relative}?v=${Math.round(details.mtimeMs)}`,
      fileName: entry.name,
      byteLength: details.size,
      ...(prompt ? { prompt } : {}),
    })
  }
  return items
}

async function listAudioLibrary(): Promise<AudioLibraryItem[]> {
  const [music, voices, generated] = await Promise.all([
    scanAudioFiles(resolve(audioDirectory, 'music'), 'music', resolve(audioDirectory, 'music')),
    scanAudioFiles(resolve(audioDirectory, 'voices'), 'voice', resolve(audioDirectory, 'voices')),
    scanAudioFiles(generatedSfxDirectory, 'generated', generatedSfxDirectory),
  ])
  return [...generated.sort((a, b) => b.fileName.localeCompare(a.fileName)), ...music, ...voices]
}

function audioExtension(mimeType: string): string {
  if (mimeType.includes('wav')) return '.wav'
  if (mimeType.includes('ogg')) return '.ogg'
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return '.m4a'
  return '.mp3'
}

function decodeAudioPayload(payload: Record<string, any>): { bytes: Buffer; mimeType: string } {
  const candidates = [payload.audio_base64, payload.audioBase64, payload.base64, payload.audio, payload.data?.audio_base64, payload.data?.audioBase64, payload.data?.base64, payload.data?.audio, typeof payload.data === 'string' ? payload.data : undefined, payload.output?.audio_base64, payload.output?.audio]
  const encoded = candidates.find((value) => typeof value === 'string' && value.length > 0) as string | undefined
  if (!encoded) throw new Error('音效服务没有返回可保存的音频数据。')
  const clean = encoded.includes(',') ? encoded.slice(encoded.indexOf(',') + 1) : encoded
  const bytes = Buffer.from(clean, 'base64')
  if (!bytes.length) throw new Error('音效服务返回了空音频。')
  const mimeType = String(payload.mime_type || payload.mimeType || payload.data?.mime_type || payload.data?.mimeType || 'audio/mpeg')
  return { bytes, mimeType }
}

async function requestOriginSound(environment: ImageEnvironment, prompt: string, durationSeconds: number) {
  const apiKey = environment.OG_API_KEY?.trim()
  if (!apiKey) throw new Error('OG_API_KEY 尚未配置，请在 .env.local 中设置。')
  const host = (environment.OG_AI_GATEWAY || 'https://api.origingame.dev').replace(/\/$/, '')
  const upstream = await fetch(`${host}/v1/sound-generation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'eleven_text_to_sound_v2', prompt, duration_seconds: durationSeconds }),
  })
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`音效生成服务返回 HTTP ${upstream.status}${detail ? `：${detail.slice(0, 300)}` : ''}`)
  }
  const contentType = upstream.headers.get('content-type') || ''
  if (contentType.startsWith('audio/')) return { bytes: Buffer.from(await upstream.arrayBuffer()), mimeType: contentType.split(';')[0] }
  return decodeAudioPayload(await upstream.json() as Record<string, any>)
}

function audioStudioPlugin(environment: ImageEnvironment): Plugin {
  return {
    name: 'neon-audio-studio-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname
        if (!pathname.startsWith('/api/audio-studio')) {
          next()
          return
        }
        try {
          if (request.method === 'GET' && pathname === '/api/audio-studio/config') {
            sendJson(response, 200, { keyConfigured: Boolean(environment.OG_API_KEY?.trim()), durations: [...allowedAudioDurations] })
            return
          }
          if (request.method === 'GET' && pathname === '/api/audio-studio/library') {
            sendJson(response, 200, { assets: await listAudioLibrary() })
            return
          }
          if (request.method === 'POST' && pathname === '/api/audio-studio/generate') {
            const body = await readJsonBody(request)
            const prompt = String(body.prompt || '').trim().slice(0, 4000)
            const requestedDuration = Number(body.durationSeconds)
            const durationSeconds = allowedAudioDurations.has(requestedDuration) ? requestedDuration : 3
            if (!prompt) throw new Error('音效描述不能为空。')

            const generated = await requestOriginSound(environment, prompt, durationSeconds)
            const extension = audioExtension(generated.mimeType)
            const fileName = `sfx-${fileStamp()}${extension}`
            await mkdir(generatedSfxDirectory, { recursive: true })
            const target = resolve(generatedSfxDirectory, fileName)
            await writeFile(target, generated.bytes)
            await writeFile(target.replace(/\.[^.]+$/, '.json'), JSON.stringify({ prompt, durationSeconds, createdAt: new Date().toISOString() }, null, 2), 'utf8')
            const item: AudioLibraryItem = {
              id: `generated-sfx/${fileName}`.toLowerCase(),
              name: readableAudioName(fileName),
              category: 'generated',
              group: 'AI 生成音效',
              url: `/assets/audio/generated-sfx/${fileName}`,
              fileName,
              byteLength: generated.bytes.length,
              prompt,
            }
            sendJson(response, 200, item)
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
    plugins: [imageStudioPlugin(environment), audioStudioPlugin(environment)],
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        input: {
          game: resolve(workspaceRoot, 'index.html'),
          assets: resolve(workspaceRoot, 'asset-forge.html'),
          balance: resolve(workspaceRoot, 'balance-workbench.html'),
          imageStudio: resolve(workspaceRoot, 'image-studio.html'),
        },
      },
    },
  }
})



