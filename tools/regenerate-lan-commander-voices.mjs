import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const sessionPath = 'C:/Users/1/.codex/sessions/2026/08/24/rollout-2026-08-24T19-25-27-01a03384-aace-70b0-8be4-40cc65f4fa16.jsonl'
const voiceRoot = path.resolve('public/assets/audio/voices/lan')
const jobs = [
  ['指挥官，防线已部署。敌军正在接近，准备迎战！', 'opening'],
  ['警告！侦测到敌军正在接近，请立即做好战斗准备！', 'enemy_incoming'],
  ['注意！最终波次已经抵达。坚守阵地，不要让任何敌人通过！', 'final_wave'],
  ['警告！大本营正在遭受攻击，请立即拦截突破防线的敌人！', 'fortress_damaged'],
  ['警告！防御节点正在遭受攻击，立刻增援该区域！', 'node_attacked'],
  ['敌军正在分流，多条路线同时出现目标。请重新部署防御力量！', 'route_split'],
  ['任务完成！敌军攻势已经瓦解，防线成功守住！', 'victory'],
  ['防线已经失守。保存作战数据，重新整备后再次部署。', 'defeat'],
]

const calls = new Map()
const outputs = new Map()
for (const line of fs.readFileSync(sessionPath, 'utf8').trim().split('\n')) {
  let record
  try { record = JSON.parse(line) } catch { continue }
  const payload = record.payload
  if (record.type === 'response_item' && payload?.type === 'function_call' && payload.name === 'generate_speech') {
    const args = JSON.parse(payload.arguments)
    calls.set(payload.call_id, args.prompt)
  }
  if (record.type === 'event_msg' && payload?.type === 'mcp_tool_call_end') {
    const text = payload.result?.Ok?.content?.find?.((item) => item.type === 'text')?.text
    if (text) outputs.set(payload.call_id, text)
  }
}

const sources = []
for (const [prompt, name] of jobs) {
  const callId = [...calls].reverse().find(([, candidate]) => candidate === prompt)?.[0]
  if (!callId) throw new Error(`Missing generated speech call for: ${prompt}`)
  const rawOutput = outputs.get(callId)
  const result = JSON.parse(rawOutput)
  if (!result.base64 || result.contentType !== 'audio/mpeg') throw new Error(`Invalid generated speech output: ${name}`)
  const decoded = Buffer.from(result.base64, 'base64')
  if (decoded.length !== result.byteLength) throw new Error(`Truncated speech output: ${name} (${decoded.length}/${result.byteLength})`)
  const sourcePath = path.join(voiceRoot, `${name}.regenerated.mp3`)
  fs.writeFileSync(sourcePath, decoded)
  sources.push({ prompt, name, sourcePath })
}

const publicRoot = path.resolve('public')
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname)
  if (pathname === '/') return response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html>')
  const target = path.resolve(publicRoot, `.${pathname}`)
  if (!target.startsWith(publicRoot) || !fs.existsSync(target)) return response.writeHead(404).end()
  response.writeHead(200, { 'Content-Type': target.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream' })
  fs.createReadStream(target).pipe(response)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('Unable to start local audio server')
const origin = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
const page = await browser.newPage()
await page.goto(origin)

for (const job of sources) {
  const relative = path.relative(publicRoot, job.sourcePath).replaceAll('\\', '/')
  const encoded = await page.evaluate(async ({ origin, relative }) => {
    const response = await fetch(`${origin}/${relative}`)
    const context = new AudioContext()
    const audio = await context.decodeAudioData(await response.arrayBuffer())
    const sampleRate = audio.sampleRate
    const channels = Math.min(2, audio.numberOfChannels)
    const releaseFrames = Math.round(sampleRate * 0.025)
    const paddingFrames = Math.round(sampleRate * 0.5)
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
  fs.writeFileSync(path.join(voiceRoot, `${job.name}.wav`), Buffer.from(encoded.base64, 'base64'))
  fs.writeFileSync(path.join(voiceRoot, `${job.name}.txt`), `${job.prompt}\n`, 'utf8')
  fs.unlinkSync(job.sourcePath)
  console.log(`${job.name}: ${encoded.duration.toFixed(2)}s — ${job.prompt}`)
}

await browser.close()
server.close()
