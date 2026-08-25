import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}})
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'})
console.log('before',await page.locator('button').allTextContents())
console.log('start count',await page.locator('#start-game').count())
if(await page.locator('#start-game').count()) { await page.click('#start-game'); await page.waitForTimeout(1000) }
console.log('after buttons',await page.locator('button').allTextContents())
console.log('tabs',await page.locator('[data-command-tab]').evaluateAll(es=>es.map(e=>({text:e.textContent,tab:e.getAttribute('data-command-tab')}))))
console.log('links',await page.locator('a').evaluateAll(es=>es.map(e=>({text:e.textContent,href:e.getAttribute('href')})).slice(0,30)))
await page.screenshot({path:'tools/smoke-shots/debug-home.png',fullPage:true})
await browser.close()
