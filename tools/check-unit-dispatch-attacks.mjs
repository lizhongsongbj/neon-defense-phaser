import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const page=await browser.newPage({viewport:{width:1280,height:800}})
const errors=[]
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle',timeout:30000})
await page.click('#start-game')
await page.waitForSelector('#deploy-mission:not([disabled])',{timeout:20000})
await page.click('#deploy-mission');await page.waitForTimeout(1200)
await page.click('#reset-deployment');await page.waitForTimeout(250)
const build=async(x,y,name)=>{await page.mouse.click(x,y);await page.waitForSelector('.tower-option');await page.locator('.tower-option').filter({hasText:name}).click();await page.waitForTimeout(350)}
await build(467,128,'街头兵营')
await build(705,120,'无人机巢')
await page.click('#start-wave');await page.waitForTimeout(8500)
await page.screenshot({path:'tools/smoke-shots/14-unit-dispatch-attacks.png'})
console.log(JSON.stringify({errors},null,2))
await browser.close();if(errors.length)process.exit(1)
