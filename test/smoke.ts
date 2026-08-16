/**
 * Manual smoke test: render the sample logo SVG through the pipeline and
 * print the produced asset paths. Run with `node --experimental-strip-types`?
 * No — this is a plain JS harness that imports the built TS via tsx.
 */
import { readFile } from 'node:fs/promises'
import { renderSvgAnimation } from '../src/renderer.ts'

const svg = await readFile(new URL('./sample-logo.svg', import.meta.url), 'utf8')
const out = '/tmp/dsh-svg-motion-smoke'
const result = await renderSvgAnimation({ svg, outDir: out, duration: 3, size: 540, video: true })
console.log('OK frames=%d video=%s poster=%s framesDir=%s', result.frames, result.videoPath, result.posterPath, result.framesDir)
