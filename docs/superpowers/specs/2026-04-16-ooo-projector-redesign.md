# OOO Projector Playing View — Redesign Spec

## Goal

Redesign the Odd One Out projector playing view to feel dramatic and fun while remaining clean and readable on a bad projector. Keep the original game's identity (SEQUENCE numbering, JetBrains Mono, purple brand, corner reticles) but remove the sidebar clutter and replace the boring static timer with a compact animated circular countdown.

---

## What Changes

Only the PLAYING phase of the projector view (`app/odd-one-out/page.tsx`) is changing. Setup, generating, and ready phases are untouched. Phone UI is untouched. API routes are untouched.

---

## Visual Design

### Header
- Same structure as today: game title · divider · sequence · level badge · timer on the right
- **Title:** `ODD ONE OUT` in Syne, purple `#b06eff`
- **Sequence:** `SEQUENCE_03` in JetBrains Mono, muted `#4a637d`
- **Level badge:** `INTERMEDIATE` pill, purple tint background
- **Timer:** compact circular SVG ring, 48×48px, right-aligned — replaces the flat text clock

### Circular Timer
- SVG ring: track circle `#1c2a40`, animated fill ring on top
- **Normal (>10s):** gradient stroke `#b06eff → #ffc843`, number inside in purple
- **Mid (≤20s):** gradient shifts toward gold, number turns gold `#ffc843`
- **Urgent (≤10s):** stroke turns red `#ff4444`, number turns red, number pulses with opacity animation
- Circumference = 125.66 (r=20). `stroke-dashoffset` maps remaining seconds to drain amount
- Thin progress bar under the header matches: purple gradient normally, red when urgent

### Body Layout
Single centered column, no sidebar:
```
[header with circular timer]
[3px gradient bar]
[prompt label]
[2×2 word tile grid]
[team status chips row]
[action buttons row]
```

### Prompt Label
`PICK THE WORD THAT DOESN'T BELONG` — uppercase, JetBrains Mono, muted white `#dce8f5` at 60% opacity.

After reveal: changes to `ANSWER REVEALED` in green `#00e87a` at 100% opacity.

### Word Tiles
- 120px tall, 2×2 grid, max-width 760px
- Font: Syne 36px 800-weight, color `#dce8f5`
- Background: `#0d1424`, border: `1.5px solid rgba(176,110,255,0.3)`
- Corner reticles (CSS `::before`/`::after`): subtle purple, 8×8px L-shapes
- Box shadow: `0 4px 20px rgba(0,0,0,0.5)`, inset top highlight
- **Correct state:** background `#061610`, border + text `#00e87a`, green glow, green corner reticles
- **Dimmed state:** opacity 0.18, no shadow, border `#1c2a40`

### Team Status Chips
Row of chips centered below the word grid:
- **Locked in:** team color background tint + border + lock emoji — e.g. `🔒 ALPHA` in green for T1
- **Waiting:** transparent, border `#243347`, text muted
- **Correct (post-reveal):** green background tint, `✓ ALPHA +500` with score pop in green
- **Wrong (post-reveal):** red background tint, `✗ BETA`
- **No answer:** muted, `— DELTA`

### Buttons
Pre-reveal:
- `✦ INITIATE REVEAL` — solid purple fill, black text, JetBrains Mono, letter-spacing 0.1em
- `💡 DEPLOY HINT` — transparent, dashed purple border

Post-reveal:
- `NEXT SEQUENCE →` — transparent, solid purple border
- `← NEW GAME` — transparent, dark border, muted text

---

## Implementation Scope

### File to change
`app/odd-one-out/page.tsx` — PLAYING phase JSX and associated CSS module classes

### CSS module
`app/odd-one-out/odd.module.css` — add/update classes for:
- `.circularTimer`, `.timerSvg`, `.timerTrack`, `.timerRing`, `.timerNum`
- `.timerRing.urgent`, `.timerNum.urgent`, `.timerNum.mid`
- `.progressBar`, `.progressFill`, `.progressFill.urgent`
- `.promptLabel`, `.promptLabel.revealed`
- `.wordGrid`, `.wordTile`, `.wordTile.correct`, `.wordTile.dimmed`
- `.teamRow`, `.teamChip`, chip state variants
- `.actionRow`, `.btnReveal`, `.btnHint`, `.btnNext`, `.btnNew`

### Timer logic
- `timeLeft` state already exists (counts down from `timerDuration`)
- Derive `urgency` class: `timeLeft <= 10 ? 'urgent' : timeLeft <= 20 ? 'mid' : ''`
- Derive `strokeDashoffset`: `125.66 * (1 - timeLeft / timerDuration)`
- SVG gradient defined inline with `<defs>` in the JSX

### No logic changes
- `handleReveal`, `handleLaunch`, `timerActive`, `roomStudents`, score calculation — all unchanged
- Only the JSX structure of the PLAYING phase and CSS classes change

---

## States to Render

1. **PLAYING, timer running, no teams locked** — prompt + 4 neutral tiles + all chips waiting + Reveal + Hint buttons
2. **PLAYING, timer running, some teams locked** — same but locked chips show team color + lock emoji
3. **PLAYING, timer urgent (≤10s)** — ring red, number pulses, bar red
4. **POST-REVEAL** — prompt label turns green "ANSWER REVEALED", correct tile green + glow, others dimmed, explanation card, team result chips, Next Sequence + New Game buttons
