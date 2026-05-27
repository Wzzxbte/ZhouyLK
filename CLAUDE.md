# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

始终使用中文回复。
所有回答必须基于事实，确保真实性和可靠性。不确定的内容要明确说明，禁止编造。
回答开头可偶尔使用 emoji，结尾语气俏皮一点。

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
