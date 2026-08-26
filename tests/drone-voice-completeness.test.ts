import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const scripts = {
  build: '蜂群控制核心已上线。无人机编队准备部署。',
  select: '蜂后系统在线。等待新的战术指令。',
  anti_air_mode: '切换防空模式。截击无人机，锁定所有空中目标。',
  bomb_mode: '切换轰炸模式。爆破无人机，装载重型弹药。',
  repair_mode: '切换维修模式。回收受损单位，并执行快速修复。',
  skill: '蜂群协议启动。所有无人机立即集中火力！',
  drone_destroyed: '警告，一架无人机已经失去连接。正在准备替补单位。',
  return: '任务结束。无人机编队脱离战区，返回母巢。',
} as const

const normalize = (text: string) => text.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '')

function wavDurationSeconds(buffer: Buffer): number {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF')
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE')
  const channels = buffer.readUInt16LE(22)
  const sampleRate = buffer.readUInt32LE(24)
  const bitsPerSample = buffer.readUInt16LE(34)
  const dataBytes = buffer.readUInt32LE(40)
  return dataBytes / (sampleRate * channels * (bitsPerSample / 8))
}

test('all drone lines include the complete intended subtitle script and a clean release tail', () => {
  for (const [name, script] of Object.entries(scripts)) {
    const base = new URL(`../public/assets/audio/voices/queen_bee/${name}`, import.meta.url)
    assert.equal(readFileSync(new URL(`${base.href}.txt`), 'utf8').trim(), script)
    const subtitles = JSON.parse(readFileSync(new URL(`${base.href}.mp3.json`), 'utf8')) as Array<{ part: string }>
    assert.equal(normalize(subtitles.map((entry) => entry.part).join('')), normalize(script))

    const wav = readFileSync(new URL(`${base.href}.wav`))
    assert.ok(wavDurationSeconds(wav) >= 4.5, `${name} should contain a complete spoken sentence`)
    const channels = wav.readUInt16LE(22)
    const sampleRate = wav.readUInt32LE(24)
    const silentTailStart = Math.max(44, wav.length - Math.round(sampleRate * 0.5) * channels * 2)
    for (let offset = silentTailStart; offset + 1 < wav.length; offset += 2) {
      assert.equal(wav.readInt16LE(offset), 0, `${name} should end with clean silence`)
    }
  }
})
