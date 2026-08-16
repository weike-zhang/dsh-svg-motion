import { readFile } from 'node:fs/promises'
import { renderSvgAnimation } from '../src/renderer.ts'

const svg = await readFile('/tmp/xunzhi-logo-clean.svg', 'utf8')
const result = await renderSvgAnimation({
  svg,
  outDir: '/tmp/xunzhi-render',
  duration: 3,
  size: 720,
  video: true,
  intent: 'logo',
})
console.log('OK frames=%d video=%s poster=%s', result.frames, result.videoPath, result.posterPath)
