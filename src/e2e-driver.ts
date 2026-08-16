/**
 * E2E verification plugin: on startup, drive one `animate_svg` call through
 * the real harness tool pipeline (no LLM) and print the produced asset paths.
 * Mounted together with dsh-svg-motion on a headless profile.
 *
 * @module dsh-svg-motion/e2e-driver
 */

import type { Context } from '@deepseek-ai/cordis'
import { readFile } from 'node:fs/promises'
import { CallId } from '@deepseek-ai/dsh-llm'

export const name = 'svg-motion-e2e'
export const inject = ['tools'] as const

const SAMPLE = new URL('../test/sample-logo.svg', import.meta.url)

export function apply(ctx: Context): void {
  void (async () => {
    let def = ctx.tools.get('animate_svg')
    console.log('=== animate_svg DEFINITION ===', def === undefined ? 'NOT FOUND' : 'FOUND')
    if (def === undefined) {
      // Plugin startup is concurrent; poll for the tool to appear.
      for (let i = 0; i < 20 && def === undefined; i++) {
        await new Promise((r) => setTimeout(r, 300))
        def = ctx.tools.get('animate_svg')
      }
      console.log('=== animate_svg AFTER POLL ===', def === undefined ? 'STILL NOT FOUND' : 'FOUND')
    }
    const svg = await readFile(SAMPLE, 'utf8')
    const result = await ctx.tools.execute({
      callId: CallId('e2e-1'),
      name: 'animate_svg',
      arguments: { svg, duration: 2, size: 360, video: true },
      signal: new AbortController().signal,
    })
    const text = result.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
    console.log('=== ANIMATE_SVG RESULT ===')
    console.log(text)
    console.log('=== END ===')
    process.exit(0)
  })().catch((error) => {
    console.error('E2E FAILED:', error)
    process.exit(1)
  })
}
