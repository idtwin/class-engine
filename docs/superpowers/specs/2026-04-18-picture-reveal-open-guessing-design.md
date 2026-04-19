# Picture Reveal — Open Guessing Redesign
**Date:** 2026-04-18  
**Status:** Approved

---

## Overview

Replace the existing "active team only" image guess prompt with open, always-on guessing from all phones throughout the entire round. Correct guess auto-detected server-side, ends round immediately with celebration visuals. Rewards both boldness (early guess = more points) and patience (save limited guesses for when more tiles are revealed).

Goal: phones are actively engaged the entire round, not just during buzz moments. Students race to crack the image while managing scarce guess slots.

---

## 1. Core Mechanic

### Guess Limit — 1 per Tile Revealed
- Round starts: each student has **0 guess slots**
- Each tile revealed (correct or wrong tile answer): all students gain **1 guess slot**
- Maximum 16 slots per round (one per tile)
- Guess slots are per-student, tracked locally on the phone (client-enforced, classroom trust model)
- Used guesses shown on phone so student knows remaining count

### Auto-Detection
- Student submits guess → `submit_open_guess` Redis action fires
- Action checks `guess.toLowerCase()` against `room.revealImageAnswer.toLowerCase()`
- Match found → sets `room.openGuessWon = { teamId, teamName, guess, tilesRevealed, points }`
- No teacher confirmation needed — round ends automatically

### Points (scaled by tiles revealed at correct guess)
| Tiles Revealed | Points |
|---|---|
| 1–4 | 500 |
| 5–10 | 400 |
| 11–16 | 300 |

---

## 2. What Gets Removed

- `imageGuessMode` state (`'offering' | 'waiting' | 'teacher_only' | null`) — removed entirely
- "Offer via Phone / Judge Verbally / Skip" overlay on board — removed
- `trigger_image_guess`, `submit_image_guess`, `clear_image_guess` Redis actions — removed
- `imageGuessActive`, `imageGuessTeamId`, `imageGuessTeamName`, `imageGuess` from room state — removed
- `awardTileCorrect` no longer triggers any image guess prompt — just reveals tile and moves on

---

## 3. Projector Changes (`app/reveal/page.tsx`)

### On game start (review approved → game begins)
- Fire `set_reveal_answer` action: stores `gameData.imageAnswer` in `room.revealImageAnswer`
- Fire `set_tiles_revealed` action with `{ count: 0 }` to reset

### On each tile revealed
- Fire `set_tiles_revealed` action with updated `{ count: revealedTiles.filter(Boolean).length }`
- Phones receive updated count and unlock a guess slot

### Polling
- Projector polls room state (existing `shouldPoll` effect, already in place for buzz panel)
- Watches for `room.openGuessWon` — when detected, triggers win celebration

### Win Celebration Overlay
- Replaces `roundEndOverlay` for image-guess wins
- Full image reveals (all tiles fade)
- Centered overlay: `{teamName} cracked it!` + answer text + points badge (`+500 pts`)
- "Next Round →" / "End Game" buttons same as current round-end
- `openGuessWon` also awards points: `updateTeamScore(teamId, points)`

### Live Guess Ticker (optional, non-blocking)
- Small strip below board or in header showing latest guess attempt: `"Team 2: mountain range"` (wrong)
- Only shows wrong guesses — keeps suspense for correct one
- Projector polls `room.openGuesses[]` for this

### `awardTileCorrect` simplified
- Awards 100pts to team
- Reveals tile
- Fires `set_tiles_revealed`
- No image guess prompt — done

---

## 4. Phone Changes (`app/play/[code]/page.tsx`)

### Phone states during active reveal round
| Condition | Phone shows |
|---|---|
| `room.currentQuestion` set (buzz active) | Buzz button (existing) |
| `room.openGuessWon` set | Win/lose celebration screen |
| Default (between tile questions) | Open guess input |

### Open Guess Input UI
- Prompt: `"What's the image?"` in large Nunito bold, orange
- Text input (auto-focused) + orange submit button
- Counter: `"X guesses remaining"` in muted mono below input
  - `remaining = room.tilesRevealed - guessesUsed`
  - When `remaining === 0`: input disabled, shows `"No guesses left this round"`
  - When `room.tilesRevealed === 0`: shows `"Guess slots unlock as tiles are revealed"`
- Wrong guess feedback: input clears + red flash + `"Not quite — X guesses left"`
- Local state: `guessesUsed` (int, resets each round when `room.tilesRevealed` drops to 0)

### Win Celebration Screen
- `room.openGuessWon` detected on phone:
  - If `openGuessWon.teamId === myTeamInfo.id`: green celebration, `"+{points} pts — Your team got it!"`
  - Otherwise: neutral/dimmed, `"{teamName} cracked it!"`

---

## 5. Redis Actions (`app/api/room/action/route.ts`)

### New actions

```typescript
// set_reveal_answer — projector sets answer when game starts
// payload: { answer: string }
// Sets: room.revealImageAnswer = answer

// set_tiles_revealed — projector syncs count on each tile change
// payload: { count: number }
// Sets: room.tilesRevealed = count

// submit_open_guess — phone submits guess, server auto-checks
// payload: { guess: string, teamId: string, teamName: string, studentId: string }
// If guess matches: room.openGuessWon = { teamId, teamName, guess, tilesRevealed, points }
// Appends to: room.openGuesses[] (for projector ticker, max last 10)

// clear_open_guesses — projector fires between rounds
// payload: {}
// Clears: room.openGuessWon, room.openGuesses, room.revealImageAnswer, room.tilesRevealed
```

### Points logic (in action route)
```typescript
const count = room.tilesRevealed || 0;
const points = count <= 4 ? 500 : count <= 10 ? 400 : 300;
```

### Keep existing actions
- `trigger_image_guess`, `submit_image_guess`, `clear_image_guess` — **remove** (no longer needed)

---

## 6. Files to Change

| File | Change |
|---|---|
| `app/reveal/page.tsx` | Remove imageGuessMode state/logic, add openGuessWon polling + celebration, fire set_reveal_answer + set_tiles_revealed on game start and each tile reveal |
| `app/reveal/reveal.module.css` | Remove guess prompt styles, add win celebration overlay styles |
| `app/api/room/action/route.ts` | Remove 3 old image guess actions, add 4 new open guess actions |
| `app/play/[code]/page.tsx` | Replace old image guess UI with open guess input, guess counter, win screen |

---

## 7. What Does NOT Change

- Tile question flow (buzz in, award, wrong/next team)
- Turn order and round structure (3 rounds, currentTeamIdx)
- `buildImageUrl`, AI generation, review mode
- `ScoreboardOverlay`, `MultiplayerHost`
- 100pts per correct tile answer
- Round-end overlay for teacher Full Reveal (manual end still works)
