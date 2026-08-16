/**
 * Headless SVG-assembly renderer.
 *
 * Renders an arbitrary SVG into a professional "parts assemble" animation:
 * a transparent PNG frame sequence (30fps) plus an optional MP4 synthesized
 * with ffmpeg. The animation is driven deterministically by a `__renderFrame`
 * hook in the bundled `render.html`, so every run produces the same frames.
 *
 * Runtime needs: a Playwright-managed Chromium (for rasterization) and
 * ffmpeg on PATH (only when `video: true`).
 *
 * @module dsh-svg-motion/renderer
 */

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

/** The bundled render page (src of this file + ../assets/render.html). */
function renderPagePath(): string {
  return fileURLToPath(new URL('../assets/render.html', import.meta.url))
}

/** Canonical output payload of a successful render. */
export interface RenderResult {
  /** Absolute directory holding `frame_%04d.png`. */
  framesDir: string
  /** Number of written frames. */
  frames: number
  /** Absolute path of the synthesized MP4, when `video` was requested. */
  videoPath: string | null
  /** Absolute path of a single poster PNG (the assembled final frame). */
  posterPath: string
}

export interface RenderOptions {
  /** SVG markup (the `<svg>...</svg>` document) to animate. */
  svg: string
  /** Output directory; a fresh `frames` subdir is created inside. */
  outDir: string
  /** Animation length in seconds (default 3.0). */
  duration?: number
  /** Raster size (square, default 1080). */
  size?: number
  /** Whether to synthesize an MP4 with ffmpeg (default true). */
  video?: boolean
}

/**
 * Render an SVG assembly animation.
 * @param options - render inputs and output choices.
 * @returns paths to the produced assets.
 */
export async function renderSvgAnimation(options: RenderOptions): Promise<RenderResult> {
  const svg = options.svg.trim()
  if (!svg.includes('<svg') || !svg.includes('</svg>')) {
    throw new Error('input is not an SVG document')
  }
  const duration = options.duration ?? 3.0
  const size = options.size ?? 1080
  const wantVideo = options.video ?? true
  const outDir = options.outDir
  await mkdir(outDir, { recursive: true })
  const framesDir = join(outDir, 'frames')
  await rm(framesDir, { recursive: true, force: true })
  await mkdir(framesDir, { recursive: true })

  const html = await readFile(renderPagePath(), 'utf8')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load' })
    const init = await page.evaluate((markup) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      w.__initSvg(markup, { duration: 3.0 })
      return { frames: w.__frames ?? Math.ceil(3.0 * 30) }
    }, svg)
    void init

    // Re-init with the real duration so the frame count matches.
    const meta = await page.evaluate(([markup, dur]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      const result = w.__initSvg(markup, { duration: dur })
      return { frames: result.frames, duration: result.duration }
    }, [svg, duration])

    const fps = 30
    // Render frame 0..frames-1 (the final frame is the assembled state).
    let lastDataUrl = ''
    for (let i = 0; i < meta.frames; i++) {
      const progress = i / (meta.frames - 1)
      await page.evaluate((p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__renderFrame(p)
      }, progress)
      const dataUrl = await page.evaluate(() => {
        // Snapshot the stage SVG to a canvas and return a PNG data URL.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any
        if (w.__snapshotFrame) return w.__snapshotFrame()
        const svg = document.querySelector('svg')!
        const canvas = document.createElement('canvas')
        canvas.width = document.documentElement.clientWidth
        canvas.height = document.documentElement.clientHeight
        const ctx = canvas.getContext('2d')!
        const data = new XMLSerializer().serializeToString(svg)
        const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }))
        return new Promise<string>((resolve) => {
          const img = new Image()
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            URL.revokeObjectURL(url)
            resolve(canvas.toDataURL('image/png'))
          }
          img.src = url
        })
      })
      lastDataUrl = dataUrl
      const b64 = dataUrl.split(',')[1]
      await writeFile(join(framesDir, `frame_${String(i).padStart(4, '0')}.png`), Buffer.from(b64, 'base64'))
    }

    // Poster = final assembled frame.
    const posterPath = join(outDir, 'poster.png')
    const posterB64 = lastDataUrl.split(',')[1]
    await writeFile(posterPath, Buffer.from(posterB64, 'base64'))

    let videoPath: string | null = null
    if (wantVideo) {
      videoPath = await synthesizeVideo(framesDir, outDir, fps)
    }

    return { framesDir, frames: meta.frames, videoPath, posterPath }
  } finally {
    await browser.close()
  }
}

/**
 * Combine the PNG sequence into an MP4 with ffmpeg.
 * @param framesDir - directory of `frame_%04d.png`.
 * @param outDir - directory for the mp4.
 * @param fps - frames per second.
 * @returns the absolute mp4 path.
 */
async function synthesizeVideo(framesDir: string, outDir: string, fps: number): Promise<string> {
  const videoPath = join(outDir, 'animation.mp4')
  await new Promise<void>((resolve, reject) => {
    const args = [
      '-y',
      '-framerate', String(fps),
      '-i', join(framesDir, 'frame_%04d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      videoPath,
    ]
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', (error) => { reject(new Error(`ffmpeg spawn failed: ${error.message}`)) })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`))
    })
  })
  if (!existsSync(videoPath)) throw new Error('ffmpeg produced no output')
  return videoPath
}

/** Whether ffmpeg is available on PATH. */
export function ffmpegAvailable(): boolean {
  return existsSync('/opt/homebrew/bin/ffmpeg') || existsSync('/usr/bin/ffmpeg')
}
