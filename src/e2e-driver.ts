/**
 * E2E verification plugin: drive one `animate_svg` call through the real
 * harness tool pipeline (no LLM) using the 境间 logo in `logo` intent.
 */
import type { Context } from '@deepseek-ai/cordis'
import { readFile } from 'node:fs/promises'
import { CallId } from '@deepseek-ai/dsh-llm'

export const name = 'svg-motion-e2e'
export const inject = ['tools'] as const

const SAMPLE = new URL('../test/jingjian-mark.svg', import.meta.url)

export function apply(ctx: Context): void {
  void (async () => {
    const svg = await readFile(SAMPLE, 'utf8')
    const result = await ctx.tools.execute({
      callId: CallId('e2e-logo'),
      name: 'animate_svg',
      arguments: { svg, intent: 'logo', duration: 2, size: 360, video: true },
      signal: new AbortController().signal,
    })
    const text = result.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
    console.log('=== ANIMATE_SVG (logo intent) RESULT ===')
    console.log(text)
    console.log('=== END ===')
    process.exit(0)
  })().catch((error) => {
    console.error('E2E FAILED:', error)
    process.exit(1)
  })
}
