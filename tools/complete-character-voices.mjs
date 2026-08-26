import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const root = path.resolve('public')
const manifestPath = path.resolve('src/audio/voiceManifest.ts')
const manifest = fs.readFileSync(manifestPath, 'utf8')
const voiceFiles = [...new Set([...manifest.matchAll(/'([^']+\.(?:wav|mp3))'/gi)].map((match) => match[1]))]

const mime = (file) => file.endsWith('.wav') ? 'audio/wav' : file.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream'
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname)
  if (pathname === '/' || pathname === '/index.html') {
    response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>Voice repair</title>')
    return
  }
  const target = path.resolve(root, `.${pathname}`)
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, { 'Content-Type': mime(target), 'Cache-Control': 'no-store' })
  fs.createReadStream(target).pipe(response)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('Unable to start voice repair server')
const baseUrl = `http://127.0.0.1:${address.port}`

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
const page = await browser.newPage()
await page.goto(baseUrl + '/index.html')

for (const [index, file] of voiceFiles.entries()) {
  const encoded = await page.evaluate(async ({ baseUrl, file }) => {
    const response = await fetch(`${baseUrl}/assets/audio/voices/${file}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${file}`)
    const context = new AudioContext()
    const decoded = await context.decodeAudioData(await response.arrayBuffer())
    const sampleRate = decoded.sampleRate
    const channelCount = Math.min(2, decoded.numberOfChannels)
    const releaseSamples = Math.round(sampleRate * 0.018)
    const silenceSamples = Math.round(sampleRate * 0.42)
    const sourceLength = decoded.length
    const outputLength = sourceLength + releaseSamples + silenceSamples
    const bytesPerSample = 2
    const blockAlign = channelCount * bytesPerSample
    const dataLength = outputLength * blockAlign
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)
    const writeText = (offset, text) => [...text].forEach((character, i) => view.setUint8(offset + i, character.charCodeAt(0)))
    writeText(0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    writeText(8, 'WAVE')
    writeText(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, channelCount, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true)
    writeText(36, 'data')
    view.setUint32(40, dataLength, true)
    const channels = Array.from({ length: channelCount }, (_, channel) => decoded.getChannelData(channel))
    let offset = 44
    for (let frame = 0; frame < outputLength; frame += 1) {
      for (let channel = 0; channel < channelCount; channel += 1) {
        let sample = 0
        if (frame < sourceLength) {
          sample = channels[channel][frame]
        } else if (frame < sourceLength + releaseSamples) {
          const last = channels[channel][sourceLength - 1] || 0
          const progress = (frame - sourceLength + 1) / releaseSamples
          sample = last * (1 - progress) * (1 - progress)
        }
        sample = Math.max(-1, Math.min(1, sample))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
        offset += 2
      }
    }
    await context.close()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    return btoa(binary)
  }, { baseUrl, file })

  const outputRelative = file.replace(/\.(?:wav|mp3)$/i, '.wav')
  const outputPath = path.join(root, 'assets/audio/voices', outputRelative)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, Buffer.from(encoded, 'base64'))
  process.stdout.write(`\rCompleted ${index + 1}/${voiceFiles.length}: ${outputRelative}                    `)
}

await browser.close()
server.close()

let updatedManifest = fs.readFileSync(manifestPath, 'utf8')
updatedManifest = updatedManifest.replace(/([^'\s]+)\.mp3'/g, "$1.wav'")
updatedManifest = updatedManifest.replace('export const VOICE_PLAYBACK_RATE = 1.2', 'export const VOICE_PLAYBACK_RATE = 1.12')
fs.writeFileSync(manifestPath, updatedManifest, 'utf8')
console.log(`\nCompleted ${voiceFiles.length} character voice files with a clean release tail.`)
