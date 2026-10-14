# Jeopardy Redesign — Design Spec
**Date:** 2026-04-18  
**Status:** Approved  

---

## Overview

Redesign the Jeopardy projector view to feel dramatic and fun while staying fast for the teacher to operate. All game logic, multiplayer sync, and board generation are preserved — this is a pure UI/UX redesign.

**Identity:** Cyan (`#00c8f0`) — Reading skill category per design system.  
**Fonts:** Syne (tile numbers, question text) + JetBrains Mono (labels, badges, header).  
**Style direction:** A's deep gradient tile drama + C's glow/scale hover interaction + clean functional modal.

---

## 1. Board

### Category Headers
- Background: `linear-gradient(170deg, #0a1628, #071020)`
- Border: `1px solid rgba(0,200,240,0.3)` + `border-bottom: 2px solid rgba(0,200,240,0.5)`
- Border radius: `6px 6px 0 0`
- Font: JetBrains Mono, 700, uppercase, `letter-spacing: 0.08em`
- Color: `#00c8f0` with `text-shadow: 0 0 10px rgba(0,200,240,0.5)`

### Tiles — Resting State
- Background: `linear-gradient(160deg, #0c1a30, #081422)`
- Border: `1px solid rgba(0,200,240,0.2)`, `border-radius: 8px`
- Font: Syne, 900 weight, `font-size: 22px` (scales up on real projector)
- Color: `#00d4f5` with `text-shadow: 0 0 12px rgba(0,200,240,0.5)`
- Inner shimmer: `::before` pseudo with subtle diagonal gradient overlay
- Box-shadow: `inset 0 0 16px rgba(0,200,240,0.05)`

### Tiles — Hover State
- Background: `linear-gradient(160deg, rgba(0,200,240,0.18), rgba(0,180,220,0.08))`
- Border: `1px solid #00c8f0` (fully lit)
- Box-shadow: `inset 0 0 20px rgba(0,200,240,0.12), 0 0 20px rgba(0,200,240,0.3), 0 0 40px rgba(0,200,240,0.12)`
- Transform: `scale(1.05)`
- Color: `#fff`, `text-shadow: 0 0 20px rgba(0,200,240,1), 0 0 8px rgba(255,255,255,0.6)`
- Transition: `all 0.18s ease`

### Tiles — Click Animation
- On click: `transform: scale(0.96)` applied immediately via JS class, `setTimeout(openModal, 120)` — gives tactile "press" feedback before overlay appears.
- CSS: `transition: transform 0.08s ease` on `.tile.pressing` class, removed once modal opens.

### Tiles — Answered State
- `opacity: 0.07`, `background: transparent`, `box-shadow: none`, `text-shadow: none`
- `border-color: rgba(255,255,255,0.04)`, `pointer-events: none`
- Slot visually disappears — empty space on board.

### Board Grid
- `display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px`
- Full height between header and scoreboard

---

## 2. Question Modal

### Overlay
- `position: fixed; inset: 0`
- Background: `rgba(7,9,15,0.92)`, `backdrop-filter: blur(10px)`
- Fade-in animation: `opacity 0 → 1` over `0.25s`
- Scoreboard hidden while modal is open (z-index stacking)

### Content Panel
- Max-width: `900px`, centered
- Background: `#0e1420`, border: `1px solid #1c2a40`, `border-radius: 16px`
- Padding: `32px 40px`

### Category + Points Badge
- Pill shape: `background: rgba(0,200,240,0.1)`, `border: 1px solid rgba(0,200,240,0.25)`, `border-radius: 20px`
- Font: JetBrains Mono, 700, cyan, uppercase
- Points value: muted color within same badge

### Question Text
- Font: Syne, 800, white
- Size: `clamp(1.8rem, 4vw, 3.5rem)` — readable from back of classroom
- Text-align: center, `line-height: 1.25`

### Timer
- JetBrains Mono, 700, `font-size: 28px`, cyan
- Horizontal bar below: `height: 4px`, fills left-to-right, cyan → pink when `timeLeft < 10`
- Timer starts when modal opens, stops on close

### Buzz Panel
- Shown only when ≥1 buzz exists; hidden otherwise
- Background: `#131b2b`, border: `1px solid #1c2a40`, `border-radius: 10px`
- Header row: "Buzz order" label in muted mono
- Each buzz row: rank circle + team name (team color) + student name + award button (first only)
- **Award button:** background = that team's CSS color var (e.g. `var(--t2)` = cyan for Team 2), black text, JetBrains Mono, "+ [pts] pts" label. One click: awards points, closes modal, marks tile answered.
- Rows 2+: dimmed, no award button

### Action Buttons
- "Reveal Answer" — `background: rgba(0,200,240,0.12)`, cyan border + text, ghost style
- "Skip / Close" — transparent, muted border + text
- Reveal answer: shows answer text inline in an answer box below buzz panel; does not close modal
- Answer box: `background: rgba(0,200,240,0.06)`, cyan border, full width

---

## 3. Phone — Buzz Button

### Active Question State
- Game badge: "⊞ Jeopardy" in cyan, JetBrains Mono
- Prompt: "Know the answer? Buzz in!" — Nunito, muted
- BUZZ button: circular, `width/height: 180px`, `border-radius: 50%`
  - Background: `radial-gradient(circle at 40% 35%, #ff9f5a, #ff5500 60%, #cc3300)`
  - Border: `3px solid rgba(255,120,50,0.4)`
  - Box-shadow pulsing animation (2s ease-in-out infinite)
  - Active press: `scale(0.93)` + shadow shrinks
  - Font: Syne 900, white, "BUZZ"
- After buzz: button dims to 40% opacity, text changes to "Buzzed! Wait for teacher." No re-buzz allowed until question clears.
- Team name + score below button

### No Active Question
- Returns to standard lobby state (already implemented)

---

## 4. Header Chrome (Projector)

Same pattern as other redesigned games:
- `height: 64px`, `background: var(--surface)`, bottom border
- Left: game title "JEOPARDY" in JetBrains Mono, cyan, uppercase
- Divider + question counter ("X answered")
- Right: "New Board" button (cyan ghost), "Edit Board" button (muted ghost), `MultiplayerHost` component

---

## 5. Review Mode (Light Polish)

Keep all existing functionality unchanged. Visual updates only:
- Category name inputs: cyan-tinted border on focus (`border-color: #00c8f0`)
- Point badges: cyan color (was yellow)
- Refresh button (↺): cyan accent (was yellow)
- Header text: "REVIEW BOARD" in cyan (was yellow)
- All other layout, inputs, and save/approve buttons: unchanged

---

## 6. Files to Change

| File | Change |
|------|--------|
| `app/jeopardy/page.tsx` | Markup updates — modal restructure, award button logic, tile click animation |
| `app/jeopardy/game.module.css` | Full style rewrite to new design system |
| `app/play/[code]/page.tsx` | Buzz button redesign for Jeopardy game mode (already partially exists) |

No new files needed. No logic changes — only UI.

---

## 7. What Does NOT Change

- Board generation API (`/api/generate-game`)
- Multiplayer buzz polling logic
- `BoardLibrary` component usage
- `GameTimer` component (reused as-is)
- `MultiplayerHost` component
- Store interactions (`updateTeamScore`, `setActiveAwardAmount`, etc.)
- Review mode functionality (edit questions, save board, approve)
