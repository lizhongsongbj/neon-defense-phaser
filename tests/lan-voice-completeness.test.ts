import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const scripts = {
  opening: '指挥官，防线已部署。敌军正在接近，准备迎战！',
  enemy_incoming: '警告！侦测到敌军正在接近，请立即做好战斗准备！',
  final_wave: '注意！最终波次已经抵达。坚守阵地，不要让任何敌人通过！',
  fortress_damaged: '警告！大本营正在遭受攻击，请立即拦截突破防线的敌人！',
  node_attacked: '警告！防御节点正在遭受攻击，立刻增援该区域！',
  route_split: '敌军正在分流，多条路线同时出现目标。请重新部署防御力量！',
  victory: '任务完成！敌军攻势已经瓦解，防线成功守住！',
  defeat: '防线已经失守。保存作战数据，重新整备后再次部署。',
} as const

function wavDurationSeconds(buffer: Buffer): number {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF')
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE')
  const channels = buffer.readUInt16LE(22)
  const sampleRate = buffer.readUInt32LE(24)
  const bitsPerSample = buffer.readUInt16LE(34)
  const dataBytes = buffer.readUInt32LE(40)
  return dataBytes / (sampleRate * channels * (bitsPerSample / 8))
}

test('all battlefield commander lines contain the complete intended script and release tail', () => {
  for (const [name, script] of Object.entries(scripts)) {
    const base = new URL(`../public/assets/audio/voices/lan/${name}`, import.meta.url)
    assert.equal(readFileSync(new URL(`${base.href}.txt`), 'utf8').trim(), script)
    const wav = readFileSync(new URL(`${base.href}.wav`))
    assert.ok(wavDurationSeconds(wav) >= 4.5, `${name} should contain a full spoken sentence`)

    const channels = wav.readUInt16LE(22)
    const sampleRate = wav.readUInt32LE(24)
    const bytesPerFrame = channels * 2
    const silentTailStart = Math.max(44, wav.length - Math.round(sampleRate * 0.4) * bytesPerFrame)
    for (let offset = silentTailStart; offset + 1 < wav.length; offset += 2) {
      assert.equal(wav.readInt16LE(offset), 0, `${name} should end with clean silence`)
    }
  }
})
