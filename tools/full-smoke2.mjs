import { chromium } from 'playwright-core'
const browser = await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const context=await browser.newContext({viewport:{width:1280,height:800}}); await context.addInitScript(()=>localStorage.clear())
const page=await context.newPage(); const errors=[]; const requests=[]
page.on('console',m=>{if(m.type()==='error')errors.push('console '+m.text())}); page.on('pageerror',e=>errors.push('page '+e.message)); page.on('requestfailed',r=>errors.push('failed '+r.url()+' '+r.failure()?.errorText)); page.on('response',r=>{if(r.status()>=400)errors.push('http '+r.status()+' '+r.url())})
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle',timeout:30000}); await page.click('#start-game'); await page.waitForTimeout(300); await page.click('#deploy-mission'); await page.waitForTimeout(300); await page.getByText('确认编组并部署',{exact:true}).click(); await page.waitForTimeout(1300)
console.log('battle visible',await page.locator('#battle-hud').isVisible().catch(()=>false), 'body tail', (await page.locator('body').innerText()).slice(-1800)); await page.screenshot({path:'tools/smoke-shots/full-battle-start2.png'})
const auto=page.locator('#auto-demo-toggle'); console.log('auto count/visible',await auto.count(),await auto.isVisible().catch(()=>false)); if(await auto.isVisible()){await auto.click(); for(let i=0;i<20;i++){await page.waitForTimeout(1000); if(i%5===4)console.log('t',i+1,(await page.locator('body').innerText()).slice(-600))}}
await page.screenshot({path:'tools/smoke-shots/full-battle-auto2.png'}); console.log('errors',JSON.stringify(errors,null,2)); await browser.close()
