/**
 * 端到端烟雾测试 —— 验证指挥中心「数值测试」面板可以真正跑通:
 * 打开指挥中心 -> 切到数值测试 tab -> 填小参数跑一次 -> 校验结果区域渲染。
 * 用法: node tools/check-balance-panel.mjs http://localhost:5179/
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

await page.click('.command-tab[data-command-tab="balance"]')
await page.waitForTimeout(200)
await page.screenshot({ path: `${outDir}/balance-01-empty.png` })

await page.selectOption('#balance-map', 'current')
await page.selectOption('#balance-difficulty', 'normal')
await page.selectOption('#balance-strategy', 'adaptive')
await page.fill('#balance-waves', '3')
await page.selectOption('#balance-runs', '10')
await page.click('#balance-run')

await page.waitForSelector('.balance-score', { timeout: 30000 })
await page.waitForTimeout(200)
await page.screenshot({ path: `${outDir}/balance-02-result.png`, fullPage: true })

const summary = await page.evaluate(() => {
  const status = document.querySelector('#balance-status')?.textContent
  const score = document.querySelector('.balance-score strong')?.textContent
  const rows = document.querySelectorAll('.balance-table tbody tr').length
  const impactRows = document.querySelectorAll('.impact-row').length
  const findings = document.querySelectorAll('.balance-finding').length
  return { status, score, rows, impactRows, findings }
})
console.log('summary', summary)

// 导出按钮存在且可点击(不校验下载文件本身)
const hasExport = await page.evaluate(() => !!document.querySelector('#balance-export'))
console.log('hasExportButton', hasExport)

console.log('--- errors ---')
if (errors.length === 0) {
  console.log('(none)')
} else {
  for (const e of errors) console.log(e)
}
console.log('done, screenshots in', outDir)
await browser.close()

const ok = errors.length === 0 && summary.rows === 1 && summary.impactRows === 5 && hasExport
process.exit(ok ? 0 : 1)
