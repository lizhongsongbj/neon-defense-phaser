import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { COMMANDER_VOICE_PLAYBACK_RATE, DRONE_VOICE_PLAYBACK_RATE, VOICE_PLAYBACK_RATE } from '../src/audio/voiceManifest'

const voiceSystem = readFileSync(new URL('../src/audio/VoiceSystem.ts', import.meta.url), 'utf8')
const battleScene = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
const audioStudio = readFileSync(new URL('../src/ui/AudioStudio.ts', import.meta.url), 'utf8')

test('all character voices use a brisk but complete shared playback rate', () => {
  assert.equal(VOICE_PLAYBACK_RATE, 1.12)
  assert.equal(COMMANDER_VOICE_PLAYBACK_RATE, 1)
  assert.equal(DRONE_VOICE_PLAYBACK_RATE, 1)
  assert.match(voiceSystem, /category === 'drone-hive'/)
  assert.match(voiceSystem, /DRONE_VOICE_PLAYBACK_RATE/)
  assert.match(voiceSystem, /rate:\s*playbackRate/)
  assert.match(audioStudio, /item\.group === '蜂后无人机' \? DRONE_VOICE_PLAYBACK_RATE : VOICE_PLAYBACK_RATE/)
})

test('voice playback is not interrupted by another line or battle scene teardown', () => {
  assert.match(voiceSystem, /if \(this\.current\) return false/)
  assert.doesNotMatch(battleScene, /this\.voice\?\.stop\(\)/)
  assert.doesNotMatch(audioStudio, /pauseOtherPlayers|player\.pause\(\)/)
})

