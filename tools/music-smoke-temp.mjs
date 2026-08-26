import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('neon-defense-music-muted', 'false'))
await page.reload({ waitUntil: 'networkidle' })
await page.click('#start-game')
await page.waitForTimeout(150)
await page.click('#hud-toggle-music')
await page.waitForTimeout(2200)
const ui = await page.evaluate(() => ({
  stored: localStorage.getItem('neon-defense-music-muted'),
  pressed: document.querySelector('#hud-toggle-music')?.getAttribute('aria-pressed'),
}))
const controller = await page.evaluate(async () => {
  const { MusicController } = await import('/src/audio/MusicController.ts?music-smoke=1')
  const made = []
  const manager = {
    game: { cache: { audio: { exists: () => true } } },
    add: (key, config) => {
      const sound = {
        key,
        volume: config.volume ?? 0,
        isPlaying: false,
        isPaused: false,
        destroyed: false,
        play() { this.isPlaying = true; this.isPaused = false; return true },
        pause() { this.isPlaying = false; this.isPaused = true },
        resume() { this.isPlaying = true; this.isPaused = false },
        stop() { this.isPlaying = false; this.isPaused = false },
        destroy() { this.destroyed = true; this.isPlaying = false },
      }
      made.push(sound)
      return sound
    },
  }
  localStorage.setItem('neon-defense-music-muted', 'false')
  const music = new MusicController(manager)
  music.start(0)
  await new Promise(r => setTimeout(r, 80))
  await music.setMuted(true)
  await new Promise(r => setTimeout(r, 900))
  const afterMute = made.map(s => ({ volume: s.volume, playing: s.isPlaying, paused: s.isPaused }))
  await music.setMuted(false)
  await new Promise(r => setTimeout(r, 350))
  const afterResume = made.map(s => ({ volume: s.volume, playing: s.isPlaying, paused: s.isPaused }))
  return { muted: music.muted, afterMute, afterResume }
})
console.log(JSON.stringify({ ui, controller, errors }, null, 2))
await browser.close()
if (errors.length || ui.stored !== 'true' || ui.pressed !== 'false' || controller.afterMute.some(s => s.volume !== 0 || s.playing) || !controller.afterResume.some(s => s.volume > 0 && s.playing)) process.exit(1)
