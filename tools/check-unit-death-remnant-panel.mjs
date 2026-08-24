import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(String(e)))
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle',timeout:30000});await page.click('#start-game');await page.waitForTimeout(350);await page.click('[data-command-tab="effects"]');await page.waitForTimeout(300)
await page.click('[data-effect-filter="mercenary-death"]');await page.waitForTimeout(250);const mercImages=await page.locator('#effect-grid .effect-remnant').count();await page.screenshot({path:'tools/smoke-shots/17-mercenary-blood-remnants.png'})
await page.click('[data-effect-filter="drone-death"]');await page.waitForTimeout(250);const droneImages=await page.locator('#effect-grid .effect-remnant').count();await page.screenshot({path:'tools/smoke-shots/18-drone-parts-remnants.png'})
console.log(JSON.stringify({mercImages,droneImages,errors},null,2));await browser.close();if(mercImages!==3||droneImages!==3||errors.length)process.exit(1)
