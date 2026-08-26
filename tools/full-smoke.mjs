import { chromium } from 'playwright-core'
const browser = await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const context=await browser.newContext({viewport:{width:1280,height:800}})
await context.addInitScript(()=>localStorage.clear())
const page=await context.newPage(); const errors=[]
page.on('console',m=>{if(m.type()==='error')errors.push('console '+m.text())}); page.on('pageerror',e=>errors.push('page '+e.message)); page.on('requestfailed',r=>errors.push('failed '+r.url()+' '+r.failure()?.errorText)); page.on('response',r=>{if(r.status()>=400)errors.push('http '+r.status()+' '+r.url())})
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle',timeout:30000}); await page.click('#start-game'); await page.waitForTimeout(300); await page.click('#deploy-mission'); await page.waitForTimeout(1200)
console.log('battle text', (await page.locator('body').innerText()).slice(0,2200)); await page.screenshot({path:'tools/smoke-shots/full-battle-start.png'})
const selectors=await page.locator('button').evaluateAll(btns=>btns.map(b=>({id:b.id,txt:b.textContent?.trim(),hidden:(b.offsetParent===null),disabled:b.disabled})).filter(x=>!x.hidden))
console.log('visible buttons',selectors)
const auto=page.locator('#auto-demo-toggle'); if(await auto.count()){await auto.click(); for(let i=0;i<20;i++){await page.waitForTimeout(1000); if(i%5===4) console.log('t',i+1,await page.locator('body').innerText().then(x=>x.slice(-1200)))}}
await page.screenshot({path:'tools/smoke-shots/full-battle-auto.png'})
console.log('errors',errors)
await browser.close()
