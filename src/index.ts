/**
 * dsh-svg-motion — animate any SVG into a professional assembly video.
 *
 * Registers an `animate_svg` tool on the harness `tools` service: the model
 * supplies SVG markup (or a path to one), the tool rasterizes a transparent
 * 30fps assembly animation in headless Chromium and synthesizes an MP4 with
 * ffmpeg, then returns the produced asset paths.
 *
 * @module dsh-svg-motion
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { renderSvgAnimation } from './renderer.ts'

/** Stable cordis plugin name. */
export const name = 'svg-motion'

/** Wait for the harness tool registry. */
export const inject = ['tools'] as const

/**
 * Animate an SVG into an assembly video.
 * @param ctx - harness context with the `tools` service.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: 'animate_svg',
      description:
        'Turn an SVG logo, diagram, or shape into a short professional "parts assembly" video: pieces fly in and snap together with an industrial motion look. Renders a transparent PNG frame sequence and an MP4. Returns the paths of the produced video, poster image, and frames. Works with any SVG; the first <path> is treated as the main body and the rest as detail parts.',
      parameters: {
        svg: {
          type: 'string',
          required: true,
          description: 'Full SVG markup (an <svg>...</svg> document) to animate. You may also pass an absolute file path to an existing .svg file on this machine.',
        },
        intent: {
          type: 'string',
          description: 'Animation intent: "assembly" (parts fly in and snap together) or "logo" (the whole mark settles, wings open outward). Default assembly.',
        },
        duration: {
          type: 'number',
          description: 'Animation length in seconds. Default 3.0, max 8.0.',
        },
        size: {
          type: 'number',
          description: 'Raster size in pixels (square). Default 1080.',
        },
        video: {
          type: 'boolean',
          description: 'Whether to also synthesize an MP4 with ffmpeg. Default true.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      isConcurrencySafe: () => true,
      async execute(args) {
        const svg = await resolveSvgInput(args.svg)
        const outDir = join(homedir(), '.dsh', 'svg-motion', `run-${Date.now()}`)
        const result = await renderSvgAnimation({
          svg,
          outDir,
          intent: args.intent === 'logo' ? 'logo' : 'assembly',
          duration: clampDuration(args.duration),
          size: clampSize(args.size),
          video: args.video ?? true,
        })
        return [
          `SVG assembly animation rendered (${result.frames} frames).`,
          `Video: ${result.videoPath ?? '(not synthesized)'}`,
          `Poster: ${result.posterPath}`,
          `Frame sequence: ${result.framesDir}`,
        ].join('\n')
      },
    }),
  )
}

/** Read the SVG from an inline document or an absolute filesystem path. */
async function resolveSvgInput(input: string): Promise<string> {
  const trimmed = input.trim()
  if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) return trimmed
  // Looks like a path — try reading it as a file.
  try {
    return await readFile(trimmed, 'utf8')
  } catch {
    throw new Error('svg must be inline SVG markup or an absolute path to an .svg file')
  }
}

function clampDuration(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  return Math.min(8, Math.max(0.5, value))
}

function clampSize(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  return Math.min(1920, Math.max(240, value))
}
