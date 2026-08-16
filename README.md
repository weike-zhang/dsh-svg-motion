# dsh-svg-motion

在 DeepSeek Harness 里,把一个 SVG logo 变成一段动效视频。

给工具一个 SVG(直接贴代码,或给文件路径),它会在浏览器里逐帧渲染成透明背景动画,再用 ffmpeg 合成 MP4。不需要设计软件,也不用会视频剪辑。

![循智共创 logo 动效(带眼睛版)](docs/hero.gif)

上面是循智共创的双翼 logo 做成的动效:双翼张开、金色核心点亮,眼睛最后睁开看向前方。产物是透明背景 30fps 序列帧 + MP4,可直接放进网页、演示或剪辑。

## 它能做出什么

一张 SVG,两种动效语言:

| 语言 | 效果 | 适合 |
| --- | --- | --- |
| 组装 (assembly) | 主体先出现,其余零件从四周飞入、落位时带一点回弹 | logo 有可分离的部件 |
| Logo (logo) | 整个 logo 当作一个物体:双翼张开、核心点亮、小细节最后就位 | 紧凑品牌标,拆开会破坏轮廓 |

产出的文件:

- `animation.mp4`(H.264 视频)
- `poster.png`(最后一帧静态图)
- `frames/frame_%04d.png`(透明 PNG 序列,可再合成或转 GIF)

## 动效展示

同一个工具,给不同 logo、不同语言,能做出差异明显的动效。

### 循智共创 · Logo 语言

![循智共创 logo 动效(带眼睛版)](docs/hero.gif)

双翼从中间张开、金色核心点亮,眼睛最后睁开。整个 logo 作为一个整体落位,适合作为品牌亮相镜头。配套交互动效包见 [`examples/logo-motion-system.html`](examples/logo-motion-system.html)。

### 循智共创 · 组装语言

![循智共创 logo 组装动效](docs/xunzhi-assembly.gif)

同一只鸟,换成组装语言:双翼、菱形、眼睛分别从四周飞入,带过冲回弹,逐个拼成完整的 logo。适合强调「零件组合」的场景,比如版本升级、功能合成。

### 境间 · Logo 语言

![境间 logo 动效](docs/jingjian-hero.gif)

境间的深灰「界门」两面平面向外敞开,中央陶土色境点停留点亮,整体克制、有氛围。配套的 12 状态动效包见 [`examples/jingjian-logo-states.html`](examples/jingjian-logo-states.html):待机、悬停、点击、加载、忙碌、成功、失败、聚焦、禁用、通知、抉择、穿越。

三个案例的 logo 均为各自项目自有标识,仅用作本插件的演示素材。

## 快速开始

在 dsh 会话里,对模型说:

> 把这个 logo 做成组装动效视频:`<svg>…</svg>`

或者指向一个文件:

> 把 `/work/logo.svg` 做成 4 秒的 logo 风格动效

工具会返回视频、静态图、序列帧的路径。

## 安装

插件通过 profile patch 注册。在已运行的 Web 或 headless profile 里添加:

```sh
dsh plugin --profile web add github:weike-zhang/dsh-svg-motion
```

> 发布到 npm 后命令会变成 `dsh plugin --profile web add @linxin666/dsh-svg-motion`。也可以直接把本仓库的 `cordis.patch.yml` 指进 profile 的 bundle patch。

## 参数

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `svg` | — | SVG 代码或 `.svg` 文件绝对路径(必填) |
| `intent` | `assembly` | `assembly` 组装 / `logo` 整体落位 |
| `duration` | 3.0 | 时长(秒),0.5–8 |
| `size` | 1080 | 渲染尺寸(像素),240–1920 |
| `video` | true | 是否同时合成 MP4 |

## 环境要求

- Node.js ≥ 22
- Playwright 管理的 Chromium(`npx playwright install chromium`)
- `ffmpeg`(仅合成视频时需要,已在 PATH 上)

## 开发

```sh
npm install
npm run build     # tsc → lib/
npm test          # 单元测试
```

端到端验证(走真实 harness 工具管线,不需要 LLM key,驱动直接调用 `ctx.tools.execute`),在仓库根目录执行:

```sh
npm install
npm install @deepseek-ai/dsh@0.1.0-rc.6
./node_modules/.bin/dsh --profile headless --patch ./e2e.patch.yml "ignored"
```

驱动会用 `intent: logo` 渲染循智共创 logo,打印产物路径;改 `src/e2e-driver.ts` 里的 `arguments.intent` 可以切换成组装风格。

## 许可

Apache-2.0
