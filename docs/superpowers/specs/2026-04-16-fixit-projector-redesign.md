# Fix It — Projector Redesign Spec

## Goal

Redesign the Fix It projector PLAYING + REVEALED views to match the OOO single-column layout pattern, using Fix It's yellow (#ffc843) identity color. Hard mode + Easy mode both use this layout. No sidebar. No system log.

---

## Identity

| Token | Value |
|-------|-------|
| Primary accent | `#ffc843` (yellow) |
| Urgent color | `#ff4444` (red) |
| Correct color | `#00e87a` (green) |
| Font — title/tiles | Syne 700/800 |
| Font — labels/mono | JetBrains Mono 700 |

---

## Layout — 3-Row Grid

```
[62px] Header  ─ FIX IT title + question number + level badge + circular timer
[3px]  Progress bar
[1fr]  Body    ─ centered single column, scrollable
```

CSS: `display: grid; grid-template-rows: 62px 3px 1fr`

---

## Header

- **FIX IT** — Syne 800, yellow `#ffc843`, letter-spacing 0.1em
- Divider `1px #1c2a40`
- `QUESTION_03` — JetBrains Mono 12px, muted `#4a637d`, letter-spacing 0.06em. Counter increments each new question.
- Level badge — `MIXED LEVEL` / `EASY` / `HARD` — 11px, yellow tint bg `rgba(255,200,67,0.1)`, yellow border `rgba(255,200,67,0.2)`, rounded pill
- **Circular timer** — 48×48px SVG, pushed to right via `margin-left: auto`

### Circular Timer

- SVG viewBox `0 0 48 48`, rotated −90°
- Track: `r=20`, stroke `#1c2a40`, stroke-width 3.5, no fill
- Ring: `r=20`, stroke-width 3.5, stroke-linecap round, stroke-dasharray `125.66` (2π×20)
- Normal: gradient stroke `#ffc843 → rgba(255,200,67,0.3)` via `<linearGradient>`
- `dashOffset = 125.66 * (1 − timeLeft / timerDuration)`
- Mid (≤20s, >10s): number color shifts to `#ffc843` brighter — no ring change
- **Urgent (≤10s):** ring stroke solid `#ff4444`, number `#ff4444`, both pulse `opacity 1→0.4` at 0.6s alternate
- Number: absolute center, JetBrains Mono 14px 700

---

## Progress Bar

- 3px height, `background: #131b2b`
- Fill: `linear-gradient(90deg, #ffc843, rgba(255,200,67,0.2))`, radiused right edge
- Width = `(timeLeft / timerDuration) * 100%`
- Urgent (≤10s): fill gradient switches to `#ff4444 → rgba(255,68,68,0.2)`

---

## Body — Centered Column

`padding: 28px 56px 32px`, flex column, `align-items: center`, `gap: 20px`  
Radial gradient background: `rgba(255,200,67,0.04)` at top center, fades to transparent

### Prompt Label

- PLAYING: `"FIND AND FIX THE ERROR"` — 13px JetBrains Mono 700, letter-spacing 0.14em, `color: #dce8f5`, opacity 0.6
- REVEALED: `"ANSWER REVEALED"` — same size, `color: #00e87a`, opacity 1

### Error Type Label (above sentence card)

- `"Error type: SUBJECT-VERB AGREEMENT"` — 11px JetBrains Mono, color `#4a637d`, error name in yellow `#ffc843` 700

### Sentence Card

- Background `#0d1424`, border `1.5px solid rgba(255,200,67,0.2)`, border-radius 12px, padding `22px 32px`
- max-width 760px, centered, font Syne 24px 700, `color: #dce8f5`, line-height 1.5
- **Corner reticles** (4 CSS pseudo + real elements): `8×8px`, yellow-tinted `rgba(255,200,67,0.3)`, 1.5px border — TL and BR corners
- Wrong word: `color: #ff4444`, `text-decoration: underline`, `text-decoration-color: rgba(255,68,68,0.5)`, font-weight 800

---

## Easy Mode — Option Tiles

2×2 grid, max-width 760px, gap 12px.

Each tile:
- Height 72px, border-radius 10px, background `#0d1424`, border `1.5px solid rgba(255,200,67,0.2)`
- Flex row, gap 14px, padding `0 22px`
- Corner reticles: 6×6px, `rgba(255,200,67,0.25)`, 1px
- **Letter badge** (A/B/C/D): JetBrains Mono 13px 700, yellow `#ffc843`, bg `rgba(255,200,67,0.1)`, border `rgba(255,200,67,0.25)`, border-radius 4px, padding `2px 8px`
- **Word text**: Syne 20px 800, `#dce8f5`, letter-spacing 0.04em

