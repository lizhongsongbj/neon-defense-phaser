import { ENEMY_RUNTIME_ANIMATIONS } from '../src/data/enemyRuntimeAnimations.ts'
import fs from 'node:fs'; import path from 'node:path';
const missing=[]; let total=0; for(const [id,set] of Object.entries(ENEMY_RUNTIME_ANIMATIONS)){for(const [motion,s] of Object.entries(set)){for(let i=1;i<=s.frames;i++){total++;const p=path.join('public','assets','animations','enemies','runtime',id,motion,`frame-${String(i).padStart(2,'0')}.webp`);if(!fs.existsSync(p))missing.push(p)}}}
console.log(JSON.stringify({total,missing},null,2))
