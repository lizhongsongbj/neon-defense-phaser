import { chromium } from 'playwright-core'
import fs from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5178/'
const outDir = 'tools/rewrite-screens'
await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('pageerror', (e) => console.log('[pageerror]', String(e)))
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[console.error]', msg.text())
})

console.log('opening', url)
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(600)
await page.screenshot({ path: `${outDir}/01-title.png` })

await page.click('#start-game')
await page.waitForTimeout(500)
await page.screenshot({ path: `${outDir}/02-command-center.png` })

await page.click('.command-tab[data-command-tab="growth"]')
await page.waitForTimeout(300)
await page.screenshot({ path: `${outDir}/03-growth-panel.png` })
await page.click('.command-tab[data-command-tab="missions"]')
await page.waitForTimeout(300)

await page.waitForSelector('#deploy-mission:not([disabled])', { timeout: 20000 })
await page.click('#deploy-mission')
await page.waitForTimeout(1200)
await page.screenshot({ path: `${outDir}/04-battle.png` })

await page.mouse.click(467, 128)
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/05-tower-picker.png` })

const opt = await page.$('.tower-option')
if (opt) {
  await opt.click()
  await page.waitForTimeout(400)
  await page.mouse.click(467, 128)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/06-tower-actions.png` })
} else {
  console.log('no tower-option found, picker did not open')
}

await page.click('#reset-deployment')
await page.waitForTimeout(300)
await page.screenshot({ path: `${outDir}/06b-after-reset.png` })

await page.click('#intel-button')
await page.waitForTimeout(300)
await page.screenshot({ path: `${outDir}/07-intel-panel.png` })
await page.click('#intel-close')

console.log('done, dump in', outDir)
await browser.close()
