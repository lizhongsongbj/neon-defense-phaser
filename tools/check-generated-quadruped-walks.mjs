import { chromium } from 'playwright-core'
const browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[]
page.on('pageerror',e=>errors.push(String(e)))
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'})
await page.click('#start-game')
await page.click('[data-command-tab="assets"]')
await page.waitForSelector('.animation-card')
await page.click('[data-animation-filter="enemy"]')
const targets=['电磁镇暴体','神经猎犬','骨铠破障兽']
const results=[]
for(const name of targets){
  const card=page.locator('.animation-card').filter({hasText:name}).filter({hasText:'行走'}).first()
  if(await card.count()===0) throw new Error(`Missing ${name} walk card`)
  await card.evaluate(el=>el.click())
  await page.waitForTimeout(250)
  const detail=await page.evaluate(()=>{
    const panel=document.querySelector('#animation-detail')
    const img=panel?.querySelector('img')
    return {visible:!!panel&&!panel.hasAttribute('hidden'),src:img?.getAttribute('src')||'',currentSrc:img?.currentSrc||'',naturalWidth:img?.naturalWidth||0,naturalHeight:img?.naturalHeight||0,title:panel?.querySelector('h3')?.textContent||''}
  })
  results.push({name,...detail})
}
await page.screenshot({path:'tools/smoke-shots/generated-quadruped-walks.png',fullPage:true})
console.log(JSON.stringify({results,errors},null,2))
await browser.close()
if(errors.length||results.some(x=>!x.visible||!x.title.includes(x.name)||!x.currentSrc.includes('generated-crawl-20260825')||x.naturalWidth!==512||x.naturalHeight!==512))process.exit(1)
