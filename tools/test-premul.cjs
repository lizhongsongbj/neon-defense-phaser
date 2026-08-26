const sharp=require('sharp');
(async()=>{const src='public/assets/enemies/new/enemy-06-faraday-suppressor.png'; const a=await sharp(src).ensureAlpha().premultiply().rotate(55,{background:{r:0,g:0,b:0,alpha:0}}).resize(420,420,{fit:'inside'}).unpremultiply().png().toFile('tools/test-premul.png'); console.log(a)})()
