import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const { EdgeTTS } = require('C:/Users/1/.codex/tmp/edge-tts-runtime/node_modules/node-edge-tts')
const jobs = [
  ['lan', 'opening', '指挥官，防线已部署。敌军正在接近，准备迎战！'],
  ['lan', 'enemy_incoming', '警告！侦测到敌军正在接近，请立即做好战斗准备！'],
  ['lan', 'final_wave', '注意！最终波次已经抵达。坚守阵地，不要让任何敌人通过！'],
  ['lan', 'fortress_damaged', '警告！大本营正在遭受攻击，请立即拦截突破防线的敌人！'],
  ['lan', 'node_attacked', '警告！防御节点正在遭受攻击，立刻增援该区域！'],
  ['lan', 'route_split', '敌军正在分流，多条路线同时出现目标。请重新部署防御力量！'],
  ['lan', 'victory', '任务完成！敌军攻势已经瓦解，防线成功守住！'],
  ['lan', 'defeat', '防线已经失守。保存作战数据，重新整备后再次部署。'],
  ['queen_bee', 'build', '蜂群控制核心已上线。无人机编队准备部署。'],
  ['queen_bee', 'select', '蜂后系统在线。等待新的战术指令。'],
  ['queen_bee', 'anti_air_mode', '切换防空模式。截击无人机，锁定所有空中目标。'],
  ['queen_bee', 'bomb_mode', '切换轰炸模式。爆破无人机，装载重型弹药。'],
  ['queen_bee', 'repair_mode', '切换维修模式。回收受损单位，并执行快速修复。'],
  ['queen_bee', 'skill', '蜂群协议启动。所有无人机立即集中火力！'],
  ['queen_bee', 'drone_destroyed', '警告，一架无人机已经失去连接。正在准备替补单位。'],
  ['queen_bee', 'return', '任务结束。无人机编队脱离战区，返回母巢。'],
]
const voiceRoot = path.resolve('public/assets/audio/voices')
const tts = new EdgeTTS({
  voice: 'zh-CN-YunxiNeural',
  lang: 'zh-CN',
  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
  saveSubtitles: true,
  rate: '+0%',
  pitch: '-2%',
  volume: '+0%',
  timeout: 20000,
})
const normalize = (text) => text.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '')

for (const [group, name, script] of jobs) {
  const directory = path.join(voiceRoot, group)
  fs.mkdirSync(directory, { recursive: true })
  const mp3 = path.join(directory, `${name}.mp3`)
  await tts.ttsPromise(script, mp3)
  const subtitlePath = `${mp3}.json`
  const subtitles = JSON.parse(fs.readFileSync(subtitlePath, 'utf8'))
  const spoken = subtitles.map((entry) => entry.part).join('')
  if (normalize(spoken) !== normalize(script)) {
    throw new Error(`Incomplete subtitle coverage for ${group}/${name}: ${spoken}`)
  }
  fs.writeFileSync(path.join(directory, `${name}.txt`), `${script}\n`, 'utf8')
  console.log(`generated ${group}/${name}: ${subtitles.at(-1)?.end ?? 0}ms`)
}

const publicRoot = path.resolve('public')
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname)
  if (pathname === '/') return response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html>')
  const target = path.resolve(publicRoot, `.${pathname}`)
  if (!target.startsWith(publicRoot) || !fs.existsSync(target)) return response.writeHead(404).end()
  response.writeHead(200, { 'Content-Type': target.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(target).pipe(response)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('Unable to start local audio server')
const origin = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
const page = await browser.newPage()
await page.goto(origin)

for (const [group, name, script] of jobs) {
  const relative = `assets/audio/voices/${group}/${name}.mp3`
  const result = await page.evaluate(async ({ origin, relative }) => {
    const response = await fetch(`${origin}/${relative}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const context = new AudioContext()
    const audio = await context.decodeAudioData(await response.arrayBuffer())
    const sampleRate = audio.sampleRate
    const channels = Math.min(2, audio.numberOfChannels)
    const releaseFrames = Math.round(sampleRate * 0.03)
    const paddingFrames = Math.round(sampleRate * 0.65)
    const outputFrames = audio.length + releaseFrames + paddingFrames
    const blockAlign = channels * 2
    const dataSize = outputFrames * blockAlign
    const wav = new ArrayBuffer(44 + dataSize)
    const view = new DataView(wav)
    const text = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)))
    text(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); text(8, 'WAVE'); text(12, 'fmt ')
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, dataSize, true)
    const channelData = Array.from({ length: channels }, (_, channel) => audio.getChannelData(channel))
    let offset = 44
    for (let frame = 0; frame < outputFrames; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        let sample = 0
        if (frame < audio.length) sample = channelData[channel][frame]
        else if (frame < audio.length + releaseFrames) {
          const progress = (frame - audio.length + 1) / releaseFrames
          sample = (channelData[channel][audio.length - 1] || 0) * (1 - progress) ** 2
        }
        sample = Math.max(-1, Math.min(1, sample))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
        offset += 2
      }
    }
    await context.close()
    const bytes = new Uint8Array(wav)
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    return { base64: btoa(binary), duration: outputFrames / sampleRate }
  }, { origin, relative })
  const wavPath = path.join(voiceRoot, group, `${name}.wav`)
  fs.writeFileSync(wavPath, Buffer.from(result.base64, 'base64'))
  console.log(`completed ${group}/${name}: ${result.duration.toFixed(2)}s — ${script}`)
}

await browser.close()
server.close()
