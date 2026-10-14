# Picture Reveal Redesign — Design Spec
**Date:** 2026-04-18  
**Status:** Approved  

---

## Overview

Full redesign of Picture Reveal with new game mechanics (team turn order, image guessing, 3-round structure) and a complete visual overhaul. All existing AI generation and image loading logic is preserved.

**Identity:** Orange (`#ff7d3b`) — distinct from Jeopardy's cyan.  
**Fonts:** Syne (tile numbers, question text) + JetBrains Mono (labels, badges, header).  
**Grid:** 4×4 (16 tiles) over hidden AI image.  
**Rounds:** 3 per game (default), each with a fresh AI image.

---

## 1. Game Mechanics

### Turn Order
- Teams rotate in fixed order (Team 1 → Team 2 → ... → Team N → repeat)
- Active team displayed prominently on projector
- Turn advances after every tile attempt (correct or wrong)
- `currentTeamIdx` state tracks whose turn it is

### Tile Interaction
- Teacher always controls the projector — any tile can be clicked at any time
- Active team indicator is UI context only (shows whose turn it is for scoring)
- Correct answer: 100pts awarded to active team, tile revealed, image guess offered
- Wrong answer: tile stays hidden, turn passes, no points, no penalty

### Image Guess Flow
1. After correct tile answer, projector shows "Guess the Image?" prompt
2. Teacher clicks "Offer Guess" → `trigger_image_guess` Redis action fires
3. Phones: active team sees text input ("What's the image?") + submit button; other teams see waiting state
4. Submitted guess appears on projector
5. Teacher clicks "Correct" (300pts + full reveal + round end) or "Wrong" (no penalty, game continues)
6. Teacher-only mode (no phones): teacher judges verbally, clicks Correct/Wrong manually

### Round Structure
- Round ends when: image correctly guessed OR teacher manually triggers full reveal
- Between rounds: brief celebration state, "Next Round" button
- Round 3 end → game over state with final scores
- Each new round: all 16 tiles reset, new AI image generated

### Scoring
- Correct tile answer: 100pts
- Correct image guess: 300pts
- Wrong tile answer: 0pts, no penalty
- Wrong image guess: 0pts, no penalty

---

## 2. Board (Projector)

### Header (64px)
- Left: "PICTURE REVEAL" in JetBrains Mono, orange, uppercase
- Center: "Round X / 3" badge in orange ghost pill
- Center-right: Active team name in their team color (prominent, not muted)
- Right: "Full Reveal" button (orange ghost) + "New Game" button (muted) + MultiplayerHost

### Tiles — Resting State
- Background: `linear-gradient(160deg, #1a0e00 0%, #110900 100%)`
- Border: `1px solid rgba(255, 125, 59, 0.2)`, `border-radius: 8px`
- Font: Syne, 900, `font-size: clamp(18px, 2.5vw, 32px)`
- Color: `#ff9a5c` with `text-shadow: 0 0 12px rgba(255, 125, 59, 0.5)`
- Inner shimmer: `::before` diagonal gradient overlay
- Box-shadow: `inset 0 0 16px rgba(255, 125, 59, 0.05)`

### Tiles — Hover State
- Background: `linear-gradient(160deg, rgba(255, 125, 59, 0.18), rgba(255, 100, 30, 0.08))`
- Border: `1px solid #ff7d3b` (fully lit)
- Box-shadow: `inset 0 0 20px rgba(255, 125, 59, 0.12), 0 0 20px rgba(255, 125, 59, 0.3), 0 0 40px rgba(255, 125, 59, 0.12)`
- Transform: `scale(1.05)`
- Color: `#fff`, text-shadow glow burst
- Transition: `all 0.18s ease`

### Tiles — Click Animation
- `scale(0.96)` press for 120ms before question modal opens

### Tiles — Revealed State
- `opacity: 0`, `pointer-events: none` — image shows through
- Smooth fade: `transition: opacity 0.6s ease`

### Hidden Image
- Fills entire board area behind tile grid
- Loads during review mode (preloaded before game starts)
- Loading state: spinner with orange accent
- Error state: ImageOff icon + retry button

### Board Layout
- `display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px`
- Board is square, centered, fills available height
- Image absolutely positioned behind grid overlay

