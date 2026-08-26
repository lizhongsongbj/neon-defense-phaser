import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const context=await browser.newContext({viewport:{width:1280,height:800}}); await context.addInitScript(()=>localStorage.clear())
const page=await context.newPage(); const errors=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message)); page.on('requestfailed',r=>errors.push('failed '+r.url()))
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle',timeout:30000}); await page.click('#start-game'); await page.waitForTimeout(300); await page.click('[data-asset-tab="animations"]'); await page.waitForTimeout(300)
const result=await page.evaluate(()=>{const names=['企业浮空艇','数据吞噬者','电磁镇暴体','劫持浮游体']; const cards=[...document.querySelectorAll('.animation-card')]; return names.map(name=>{const matches=cards.filter(c=>c.textContent?.includes(name)); return {name,count:matches.length,imgs:matches.map(c=>({src:(c.querySelector('img') as HTMLImageElement)?.src,tag:c.querySelector('em')?.textContent}))}})})
console.log(JSON.stringify({result,errors},null,2)); await page.screenshot({path:'tools/smoke-shots/clean-enemy-animation-panel.png'}); await browser.close()
