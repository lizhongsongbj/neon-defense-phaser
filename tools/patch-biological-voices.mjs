import fs from 'node:fs'
const file='src/audio/voiceManifest.ts'
let s=fs.readFileSync(file,'utf8')
s=s.replace(`  | 'hijacker'\n  | 'enforcer'`, `  | 'hijacker'\n  | 'neurohound'\n  | 'matriarch'\n  | 'bonebreaker'\n  | 'enforcer'`)
s=s.replace(`  hijacker: { spawn: [] },\n  enforcer: {`, `  hijacker: { spawn: [] },\n  neurohound: { spawn: [] },\n  matriarch: { spawn: [] },\n  bonebreaker: { spawn: [] },\n  enforcer: {`)
s=s.replace(`['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker']`, `['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker', 'neurohound', 'matriarch', 'bonebreaker']`)
fs.writeFileSync(file,s,'utf8')
