import fs from 'node:fs'
const p='src/data/animationCatalog.ts'; let s=fs.readFileSync(p,'utf8')
s=s.replace('  description:string; timeline:string; referenceImage:string; previewAsset?:string', '  description:string; timeline:string; referenceImage:string; previewAsset?:string; previewFrames?:readonly string[]')
const marker='const deathAssets:Record<string,string>='; const idx=s.indexOf(marker); if(idx<0) throw new Error('marker missing')
const add="const runtimePreviewFrames:Record<string,readonly string[]>={aerostat:Array.from({length:12},(_,i)=>`/assets/animations/enemies/runtime/aerostat/ATTACK/frame-${String(i+1).padStart(2,'0')}.webp?v=clean-action-20260826`),devourer:Array.from({length:12},(_,i)=>`/assets/animations/enemies/runtime/devourer/ATTACK/frame-${String(i+1).padStart(2,'0')}.webp?v=clean-action-20260826`),faraday:Array.from({length:8},(_,i)=>`/assets/animations/enemies/runtime/faraday/ATTACK/frame-${String(i+1).padStart(2,'0')}.webp?v=clean-action-20260826`),hijacker:Array.from({length:12},(_,i)=>`/assets/animations/enemies/runtime/hijacker/ATTACK/frame-${String(i+1).padStart(2,'0')}.webp?v=clean-action-20260826`)}\n"
s=s.slice(0,idx)+add+s.slice(idx)
s=s.replace('previewAsset:actionAssets[seed.id],attackEffectKind', "previewAsset:actionAssets[seed.id],previewFrames:runtimePreviewFrames[seed.id]?.map((url)=>url.replace('/ATTACK/','/attack/')),attackEffectKind")
s=s.replace('previewAsset:deathAssets[seed.id],status', "previewAsset:deathAssets[seed.id],previewFrames:runtimePreviewFrames[seed.id]?.map((url)=>url.replace('/ATTACK/','/death/')),status")
fs.writeFileSync(p,s,'utf8')

const q='src/ui/AnimationPanel.ts'; let a=fs.readFileSync(q,'utf8')
a=a.replace("  private query = ''", "  private query = ''\n  private readonly previewTimers = new Set<number>()")
a=a.replace("    this.grid.replaceChildren(...entries.map((entry) => this.createCard(entry)))", "    this.previewTimers.forEach((timer) => window.clearInterval(timer))\n    this.previewTimers.clear()\n    this.grid.replaceChildren(...entries.map((entry) => this.createCard(entry)))")
a=a.replace("    img.addEventListener('error', () => {\n      if (img.src.endsWith(entry.referenceImage)) return\n      img.src = entry.referenceImage\n    })", "    img.addEventListener('error', () => {\n      if (img.src.endsWith(entry.referenceImage)) return\n      img.src = entry.referenceImage\n    })\n    this.animatePreview(img, entry)",1)
a=a.replace("    img.addEventListener('error', () => { img.src = entry.referenceImage })", "    img.addEventListener('error', () => { img.src = entry.referenceImage })\n    this.animatePreview(img, entry)",1)
const insert=`
  private animatePreview(img: HTMLImageElement, entry: AnimationCatalogEntry) {
    const frames = entry.previewFrames
    if (!frames?.length) return
    let frame = 0
    img.src = frames[0] ?? img.src
    const timer = window.setInterval(() => {
      frame = (frame + 1) % frames.length
      img.src = frames[frame] ?? img.src
    }, 90)
    this.previewTimers.add(timer)
  }
`
const pos=a.indexOf('  private headPulseMarkup'); if(pos<0) throw new Error('method insertion point missing')
a=a.slice(0,pos)+insert+a.slice(pos)
fs.writeFileSync(q,a,'utf8')
