import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const errors=[]
page.on('pageerror',e=>errors.push(String(e)))
await page.goto('http://127.0.0.1:5174/image-studio.html',{waitUntil:'networkidle',timeout:30000})
await page.click('[data-studio-section="monsters"]')
await page.waitForSelector('#monster-library-grid .monster-library-card')
const cards=page.locator('#monster-library-grid .monster-library-card')
const count=await cards.count()
for(let i=0;i<count;i++){await cards.nth(i).scrollIntoViewIfNeeded();await page.waitForTimeout(60)}
const text=await page.locator('#monster-library-grid').innerText()
const images=await cards.locator('img').evaluateAll(xs=>xs.map(x=>({alt:x.alt,ok:x.complete&&x.naturalWidth>0})))
await cards.nth(7).scrollIntoViewIfNeeded();await page.waitForTimeout(300)
await page.screenshot({path:'tools/smoke-shots/13-biological-enemies-studio.png'})
const newUnits=['神经猎犬','育质母体','骨铠破障兽']
const names=newUnits.every(n=>text.includes(n))
const newImagesOk=images.filter(x=>newUnits.includes(x.alt)).every(x=>x.ok)
console.log(JSON.stringify({count,names,bioTags:(text.match(/生物/g)||[]).length,newImagesOk,errors},null,2))
await browser.close()
if(count!==12||!names||!newImagesOk||errors.length)process.exit(1)
