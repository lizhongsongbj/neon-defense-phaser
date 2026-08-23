/**
 * 把 `public/assets/animations/**\/*.webp` 里的动态 WebP 拆解为逐帧 PNG,
 * 并生成一份 Phaser 精灵图集(sprite sheet + JSON atlas),供后续把塔楼/敌人的
 * 攻击/移动动画从静态 cutout 图升级为逐帧动画时使用。
 *
 * 当前 MVP 阶段战场渲染仍使用静态 base-cutout 贴图(见 README 的已知限制),
 * 这个脚本先跑通"动态 WebP -> 帧图集"的资源管线,作为后续增强的基础设施。
 *
 * 用法: node tools/extract-webp-frames.mjs
 * 依赖: 系统需要安装 ffmpeg(需支持 libwebp 解码动态 WebP,可用 `ffmpeg -version` 确认)。
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const animationsDir = path.join(root, 'public', 'assets', 'animations')
const outDir = path.join(root, 'public', 'assets', 'animations-frames')

function findWebpFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findWebpFiles(full))
    else if (entry.name.endsWith('.webp')) results.push(full)
  }
  return results
}

function extractFrames(webpPath, frameOutDir) {
  fs.mkdirSync(frameOutDir, { recursive: true })
  const pattern = path.join(frameOutDir, 'frame-%03d.png')
  execFileSync('ffmpeg', ['-y', '-i', webpPath, pattern], { stdio: 'inherit' })
  return fs
    .readdirSync(frameOutDir)
    .filter((f) => f.endsWith('.png'))
    .sort()
}

function buildAtlasJson(frames, frameOutDir, name) {
  // 假设所有帧尺寸一致,读取第一帧尺寸需要额外依赖(sharp/image-size),
  // 这里只产出帧文件列表 + 建议的 Phaser AnimationConfig,真正拼图交给
  // 后续引入 texturepacker/sharp 时再完善。
  const config = {
    key: name,
    frames: frames.map((f) => path.join('assets/animations-frames', name, f).replace(/\\/g, '/')),
    frameRate: 12,
    repeat: -1,
  }
  fs.writeFileSync(path.join(frameOutDir, 'animation.json'), JSON.stringify(config, null, 2))
}

function main() {
  if (!fs.existsSync(animationsDir)) {
    console.error('animations 目录不存在:', animationsDir)
    process.exit(1)
  }
  const webpFiles = findWebpFiles(animationsDir)
  console.log(`找到 ${webpFiles.length} 个动态 WebP 动画`)

  for (const webpPath of webpFiles) {
    const name = path.basename(webpPath, '.webp')
    const frameOutDir = path.join(outDir, name)
    console.log('拆帧:', name)
    try {
      const frames = extractFrames(webpPath, frameOutDir)
      buildAtlasJson(frames, frameOutDir, name)
      console.log(`  -> ${frames.length} 帧`)
    } catch (error) {
      console.error(`  拆帧失败(${name}):`, error.message)
    }
  }
}

main()
