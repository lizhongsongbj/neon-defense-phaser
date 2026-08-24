import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[]
page.on('pageerror',e=>errors.push(String(e)))
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'})
await page.click('#start-game')
await page.click('[data-command-tab="animations"]')
await page.waitForSelector('.animation-card')
const summary=await page.evaluate(()=>({
 total:document.querySelectorAll('.animation-card').length,
 count:document.querySelector('#animation-count')?.textContent,
 tower:document.querySelectorAll('.animation-card small').length,
 panelVisible:!(document.querySelector('[data-command-panel="animations"]')?.hasAttribute('hidden')),
 title:document.querySelector('.animation-panel h2')?.textContent,
}))
await page.screenshot({path:'tools/smoke-shots/animation-panel.png',fullPage:true})
await page.click('[data-animation-filter="tower"]')
const towers=await page.locator('.animation-card').count()
await page.click('[data-animation-filter="enemy"]')
const enemies=await page.locator('.animation-card').count()
await page.click('[data-animation-filter="mercenary"]')
const mercs=await page.locator('.animation-card').count()
await page.click('[data-animation-filter="drone"]')
const drones=await page.locator('.animation-card').count()
await page.locator('.animation-card').first().click()
const detailVisible=await page.locator('#animation-detail').isVisible()
console.log({summary,towers,enemies,mercs,drones,detailVisible,errors})
await browser.close()
if(errors.length||summary.total!==69||towers!==15||enemies!==36||mercs!==9||drones!==9||!detailVisible)process.exit(1)

