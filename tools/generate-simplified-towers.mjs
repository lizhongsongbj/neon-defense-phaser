import { readFile, copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const origin = 'http://127.0.0.1:5174'
const spec = JSON.parse((await readFile('asset-generation-spec.json', 'utf8')).replace(/^\uFEFF/, ''))
const items = spec.items.filter((item) => item.id.startsWith('simplified-'))
const outputDir = resolve('public/assets/towers/new-concepts/simplified')
await mkdir(outputDir, { recursive: true })

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

async function generate(item) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    console.log(`START ${item.id} (${attempt}/3)`)
    try {
      const response = await fetch(`${origin}/api/generate-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, prompt: item.prompt, size: '1024x1024', outputMode: 'cutout' }),
        signal: AbortSignal.timeout(650_000),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(`${item.id}: ${payload.message || response.status}`)
      const source = resolve('public', payload.imageUrl.replace(/^\//, ''))
      const target = resolve(outputDir, item.targetFile.replace(/^simplified-/, ''))
      await copyFile(source, target)
      console.log('DONE', item.id, '->', target)
      return { id: item.id, target, imageUrl: payload.imageUrl }
    } catch (error) {
      lastError = error
      console.warn(`RETRY ${item.id}:`, error instanceof Error ? error.message : error)
      if (attempt < 3) await wait(attempt * 8_000)
    }
  }
  throw lastError
}

const results = []
for (const item of items) results.push(await generate(item))
console.log(JSON.stringify(results, null, 2))