### Active Team Banner
- Strip below header (or within header right side): "🟢 Team 2's Turn" — team name in team color, bold
- Subtle team-color glow on the banner background

### Image Guess Prompt (post correct tile)
- Appears as overlay on board (not full-screen modal)
- "Offer this team a chance to guess the image?" with "Offer Guess" and "Skip" buttons
- Orange accent, semi-transparent background

---

## 3. Question Modal

Same clean structure as Jeopardy redesign:

### Badge
- Pill: "Tile X · 100 pts" — orange background-tinted, orange border, JetBrains Mono

### Question Text
- Syne, 800, white, `clamp(1.6rem, 3.5vw, 3rem)`, centered

### Timer
- JetBrains Mono number + horizontal fill bar
- Turns pink when `timeLeft < 10`

### Buzz Panel (phone mode)
- Same as Jeopardy: ranked buzz order, first buzzer highlighted in team color
- Award button in team color: one click → 100pts + reveal tile + close modal

### Action Buttons
- "Reveal Answer" — orange ghost button
- "Wrong / Next Team" — muted ghost button (passes turn, keeps tile hidden)

---

## 4. Image Guess State (Projector)

After teacher clicks "Offer Guess":
- Projector shows submitted guess text (from phone) or empty waiting state
- "Correct — 300pts" button (green) + "Wrong" button (muted)
- Correct: `updateTeamScore(teamId, 300)` + `setRevealedTiles(all true)` + show answer overlay + "Next Round" button
- Wrong: dismiss, continue game, advance turn

### Answer Overlay (round end)
- Centered on fully-revealed image
- Dark blur card: image answer in large Syne white text
- "Next Round →" button (orange) or "End Game" if round 3

---

## 5. Phone UI

### Buzz State (active question)
- Same pulsing buzz button as Jeopardy
- Orange-tinted ring glow (matching game identity): `rgba(255, 125, 59, 0.x)` shadows
- After buzz: dims to 40% opacity, "Buzzed! Wait for teacher."

### Image Guess State (triggered by `trigger_image_guess` Redis action)
- Replaces buzz button when `room.imageGuessActive === true`
- Prompt: "What's the image?" in large Nunito bold, orange
- Text input (auto-focused) + orange submit button
- Only active team sees input; other teams see "Team X is guessing..."
- After submit: "Guess locked! Waiting for teacher." 

### Waiting / Lobby
- Standard lobby state between questions

---

## 6. New Redis Action

```typescript
// action: "trigger_image_guess"
// payload: { teamId: string, teamName: string }
// Sets: room.imageGuessActive = true, room.imageGuessTeamId = teamId
// Phones poll and show guess input when imageGuessActive === true

// action: "clear_image_guess"  
// payload: {}
// Sets: room.imageGuessActive = false, room.imageGuess = null

// action: "submit_image_guess"
// payload: { guess: string, studentId: string, name: string }
// Sets: room.imageGuess = { guess, name, teamId }
// Projector polls and displays submitted guess
```

---

## 7. Review Mode (Light Polish)

Keep all existing functionality:
- Image answer input
- Manual image URL override
- Question editing (q + a per tile)
- Retry button on image load failure

Visual updates only:
- Accent color: purple → orange (`#ff7d3b`)
- Header: "REVIEW PUZZLE" in orange
- Question index badges: orange

---

## 8. Files to Change

| File | Change |
|------|--------|
| `app/reveal/page.tsx` | Turn order state, round counter (1-3), image guess flow, modal restructure, answer overlay |
| `app/reveal/reveal.module.css` | Full style rewrite to orange identity |
| `app/play/[code]/page.tsx` | Image guess input state (when `room.imageGuessActive`) |
| `app/api/room/action/route.ts` | Add `trigger_image_guess`, `clear_image_guess`, `submit_image_guess` actions |

No new files needed.

---

## 9. What Does NOT Change

- AI generation API (`/api/generate-reveal`)
- Image URL building (`buildImageUrl`)
- Image loading/error/retry logic
- `ScoreboardOverlay` component
- `MultiplayerHost` component
- Store interactions (`updateTeamScore`, `setActiveAwardAmount`)
- Review mode functionality (edit questions, answer, image URL override)
