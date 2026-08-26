import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const root=process.cwd(), dir=path.join(root,'public/assets/animations/enemies/runtime/aerostat')
for(let i=1;i<=12;i++){
 const s=String(i).padStart(2,'0'), src=await fs.readFile(path.join(dir,'move',`frame-${s}.webp`))
 const phase=i/12, pulse=.55+.45*Math.sin(phase*Math.PI*2), spread=14+Math.round(10*pulse)
 const svg=Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round"><path d="M55 285 L12 ${260-spread} M55 285 L8 285 M55 285 L12 ${310+spread}" stroke="#72ddff" stroke-width="5" opacity=".92"/><circle cx="55" cy="285" r="${10+Math.round(8*pulse)}" fill="#ffb24a" opacity=".72"/></g></svg>`)
 await sharp(src).composite([{input:svg}]).webp({lossless:true,quality:92}).toFile(path.join(dir,'attack',`frame-${s}.webp`))
}
