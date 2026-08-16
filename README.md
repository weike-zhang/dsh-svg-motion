# dsh-svg-motion

Animate any SVG into a professional **parts-assembly video** inside DeepSeek Harness.

The plugin registers an `animate_svg` tool on the harness `tools` service. Give it an SVG (markup or a file path) and it renders a transparent 30fps assembly animation in headless Chromium — pieces fly in from off-screen, snap together with industrial overshoot, and a scene rotation opens the reveal — then synthesizes an MP4 with ffmpeg.

![Assembled frame of the sample logo animation](docs/preview.png)

*One frame of the sample logo after assembly (3s, 30fps, transparent background; the MP4 and frame sequence are written to disk by the tool).*

## What it does

| Input | Output |
| --- | --- |
| SVG markup or `.svg` path | `animation.mp4` (H.264) + `poster.png` + `frames/frame_%04d.png` (transparent PNG sequence) |

- First `<path>` = main body (elastic pop-in)
- Remaining `<path>`s = detail parts (staggered back-out fly-in)
- Deterministic per-frame rendering — no timeline clock, same run = same frames
- Zero external runtime beyond Node + a Playwright Chromium + ffmpeg

## Install

The plugin is registered through a `dsh` profile patch layer. In a profile that
already runs the Web or headless app, add the package:

```sh
dsh plugin --profile web add github:weike-zhang/dsh-svg-motion
```

> Once published to npm this becomes `dsh plugin --profile web add @linxin666/dsh-svg-motion`.
> Alternatively, point the profile's bundle patch directly at this repo's
> `cordis.patch.yml` (it registers the `svg-motion` plugin under `id: svg-motion`).

## Use it

In any session, ask:

> Animate this logo as an assembly video: `<svg>…</svg>`

or reference a file:

> Animate `/work/logo.svg` into a 1080p video, 4 seconds

The tool returns the paths of the produced video, poster, and frame sequence.

## Options

| Argument | Type | Default | Meaning |
| --- | --- | --- | --- |
| `svg` | string | — | SVG markup or an absolute path to an `.svg` file (required) |
| `duration` | number | 3.0 | Animation length in seconds (0.5–8) |
| `size` | number | 1080 | Square raster size in pixels (240–1920) |
| `video` | boolean | true | Whether to also synthesize an MP4 |

## Requirements

- Node.js ≥ 22
- A Playwright-managed Chromium (`npx playwright install chromium`)
- `ffmpeg` on PATH (only when `video: true`)

## Development

```sh
npm install
npm run build     # tsc → lib/
npm test          # unit tests
```

End-to-end through the real harness tool pipeline (no LLM key needed — the
driver calls `ctx.tools.execute` directly):

```sh
npm install @deepseek-ai/dsh@0.1.0-rc.6
./node_modules/.bin/dsh --profile headless --patch ./e2e.patch.yml "ignored"
```

The E2E driver mounts the plugin and executes one `animate_svg` call through
`ctx.tools.execute`, printing the produced asset paths.

## License

Apache-2.0
