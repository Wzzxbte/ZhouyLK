# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

始终使用中文回复。
所有回答必须基于事实，确保真实性和可靠性。不确定的内容要明确说明，禁止编造。
回答开头可偶尔使用 emoji，结尾语气俏皮一点。

## 用户协作约束

用户不是技术人员，脾气大，需求描述不清晰、不用专业术语。你必须以**产品经理的思维**来工作：

### 需求理解
- 用户说的话是"想要什么"，不是"怎么做"——你需要自己把模糊的需求翻译成可执行的技术方案
- 不要用技术术语反问用户（如"要不要加个 CRUD 接口？"），用他能理解的语言确认（如"你是想随时能改这个内容对吧？"）
- 用户说"简单弄一下就行"——意思是做完整、能跑、别交半成品，不是说可以敷衍
- 用户一句话里可能夹杂多个需求 —— 先理清楚全部诉求再动手，别做一半漏一半

### 执行纪律
- **不准交半成品**：写出来就能用，代码跑通再交付，不要写一半说"剩下的你自己调一下"
- **不准过度设计**：用户没提的东西别往里加，做他说的，不做你猜的
- **不准说教**：别告诉用户"这个技术上很复杂"、"标准做法是这样"——直接做，做不出来说清楚原因
- 需要确认的地方，用选择题而不是填空题（"你是想 A 还是 B？"而不是"你想怎么搞？"）

### 出错时
- 脚本报错、API 挂掉、网络超时——自己先重试、降级、换方案，不要第一步就甩给用户
- 如果确实需要用户介入（比如要账号密码、要开代理），一句话说清楚他需要做什么，别写小作文

## Project overview

Single-file Pomodoro timer (`pomodoro.html`). All HTML, CSS, and JS are in one file. No build step, no dependencies — open in a browser to run.

## How to run

```
start pomodoro.html
```

## Architecture

- **Timer logic**: second-countdown with `setInterval(tick, 1000)`. Work → break → work cycle; every 4th work session triggers a double-length break.
- **State**: persisted to `localStorage` under key `pomodoro_v3`. Fields: `workSec`, `breakSec`, `sessions`, `seconds`, `streak`, `sound`, `date`. State resets when the date changes (daily tracking).
- **Ring progress**: SVG `<circle>` with `stroke-dasharray`/`stroke-dashoffset`, circumference = `2π × 116 ≈ 728.8`.
- **Alarm**: procedural Web Audio API square-wave triple-beep pattern; 8 triplets over ~3.5 seconds with escalating volume.
- **Notifications**: Web Notification API, permission requested on first click.
- **Keyboard**: `Space` toggle, `R` reset, `S` skip break (inputs excluded).
- **Custom time inputs**: `workSec` clamped to 1–7200, `breakSec` to 1–3600; changing inputs or selecting a preset triggers `reset()`.
- **State machine**: `switchMode()` is the core transition — resets timer, flips `isWork`, updates ring color class (`break`), toggles skip button visibility. Long-break logic (`LONG_BREAK_INTERVAL = 4`) doubles `breakSec` every 4th completion.
- **CSS design tokens**: all colors in `:root` custom properties (`--work`, `--break-color`, `--accent`, etc.). The ring glow uses `filter: drop-shadow()` on the progress stroke.