Post-reveal states:
- **Correct tile**: bg `#061610`, border `#00e87a`, letter badge → green, word text → green
- **Wrong tiles**: `opacity: 0.18`, border → `#1c2a40`

---

## Hard Mode — Hint Card

Shown when hint deployed (replaces option tiles area, same width):
- Background `#0d1424`, border `1.5px solid rgba(255,200,67,0.15)`, border-radius 10px, padding `16px 24px`
- Label `"💡 HINT"` — JetBrains Mono 11px, yellow muted
- Hint text — Syne 18px 700, `#dce8f5`

---

## Reveal Block (post-reveal, both modes)

Shown below tiles after reveal. Background `#0d1424`, border `1.5px solid rgba(255,200,67,0.15)`, border-radius 12px, padding `20px 28px`, max-width 760px.

Two rows separated by `1px #1c2a40` divider:
1. ❌ row — original sentence with wrong word struck through in red
2. ✅ row — corrected sentence with correct word highlighted in green

Row layout: icon (20px) + sentence text (Syne 20px 700, `#dce8f5`)

---

## Team Chips

Flex row, centered, gap 8px, flex-wrap.

States:
- **Waiting**: `color: #4a637d`, border `#243347`, no bg
- **Locked-in**: border `rgba(255,200,67,0.4)`, color `#ffc843`, bg `rgba(255,200,67,0.08)` — 🔒 prefix
- **Correct** (post-reveal): border `rgba(0,232,122,0.4)`, color `#00e87a`, bg `rgba(0,232,122,0.08)` — ✓ + score delta
- **Wrong** (post-reveal): border `rgba(255,68,68,0.3)`, color `#ff4444`, bg `rgba(255,68,68,0.06)`

Each chip: JetBrains Mono 12px 700, letter-spacing 0.06em, border-radius 6px, padding `6px 14px`

Team color for locked-in chips uses team palette index: `['#00e87a','#00c8f0','#ffc843','#ff4d8f','#b06eff','#ff7d3b','#e2e8f0'][idx % 7]`

---

## Action Buttons

Flex row, gap 12px, `margin-top: 4px`.

### PLAYING phase
- **✦ REVEAL ANSWER** — solid yellow fill `#ffc843`, black text, border-radius 8px, padding `13px 40px`, JetBrains Mono 14px 700, letter-spacing 0.1em, box-shadow `0 4px 24px rgba(255,200,67,0.25)`
- **💡 DEPLOY HINT** (Easy: always visible; Hard: always visible) — transparent bg, dashed border `rgba(255,200,67,0.35)`, color `#ffc843`, border-radius 8px, padding `12px 20px`, JetBrains Mono 13px

### REVEALED phase
- **→ NEXT QUESTION** — transparent, border `rgba(255,200,67,0.3)`, color `#ffc843`, padding `13px 36px`, JetBrains Mono 14px 700
- **⟳ NEW GAME** — transparent, border `#1c2a40`, color `#4a637d`, smaller (12px)

---

## Phase Machine

Fix It already uses: `SETUP → GENERATING → READY → PLAYING → REVEALED → FINISHED`

Only PLAYING and REVEALED views change. All game logic, state, API calls, scoring, and timers are untouched.

Derivations to add (same pattern as OOO):
```tsx
const TIMER_CIRC = 125.66;
const dashOffset = timerDur > 0 ? TIMER_CIRC * (1 - timeLeft / timerDur) : 0;
const timerMid   = timeLeft <= 20 && timeLeft > 10 && timerDur > 0;
const timerUrgent = timeLeft <= 10 && timerDur > 0;
```

---

## Files to Change

| File | What changes |
|------|-------------|
| `app/fix-it/fix.module.css` | Append new CSS classes (do not remove existing ones) |
| `app/fix-it/page.tsx` | Replace PLAYING + REVEALED JSX with new single-column layout; add timer derivations |

---

## What Does NOT Change

- All game logic (`generateQuestion`, `handleReveal`, `handleHint`, timer countdown, scoring)
- All AI/API routes
- All existing CSS classes used outside PLAYING/REVEALED phases (SETUP, GENERATING, READY, FINISHED)
- Student phone UI — untouched
- Universal scoreboard at bottom of projector views
