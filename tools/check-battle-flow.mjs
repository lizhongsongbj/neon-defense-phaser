/**
 * 端到端烟雾测试 —— 用 playwright-core 驱动本地 Chrome,走一遍
 * 主界面 -> 指挥中心 -> 部署 -> 建塔 -> 波次推进 -> 返回指挥中心 的核心流程,
 * 并收集控制台错误。菜单/HUD 现在是真实 DOM,优先用选择器点击;
 * 战场本身(地图/塔位)仍是 Phaser 画布,继续用像素坐标点击。
 * 用法: node tools/check-battle-flow.mjs http://localhost:5174/
 */
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5174/'
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
page.on('requestfailed', (req) => errors.push(`[request-failed] ${req.url()}`))
page.on('response', (res) => {
  if (res.status() >= 400) errors.push(`[http-${res.status()}] ${res.url()}`)
})

console.log('opening', url)
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(600)
await page.screenshot({ path: `${outDir}/01-title-screen.png` })

await page.click('#start-game')
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/02-command-center.png` })

await page.click('.command-tab[data-command-tab="growth"]')
await page.waitForTimeout(200)
await page.screenshot({ path: `${outDir}/03-growth-panel.png` })
await page.click('.command-tab[data-command-tab="missions"]')
await page.waitForTimeout(200)

// 等待资源加载完成(部署按钮解禁)后再部署
await page.waitForSelector('#deploy-mission:not([disabled])', { timeout: 20000 })
await page.click('#deploy-mission')
await page.waitForTimeout(1500)
await page.screenshot({ path: `${outDir}/04-battle-start.png` })

// H4 地图 slot0 (36.5%, 16%) -> board (365,160) -> screen (467, 128),仍是 Phaser 画布
await page.mouse.click(467, 128)
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/05-tower-picker.png` })

// 建塔面板第一个选项(电弧塔)现在是真实 DOM 按钮
await page.click('.tower-option')
await page.waitForTimeout(500)
await page.screenshot({ path: `${outDir}/06-tower-built.png` })

// 再点同一格,应弹出塔操作面板而不是建塔面板
await page.mouse.click(467, 128)
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/07-tower-selected.png` })

// 等待第一波推进一段时间,观察敌人是否出现并移动
await page.waitForTimeout(6000)
await page.screenshot({ path: `${outDir}/08-wave-in-progress.png` })

// 返回指挥中心
await page.click('#return-command-center')
await page.waitForTimeout(500)
await page.screenshot({ path: `${outDir}/09-back-to-command-center.png` })

console.log('--- errors ---')
if (errors.length === 0) {
  console.log('(none)')
} else {
  for (const e of errors) console.log(e)
}
console.log('done, screenshots in', outDir)
await browser.close()
process.exit(errors.length ? 1 : 0)
