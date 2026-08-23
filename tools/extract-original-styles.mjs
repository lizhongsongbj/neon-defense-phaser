/**
 * 一次性工具:打开原版 霓虹防线(解包版)页面,读取关键 UI 元素的最终计算样式
 * (getComputedStyle),避免人工在几千行层叠 CSS 里猜哪条规则最终生效。
 * 用法: node tools/extract-original-styles.mjs http://localhost:5173/
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5173/'
const outDir = 'tools/original-style-dump'
await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('pageerror', (e) => console.log('[pageerror]', String(e)))

const PROPS = [
  'color', 'background', 'backgroundColor', 'backgroundImage', 'border', 'borderColor', 'borderWidth', 'borderStyle',
  'boxShadow', 'clipPath', 'font', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'padding', 'margin',
  'width', 'height', 'position', 'top', 'left', 'right', 'bottom', 'zIndex', 'textShadow', 'textTransform',
  'borderRadius', 'gap', 'display', 'gridTemplateColumns', 'gridTemplateRows', 'alignItems', 'justifyContent',
  'transform', 'opacity', 'lineHeight',
]

async function dumpStyles(selectors) {
  return page.evaluate(
    ({ selectors, PROPS }) => {
      const out = {}
      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (!el) {
          out[sel] = null
          continue
        }
        const cs = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        const styleObj = {}
        for (const p of PROPS) styleObj[p] = cs[p]
        out[sel] = { style: styleObj, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } }
      }
      return out
    },
    { selectors, PROPS },
  )
}

console.log('opening', url)
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(800)

const titleStyles = await dumpStyles([
  '.title-screen', '.title-screen__kicker', '.title-screen__title-frame', '.title-screen__title-code',
  '.title-screen__title', '.start-game-button',
])
await page.screenshot({ path: `${outDir}/01-title.png` })
await fs.writeFile(`${outDir}/01-title-styles.json`, JSON.stringify(titleStyles, null, 2))

await page.click('#start-game')
await page.waitForTimeout(500)

const commandStyles = await dumpStyles([
  '.command-center', '.command-header', '.command-brand__mark', '.command-brand__copy strong', '.command-tabs',
  '.command-tab', '.command-profile', '.profile-stat strong', '.mission-panel', '.mission-rail', '.rail-heading strong',
  '.mission-row', '.mission-row[aria-selected="true"]', '.mission-brief', '.mission-title', '.mission-meta',
  '.deploy-button', '.growth-panel', '.growth-card', '.growth-card__body h3', '.growth-upgrade',
])
await page.screenshot({ path: `${outDir}/02-command-center.png` })
await fs.writeFile(`${outDir}/02-command-center-styles.json`, JSON.stringify(commandStyles, null, 2))

// 切到科技强化 tab 截图
const tabs = await page.$$('.command-tab')
if (tabs[1]) {
  await tabs[1].click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/03-growth-panel.png` })
  await tabs[0].click()
  await page.waitForTimeout(300)
}

await page.click('#deploy-mission')
await page.waitForTimeout(1200)

const battleStyles = await dumpStyles([
  '.topbar', '.player-status', '.status-item', '.status-value', '.icon-button', '.tile', '.tower',
])
await page.screenshot({ path: `${outDir}/04-battle.png` })
await fs.writeFile(`${outDir}/04-battle-styles.json`, JSON.stringify(battleStyles, null, 2))

// 点一个塔位触发建塔面板
await page.mouse.click(467, 128)
await page.waitForTimeout(400)
await page.screenshot({ path: `${outDir}/05-tower-picker.png` })
const pickerStyles = await dumpStyles(['.tower-picker', '.tower-option'])
await fs.writeFile(`${outDir}/05-tower-picker-styles.json`, JSON.stringify(pickerStyles, null, 2))

console.log('done, dump in', outDir)
await browser.close()
