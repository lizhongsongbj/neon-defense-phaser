import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

interface VoiceJob { group: string; name: string; script: string }
const jobs = JSON.parse(readFileSync(new URL('../tools/english-voice-scripts.json', import.meta.url), 'utf8').replace(/^\uFEFF/, '')) as VoiceJob[]
const scripts = jobs.filter((job) => job.group === 'lan')
const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function wavDurationSeconds(buffer: Buffer): number {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF')
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE')
  const channels = buffer.readUInt16LE(22)
  const sampleRate = buffer.readUInt32LE(24)
  const bitsPerSample = buffer.readUInt16LE(34)
  const dataBytes = buffer.readUInt32LE(40)
  return dataBytes / (sampleRate * channels * (bitsPerSample / 8))
}

test('all battlefield commander lines contain the complete English script and release tail', () => {
  assert.equal(scripts.length, 8)
  for (const { name, script } of scripts) {
    const base = new URL(`../public/assets/audio/voices/lan/${name}`, import.meta.url)
    assert.equal(readFileSync(new URL(`${base.href}.txt`), 'utf8').trim(), script)
    const subtitles = JSON.parse(readFileSync(new URL(`${base.href}.mp3.json`), 'utf8')) as Array<{ part: string }>
    assert.equal(normalize(subtitles.map((entry) => entry.part).join('')), normalize(script))
    const wav = readFileSync(new URL(`${base.href}.wav`))
    assert.ok(wavDurationSeconds(wav) >= 4.5, `${name} should contain a full spoken sentence`)

    const channels = wav.readUInt16LE(22)
    const sampleRate = wav.readUInt32LE(24)
    const bytesPerFrame = channels * 2
    const silentTailStart = Math.max(44, wav.length - Math.round(sampleRate * 0.5) * bytesPerFrame)
    for (let offset = silentTailStart; offset + 1 < wav.length; offset += 2) {
      assert.equal(wav.readInt16LE(offset), 0, `${name} should end with clean silence`)
    }
  }
})
