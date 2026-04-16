# Rapid Fire — Projector Redesign Spec

## Goal

Redesign the Rapid Fire projector views to match the single-column layout pattern used by OOO and Fix It. Use Rapid Fire's pink (#ff4d8f) identity. Remove the two-column SYSTEM_LOG sidebar. Add speed ranking (MC mode) and sequential buzzer unlock (Buzzer mode).

---

## Identity

| Token | Value |
|-------|-------|
| Primary accent | `#ff4d8f` (pink) |
| Urgent color | `#ff4444` (red) |
| Correct color | `#00e87a` (green) |
| Font — title/tiles | Syne 700/800 |
| Font — labels/mono | JetBrains Mono 400/700 |

---

## Layout

Three-row CSS grid, identical to OOO and Fix It patterns:

```
[HEADER] — fixed height ~64px
[BODY]   — flex 1, scrollable if needed
[FOOTER] — universal scoreboard (existing component, untouched)
```

No sidebar. No SYSTEM_LOG. Full-width single column.

CSS class prefix: `rf` (e.g. `.rfPage`, `.rfHeader`, `.rfBody`).

---

## Phase Machine

Existing phases kept as-is:

```
SETUP → LOADING → READY → PLAYING → REVEALED → FINISHED
```

No new phases added.

---

## Header

Identical structure to Fix It header:

- Left: game title `RAPID FIRE` in Syne 800, pink
- Center: SVG circular timer (r=20, CIRC=125.66)
  - Ring color: pink gradient when normal, `#ff4444` when urgent (≤10s)
  - Urgent threshold: `timeLeft <= 10 && timerDur > 0`
  - Timer number inside ring
- Right: question counter `Q {currentQ} / {totalQ}` in JetBrains Mono, muted
- Below title: thin progress bar (pink fill, urgent = red)

Timer derivations (same pattern as Fix It):
```ts
const RF_CIRC = 125.66;
const rfDashOffset = timerDur > 0 ? RF_CIRC * (1 - timeLeft / timerDur) : 0;
const rfTimerUrgent = timeLeft <= 10 && timerDur > 0;
```

---

## Body — PLAYING State

### MC Mode

- Fill-in-the-blank sentence card at top (pink border-left accent)
- 4 answer tiles in 2×2 grid
  - Tile: dark surface, pink border on hover/active, letter badge (A/B/C/D) in pink
  - During PLAYING: all tiles neutral, no selection shown on projector
- Team chips row below tiles: all 7 teams shown, chip style = waiting (muted) until a team submits
  - Once a team submits: chip highlights (pink glow) with submission time shown
  - Chip order: T1–T7 fixed left-to-right

### Buzzer Mode

- Fill-in-the-blank sentence card at top (pink border-left accent)
- Buzz queue list (full queue, ordered by buzz time):
  - Entry height ~48px, shows: position number, team name, buzz time (e.g. "2.3s")
  - 1st entry = ACTIVE: pink border, bright team name, ✓ CORRECT / ✗ WRONG buttons
  - 2nd+ entries = WAITING: muted border, muted name, no buttons
  - No entries yet: empty state "Waiting for first buzz..."
- ✓ / ✗ button behavior:
  - ✓ → mark entry `correct-done` (green), award flat 300pts, show NEXT QUESTION button
  - ✗ → mark entry `wrong-done` (red, dimmed), next entry in queue becomes ACTIVE with ✓/✗
  - If all entries exhausted → NEXT QUESTION button with 0pts awarded
- Points: flat 300pts per correct buzz, regardless of position in queue

---

## Body — REVEALED State

### MC Mode

- Sentence card with correct word filled in (green highlight)
- 4 tiles:
  - Correct tile: green border + green text
  - Wrong tiles: dimmed (opacity 0.35)
- Speed ranking block below tiles:
  - Header: "SPEED RANKING" label
  - Each team that answered correctly listed in order by `answerTime` (fastest first)
  - Position medals: 🥇 1st=500pts · 🥈 2nd=400pts · 🥉 3rd=300pts · 4th+=100pts
  - Teams that didn't answer or answered wrong: not shown in ranking
- NEXT QUESTION button (pink outline, bottom center)

### Buzzer Mode

- Sentence card with correct answer revealed (green highlight, visible to all)
- Buzz queue: final state (one entry correct-done in green, others wrong-done in red/dimmed, or all wrong-done)
- If any correct: shows "✓ +300" badge on winning entry
- NEXT QUESTION button

---

## Body — FINISHED State

Keep existing FINISHED screen. No changes.

---

## Body — SETUP / LOADING / READY States

Keep existing behavior. LOADING shows spinner/generating state. READY shows question is ready, teacher presses start. No layout changes needed for these phases — they can use a simple centered card within the new `.rfBody` container.

---

## Team Chips (MC Mode PLAYING)

```
[T1 chip] [T2 chip] ... [T7 chip]
```

- Chip: rounded pill, team color border
- States:
  - `waiting`: muted border, muted name, no time
  - `submitted`: team color border + glow, name bright, answerTime shown in mono
- Only show teams that are in the current session (active team count from existing state)

---

## Speed Ranking Component (MC Mode REVEALED)

New sub-component `.rfSpeedRank`:

```
SPEED RANKING
─────────────────────────────
🥇  ALPHA          2.1s   +500
🥈  BETA           3.4s   +400
🥉  DELTA          4.7s   +300
    GAMMA          6.2s   +100
```

- Background: dark surface card, pink top border
- Medal emoji + team name + time + pts in a row
- Teams with wrong answers excluded
- If zero teams answered correctly: show "No correct answers" placeholder

Scoring already implemented in existing code (`answerTime` ordering, 1st=500/2nd=400/3rd=300/4th=200/others=100). New scoring for spec: 4th=100 (not 200 — simplify the tail). Check existing code; if already 4th=200 keep it, don't change scoring logic.

---

## Buzzer Queue Component

New sub-component `.rfBuzzQueue`:

Each entry (`.rfBuzzEntry`) has 4 states:
- `active` — pink border, bright name, ✓/✗ buttons visible
- `waiting` — muted border, muted name, no buttons
- `correct-done` — green border, green name, "✓ +300" badge, no buttons
- `wrong-done` — red/dimmed border, red name, "✗ wrong" badge, no buttons, opacity 0.5

No auto-scroll needed; queue max length = active team count (2–7), fits vertically.

---

## What Does NOT Change

- All game logic, state machine, scoring calculations, socket/multiplayer
- `RFMode` type (`"buzzer" | "mc"`)
- Existing MC auto-scoring by `answerTime` (1st=500, 2nd=400, 3rd=300, etc.)
- Universal scoreboard footer component
- FINISHED screen
- All API routes and AI generation
- Student phone views (`app/rapid-fire/phone/`)

---

## Files Changed

| File | Change |
|------|--------|
| `app/rapid-fire/rf.module.css` | New file: all new CSS classes with `rf` prefix |
| `app/rapid-fire/page.tsx` | Replace two-column layout JSX with new single-column layout; add timer derivations; add speed ranking + buzzer queue render logic |

`rf.module.css` is a new file (currently rapid fire uses inline styles or a different module — check at implementation time; if `rapid-fire.module.css` already exists, append new classes with `rf` prefix instead of creating new file).

---

## Spec Self-Review

- No TBDs or placeholders
- Architecture matches feature descriptions
- Buzzer sequential unlock flow fully specified
- MC speed ranking fully specified  
- Scoring logic: preserve existing, don't change
- Both modes covered for PLAYING and REVEALED states
- Timer pattern matches Fix It exactly (safe to copy derivation)
- CSS prefix `rf` avoids collision with any existing classes
