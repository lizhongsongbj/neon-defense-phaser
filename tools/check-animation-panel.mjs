import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
await page.goto('http://127.0.0.1:5174/asset-forge.html', { waitUntil: 'networkidle' })
await page.waitForSelector('.animation-card')

const summary = await page.evaluate(() => ({
  total: document.querySelectorAll('.animation-card').length,
  count: document.querySelector('#animation-count')?.textContent,
  panelVisible: !(document.querySelector('[data-asset-panel="animations"]')?.hasAttribute('hidden')),
  title: document.querySelector('.animation-panel h2')?.textContent,
}))
await page.screenshot({ path: 'tools/smoke-shots/animation-panel.png', fullPage: true })

const counts = {}
for (const category of ['tower', 'enemy', 'mercenary', 'drone']) {
  await page.click(`[data-animation-filter="${category}"]`)
  counts[category] = await page.locator('.animation-card').count()
}
await page.fill('#animation-search', '亚当·重锤')
await page.click('[data-animation-filter="enemy"]')
const adamSmasherCards = await page.locator('.animation-card').count()
const adamSmasherLabels = await page.locator('.animation-card small').allTextContents()
await page.locator('.animation-card').first().click()
const detailVisible = await page.locator('#animation-detail').isVisible()
console.log({ summary, counts, adamSmasherCards, adamSmasherLabels, detailVisible, errors })
await browser.close()

if (
  errors.length ||
  summary.total !== 86 ||
  counts.tower !== 30 ||
  counts.enemy !== 38 ||
  counts.mercenary !== 9 ||
  counts.drone !== 9 ||
  adamSmasherCards !== 6 ||
  !detailVisible
) process.exit(1)
