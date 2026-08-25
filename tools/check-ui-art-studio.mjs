import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true})
const errors=[]
page.on('pageerror',error=>errors.push(String(error)))
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'})
await page.click('#start-game')
await page.click('[data-command-tab="assets"]')
await page.click('[data-asset-tab="ui-art"]')
await page.waitForSelector('#ui-art-preview .ui-command-layout')
const initial=await page.evaluate(()=>({
  visible:!(document.querySelector('[data-asset-panel="ui-art"]')?.hasAttribute('hidden')),
  selected:document.querySelector('[data-asset-tab="ui-art"]')?.getAttribute('aria-selected'),
  presets:document.querySelectorAll('[data-ui-preset]').length,
  themes:document.querySelectorAll('[data-ui-theme]').length,
  title:document.querySelector('#ui-art-preview-title')?.textContent,
  status:document.querySelector('#ui-art-status')?.textContent,
}))
await page.click('[data-ui-preset="battle"]')
await page.click('[data-ui-theme="street"]')
await page.locator('#ui-art-density').fill('96')
await page.locator('#ui-art-scanlines').uncheck()
await page.waitForSelector('#ui-art-preview .ui-mock-battle')
const changed=await page.evaluate(()=>({
  title:document.querySelector('#ui-art-preview-title')?.textContent,
  meta:document.querySelector('#ui-art-preview-meta')?.textContent,
  theme:document.querySelector('#ui-art-studio')?.getAttribute('data-theme'),
  hasBattle:!!document.querySelector('#ui-art-preview .ui-mock-battle'),
  scanlines:document.querySelector('#ui-art-preview')?.classList.contains('has-scanlines'),
  accent:getComputedStyle(document.querySelector('#ui-art-preview')).getPropertyValue('--ui-art-accent').trim(),
}))
await page.screenshot({path:'tools/smoke-shots/ui-art-studio.png',fullPage:true})
console.log(JSON.stringify({initial,changed,errors},null,2))
await browser.close()
if(errors.length||!initial.visible||initial.selected!=='true'||initial.presets!==5||initial.themes!==4||changed.title!=='战斗 HUD'||changed.theme!=='street'||!changed.hasBattle||changed.scanlines)process.exit(1)
