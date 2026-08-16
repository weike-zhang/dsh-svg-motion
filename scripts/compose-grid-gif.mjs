// Compose a grid GIF where each cell shows one state's recorded frames,
// with a localized label under each cell. Usage:
//   node compose-grid-gif.mjs <statesDir> <outGif> <cols> <rows> \
//     "state1,state2,..." "label1,label2,..." [fps]
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const [statesDir, outGif, colsArg, rowsArg, statesArg, labelsArg, fpsArg, scaleArg] = process.argv.slice(2)
const cols = Number(colsArg), rows = Number(rowsArg)
const states = statesArg.split(',')
const labels = labelsArg.split(',')
const fps = Number(fpsArg || 16)
const scale = Number(scaleArg || 1)

const dirs = await readdir(statesDir)
const ordered = states.filter(s => dirs.includes(s))
console.log('states:', ordered.join(', '))

const firstFrames = await readdir(join(statesDir, ordered[0]))
const frameCount = firstFrames.length

const sharp = (await import('sharp')).default
const probeMeta = await sharp(join(statesDir, ordered[0], firstFrames[0])).metadata()
let cellW = probeMeta.width, cellH = probeMeta.height
if (scale !== 1) { cellW = Math.round(cellW * scale); cellH = Math.round(cellH * scale) }
const labelH = Math.round(30 * scale)
const W = cols * cellW
const H = rows * (cellH + labelH)
const tmpDir = join('/tmp', `grid-${Date.now()}`)
mkdirSync(tmpDir, { recursive: true })

for (let f = 0; f < frameCount; f++) {
  const layer = []
  const labelLayer = []
  for (let s = 0; s < ordered.length; s++) {
    const r = Math.floor(s / cols), c = s % cols
    const x = c * cellW, y = r * (cellH + labelH)
    const frames = await readdir(join(statesDir, ordered[s]))
    const frameFile = frames[Math.min(f, frames.length - 1)]
    let buf = await readFile(join(statesDir, ordered[s], frameFile))
    if (scale !== 1) {
      buf = await sharp(buf).resize(cellW, cellH).png().toBuffer()
    }
    layer.push({ input: buf, left: x, top: y })
    const name = labels[s] || ordered[s]
    const fontSize = Math.round(16 * scale)
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${cellW}" height="${labelH}">` +
      `<rect width="${cellW}" height="${labelH}" fill="#F3F1EC"/>` +
      `<text x="${Math.round(10*scale)}" y="${Math.round(21*scale)}" font-size="${fontSize}" fill="#20282B" font-family="PingFang SC, Helvetica, Arial, sans-serif">${name}</text></svg>`,
    )
    labelLayer.push({ input: svg, left: x, top: y + cellH })
  }
  const base = await sharp({ create: { width: W, height: H, channels: 3, background: '#F3F1EC' } })
    .composite(layer)
    .png()
    .toBuffer()
  const withLabels = await sharp(base).composite(labelLayer).png().toBuffer()
  writeFileSync(join(tmpDir, `g${String(f).padStart(3, '0')}.png`), withLabels)
}
console.log('composed', frameCount, 'frames')

await new Promise((resolve, reject) => {
  const child = spawn('ffmpeg', [
    '-y', '-framerate', String(fps), '-i', join(tmpDir, 'g%03d.png'),
    '-vf', `fps=${fps},split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer`,
    '-loop', '0', outGif,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  child.stderr.on('data', d => { err += String(d) })
  child.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(-300)}`)))
})
console.log('GIF ->', outGif)
