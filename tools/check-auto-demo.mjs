/**
 * 端到端烟雾测试 —— 验证战场右上角「AUTO 演示」按钮真正可用:
 * 部署 -> 点击 AUTO 演示 -> 观察状态文案变化(建造/升级/自动交战)-> 点击退出演示 -> 页面刷新恢复。
 * 用法: node tools/check-auto-demo.mjs http://localhost:5179/
 */
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5179/'
const outDir = 'tools/smoke-shots'
await import('node:fs/promises').then((fs) => fs.mkdir(outDir, { recursive: true }))

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${String(err)}`))

console.log('opening', url)
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(400)

await page.click('#start-game')
await page.waitForTimeout(400)
await page.waitForSelector('#deploy-mission:not([disabled])', { timeout: 20000 })
await page.click('#deploy-mission')
await page.waitForTimeout(1000)

await page.click('#auto-demo-toggle')
console.log('clicked auto-demo toggle, observing status for 8s...')

const statuses = []
for (let i = 0; i < 8; i += 1) {
  await page.waitForTimeout(1000)
  const text = await page.evaluate(() => document.querySelector('#auto-demo-status')?.textContent)
  const pressed = await page.evaluate(() => document.querySelector('#auto-demo-toggle')?.getAttribute('aria-pressed'))
  statuses.push({ t: i + 1, text, pressed })
}
console.log('status timeline', JSON.stringify(statuses, null, 2))
await page.screenshot({ path: `${outDir}/auto-demo-01-running.png` })

const towerCount = await page.evaluate(() => document.querySelectorAll('.tower-actor, canvas').length)
console.log('canvas present', towerCount > 0)

console.log('clicking exit demo...')
await page.click('#auto-demo-toggle')
await page.waitForTimeout(1000)
const statusAfterStop = await page.evaluate(() => document.querySelector('#auto-demo-status')?.textContent)
console.log('status after stop click', statusAfterStop)

// 退出演示后会 reload,等待页面回到标题/指挥中心
await page.waitForTimeout(1500)
const bodyState = await page.evaluate(() => ({
  titleHidden: document.getElementById('title-screen')?.hidden,
  gameRootHidden: document.getElementById('game-root')?.hidden,
}))
console.log('page state after reload', bodyState)
await page.screenshot({ path: `${outDir}/auto-demo-02-after-reload.png` })

console.log('--- errors ---')
if (errors.length === 0) {
  console.log('(none)')
} else {
  for (const e of errors) console.log(e)
}
console.log('done, screenshots in', outDir)
await browser.close()

const builtOrUpgraded = statuses.some((s) => /建造|升级|自动交战|发动|下一波/.test(s.text || ''))
const ok = errors.length === 0 && builtOrUpgraded
process.exit(ok ? 0 : 1)
