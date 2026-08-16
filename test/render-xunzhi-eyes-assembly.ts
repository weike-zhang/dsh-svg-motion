import { readFile } from 'node:fs/promises'
import { renderSvgAnimation } from '../src/renderer.ts'

const svg = await readFile('/tmp/dsh-hero-work/dsh-svg-motion/test/xunzhi-logo-eyes.svg', 'utf8')
const result = await renderSvgAnimation({
  svg,
  outDir: '/tmp/xunzhi-eyes-assembly',
  duration: 3,
  size: 720,
  video: true,
  intent: 'assembly',
})
console.log('OK frames=%d video=%s', result.frames, result.videoPath)
