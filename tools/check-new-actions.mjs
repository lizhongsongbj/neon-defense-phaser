import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const context=await browser.newContext({viewport:{width:1280,height:800}}); await context.addInitScript(()=>localStorage.clear())
const page=await context.newPage(); const errors=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message)); page.on('requestfailed',r=>errors.push('failed '+r.url()))
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle',timeout:30000}); await page.click('#start-game'); await page.waitForTimeout(300); await page.click('[data-command-tab="animations"]'); await page.waitForTimeout(300)
const text=await page.locator('body').innerText(); const rows=await page.locator('.animation-card').count().catch(()=>0); console.log('cards',rows,'four names', ['企业浮空艇','数据吞噬者','电磁镇暴体','劫持浮游体'].map(n=>({name:n,count:text.split(n).length-1}))); console.log('planned mentions',text.match(/PLANNED/g)?.length||0,'errors',errors)
await page.screenshot({path:'tools/smoke-shots/missing-enemy-actions.png'}); await browser.close()
