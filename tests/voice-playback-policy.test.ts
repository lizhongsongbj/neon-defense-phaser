import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { VOICE_PLAYBACK_RATE } from '../src/audio/voiceManifest'

const voiceSystem = readFileSync(new URL('../src/audio/VoiceSystem.ts', import.meta.url), 'utf8')
const battleScene = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
const audioStudio = readFileSync(new URL('../src/ui/AudioStudio.ts', import.meta.url), 'utf8')

test('all character voices use a faster shared playback rate', () => {
  assert.equal(VOICE_PLAYBACK_RATE, 1.2)
  assert.match(voiceSystem, /rate:\s*VOICE_PLAYBACK_RATE/)
  assert.match(audioStudio, /item\.category === 'voice' \? VOICE_PLAYBACK_RATE : 1/)
})

test('voice playback is not interrupted by another line or battle scene teardown', () => {
  assert.match(voiceSystem, /if \(this\.current\) return false/)
  assert.doesNotMatch(battleScene, /this\.voice\?\.stop\(\)/)
  assert.doesNotMatch(audioStudio, /pauseOtherPlayers|player\.pause\(\)/)
})

