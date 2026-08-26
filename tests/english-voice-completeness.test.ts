import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

interface VoiceJob { group: string; name: string; script: string }
const jobs = JSON.parse(readFileSync(new URL('../tools/english-voice-scripts.json', import.meta.url), 'utf8').replace(/^\uFEFF/, '')) as VoiceJob[]
const manifest = readFileSync(new URL('../src/audio/voiceManifest.ts', import.meta.url), 'utf8')
const manifestFiles = [...new Set([...manifest.matchAll(/'([^']+\.wav)'/g)].map((match) => match[1]))]
const nonVerbalFiles = new Set(['neurohound/roar.wav', 'matriarch/roar.wav', 'bonebreaker/roar.wav'])
const expectedSpokenFiles = manifestFiles.filter((file) => !nonVerbalFiles.has(file))
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

test('every spoken runtime voice has one complete English script', () => {
  assert.equal(manifestFiles.length, 83)
  assert.equal(jobs.length, 80)
  assert.deepEqual(
    [...jobs.map((job) => `${job.group}/${job.name}.wav`)].sort(),
    [...expectedSpokenFiles].sort(),
  )
  assert.equal(new Set(jobs.map((job) => `${job.group}/${job.name}`)).size, jobs.length)

  for (const { group, name, script } of jobs) {
    assert.doesNotMatch(script, /\p{Script=Han}/u, `${group}/${name} must be translated to English`)
    const base = new URL(`../public/assets/audio/voices/${group}/${name}`, import.meta.url)
    const transcript = readFileSync(new URL(`${base.href}.txt`), 'utf8').trim()
    assert.equal(transcript, script)
    assert.doesNotMatch(transcript, /\p{Script=Han}/u)

    const subtitles = JSON.parse(readFileSync(new URL(`${base.href}.mp3.json`), 'utf8')) as Array<{ part: string }>
    const spoken = subtitles.map((entry) => entry.part).join('')
    assert.equal(normalize(spoken), normalize(script), `${group}/${name} subtitle coverage must be complete`)

    const wav = readFileSync(new URL(`${base.href}.wav`))
    assert.ok(wavDurationSeconds(wav) >= 4.5, `${group}/${name} should contain a complete spoken line`)
    const channels = wav.readUInt16LE(22)
    const sampleRate = wav.readUInt32LE(24)
    const silentTailStart = Math.max(44, wav.length - Math.round(sampleRate * 0.5) * channels * 2)
    for (let offset = silentTailStart; offset + 1 < wav.length; offset += 2) {
      assert.equal(wav.readInt16LE(offset), 0, `${group}/${name} should end with clean silence`)
    }
  }
})

test('nonverbal creature roars remain available and are not replaced with speech', () => {
  for (const file of nonVerbalFiles) {
    const wav = readFileSync(new URL(`../public/assets/audio/voices/${file}`, import.meta.url))
    assert.ok(wavDurationSeconds(wav) >= 2)
  }
})
