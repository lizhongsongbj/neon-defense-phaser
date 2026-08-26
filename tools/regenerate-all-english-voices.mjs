import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const { EdgeTTS } = require('C:/Users/1/.codex/tmp/edge-tts-runtime/node_modules/node-edge-tts')
const jobs = JSON.parse(fs.readFileSync(path.resolve('tools/english-voice-scripts.json'), 'utf8').replace(/^\uFEFF/, ''))
const voiceRoot = path.resolve('public/assets/audio/voices')
const normalize = (text) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function createTts() {
  return new EdgeTTS({
    voice: 'en-US-GuyNeural',
    lang: 'en-US',
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    saveSubtitles: true,
    rate: '+0%',
    pitch: '-2%',
    volume: '+0%',
    timeout: 60000,
  })
}

async function generateJob(job) {
  const directory = path.join(voiceRoot, job.group)
  fs.mkdirSync(directory, { recursive: true })
  const mp3 = path.join(directory, `${job.name}.mp3`)
  const subtitlePath = `${mp3}.json`
  let subtitles = []
  let validExisting = false
  if (fs.existsSync(mp3) && fs.existsSync(subtitlePath)) {
    try {
      subtitles = JSON.parse(fs.readFileSync(subtitlePath, 'utf8'))
      validExisting = normalize(subtitles.map((entry) => entry.part).join('')) === normalize(job.script) && fs.statSync(mp3).size > 15_000
    } catch { validExisting = false }
  }
  if (!validExisting) {
    let lastError
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await createTts().ttsPromise(job.script, mp3)
        lastError = undefined
        break
      } catch (error) {
        lastError = error
        console.warn(`retry ${job.group}/${job.name} attempt ${attempt}: ${String(error)}`)
        await new Promise((resolve) => setTimeout(resolve, 900 * attempt))
      }
    }
    if (lastError) throw lastError
    subtitles = JSON.parse(fs.readFileSync(subtitlePath, 'utf8'))
  }
  const spoken = subtitles.map((entry) => entry.part).join('')
  if (normalize(spoken) !== normalize(job.script)) {
    throw new Error(`Incomplete subtitle coverage for ${job.group}/${job.name}: expected "${job.script}", received "${spoken}"`)
  }
  fs.writeFileSync(path.join(directory, `${job.name}.txt`), `${job.script}\n`, 'utf8')
  console.log(`generated ${job.group}/${job.name}: ${subtitles.at(-1)?.end ?? 0}ms`)
}

const concurrency = 3
let cursor = 0
async function worker() {
  while (cursor < jobs.length) {
    const index = cursor
    cursor += 1
    await generateJob(jobs[index])
  }
}
await Promise.all(Array.from({ length: concurrency }, worker))

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
const edgePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
if (!edgePath) throw new Error('Microsoft Edge is required to encode WAV files')
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
const page = await browser.newPage()
await page.goto(origin)

for (const [index, job] of jobs.entries()) {
  const relative = `assets/audio/voices/${job.group}/${job.name}.mp3`
  const result = await page.evaluate(async ({ origin, relative }) => {
    const response = await fetch(`${origin}/${relative}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const context = new AudioContext()
    const audio = await context.decodeAudioData(await response.arrayBuffer())
    const sampleRate = 48000
    const channels = 1
    const render = new OfflineAudioContext(channels, Math.ceil(audio.duration * sampleRate), sampleRate)
    const source = render.createBufferSource()
    source.buffer = audio
    source.connect(render.destination)
    source.start()
    const rendered = await render.startRendering()
    const releaseFrames = Math.round(sampleRate * 0.03)
    const paddingFrames = Math.round(sampleRate * 0.65)
    const outputFrames = rendered.length + releaseFrames + paddingFrames
    const blockAlign = channels * 2
    const dataSize = outputFrames * blockAlign
    const wav = new ArrayBuffer(44 + dataSize)
    const view = new DataView(wav)
    const text = (offset, value) => [...value].forEach((char, textIndex) => view.setUint8(offset + textIndex, char.charCodeAt(0)))
    text(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); text(8, 'WAVE'); text(12, 'fmt ')
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, dataSize, true)
    const channelData = rendered.getChannelData(0)
    let offset = 44
    for (let frame = 0; frame < outputFrames; frame += 1) {
      let sample = 0
      if (frame < rendered.length) sample = channelData[frame]
      else if (frame < rendered.length + releaseFrames) {
        const progress = (frame - rendered.length + 1) / releaseFrames
        sample = (channelData[rendered.length - 1] || 0) * (1 - progress) ** 2
      }
      sample = Math.max(-1, Math.min(1, sample))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
    await context.close()
    const bytes = new Uint8Array(wav)
    let binary = ''
    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 0x8000) binary += String.fromCharCode(...bytes.subarray(byteIndex, byteIndex + 0x8000))
    return { base64: btoa(binary), duration: outputFrames / sampleRate }
  }, { origin, relative })
  const wavPath = path.join(voiceRoot, job.group, `${job.name}.wav`)
  fs.writeFileSync(wavPath, Buffer.from(result.base64, 'base64'))
  console.log(`completed ${index + 1}/${jobs.length} ${job.group}/${job.name}: ${result.duration.toFixed(2)}s`)
}

await browser.close()
server.close()
console.log(`Completed ${jobs.length} full English voice lines.`)
