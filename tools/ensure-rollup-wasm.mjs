import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
if (process.platform !== 'win32') process.exit(0)

async function replaceWithFallback(targetPath, marker, fallbackSource, probe, blockedPattern, message) {
  try {
    await probe()
    return
  } catch (error) {
    const detail = error instanceof Error
      ? `${error.message}\n${error.cause instanceof Error ? error.cause.message : ''}`
      : String(error)
    if (!blockedPattern.test(detail)) throw error
  }

  const current = await readFile(targetPath, 'utf8')
  if (!current.startsWith(marker)) {
    await writeFile(`${targetPath}.native-backup`, current, 'utf8').catch(() => undefined)
    await writeFile(targetPath, `${marker}\n${fallbackSource}\n`, 'utf8')
    console.log(message)
  }
}

await replaceWithFallback(
  resolve('node_modules/rollup/dist/native.js'),
  '// CODEX_ROLLUP_WASM_FALLBACK',
  "module.exports = require('@rollup/wasm-node/dist/native.js');",
  async () => require('rollup/parseAst'),
  /ERR_DLOPEN_FAILED|Application Control policy|Cannot find module @rollup\/rollup-win32/,
  'Windows 阻止了 Rollup 本地模块，已自动切换到 WebAssembly 版本。',
)

await replaceWithFallback(
  resolve('node_modules/esbuild/lib/main.js'),
  '// CODEX_ESBUILD_WASM_FALLBACK',
  "module.exports = require('esbuild-wasm/lib/main.js');",
  async () => {
    const esbuild = require('esbuild')
    await esbuild.transform('const ready = true', { loader: 'js' })
  },
  /spawn UNKNOWN|Application Control policy|EPERM|EACCES/,
  'Windows 阻止了 esbuild 本地程序，已自动切换到 WebAssembly 版本。',
)
