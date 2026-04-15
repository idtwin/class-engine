# Odd One Out — Phone UI & Lobby Design

**Date:** 2026-04-15  
**Status:** Approved  
**Scope:** Classic mode only. Debate and Elimination removed for this iteration.

---

## Problem

The Odd One Out projector game never calls `set_game_mode` or `update_status`, so `room.status` stays `"waiting"` forever. Students are permanently stuck in the lobby. There is also no `oddoneout` block in the phone page — students see nothing game-related even if the room state were correct.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Game mode scope | Classic only | Debate/Elimination deferred to future iteration |
| Mode selector UI | Removed entirely | Avoid confusion over disabled options |
| Phone grid layout | Purple-tinted 2×2 | Matches OOO purple identity, large tap targets, game-feel |
| Feedback timing | Reveal-gated | Preserves the projector reveal as a shared class event; no cheat risk |
| AI explanation source | `question.hint` field | Already LLM-generated, descriptive, no extra API call needed |

---

## Architecture

### Projector — `app/odd-one-out/page.tsx`

**Phase machine** (mirrors Fix It exactly):

```
SETUP → GENERATING → READY → PLAYING
```

- **SETUP** — topic input, difficulty, timer, penalty. Mode selector removed.
- **GENERATING** — spinner, existing UI.
- **READY** — lobby: shows joined students with team names, "Launch Game →" button. Students see the lobby on phones during this window.
- **PLAYING** — existing game view, unchanged.

**`handleGenerate`** — sets `phase: "READY"` after receiving questions (currently jumps straight to game).

**`handleLaunch`** (new function) — fires sequentially:
1. `set_game_mode` → `{ gameMode: "oddoneout" }`
2. `update_status` → `{ status: "playing" }`
3. `clear_answers`
4. `set_question` with first question (words shuffled, answer/hint stripped)
5. Sets `phase: "PLAYING"`, starts timer.

**`handleReveal`** — adds answer + explanation to the reveal payload:
```
action: "reveal_answer"
payload: { answer: currentQ.answer, explanation: currentQ.hint }
```

**`getActiveModel()` fix** — replace `mistralModel` destructure with `getActiveModel` on line 27.

---

### Action Route — `app/api/room/action/route.ts`

Extend the `reveal_answer` handler to store the answer and explanation on the room:

```
if (action === "reveal_answer") {
  room.answerRevealed = true;
  if (payload.answer)      room.revealedAnswer = payload.answer;
  if (payload.explanation) room.revealedExplanation = payload.explanation;
}
```

No new actions or routes needed.

---

### Phone — `app/play/[code]/page.tsx`

New `oddoneout` block with three internal sub-states. Uses only existing state variables (`selectedWord`, `showFeedback`, `feedbackCorrect`, `teammateBlocked`).

#### Sub-state 1 — Word Grid
**Condition:** `!selectedWord && !room.answerRevealed`

- 2×2 grid, purple-tinted buttons (`background: rgba(176,110,255,0.08)`, `border: 1.5px solid rgba(176,110,255,0.25)`)
- Words displayed in `font-weight: 900`, uppercase
- Tapping a word:
  1. Calls `sendAction("student_answer", { studentId, answer: word })`
  2. If `result.error === "teammate_answered"` → sets `teammateBlocked`, shows teammate block (existing component)
  3. Else → `setSelectedWord(word)`
- `renderTeammateBlock()` shown below grid if applicable

#### Sub-state 2 — Locked In
**Condition:** `selectedWord && !room.answerRevealed && !showFeedback`

Full-screen waiting state:
- 🔒 icon (large)
- "Locked In!" in purple (`#b06eff`)
- The picked word in a purple-bordered pill
- Animated waiting dots (existing `.waitDots` CSS class)
- "Waiting for class..." muted text

#### Sub-state 3 — Reveal lands
**Trigger:** `useEffect` watching `room?.answerRevealed`, identical pattern to the existing Fix It reveal effect:

```js
useEffect(() => {
  if (room?.gameMode !== "oddoneout") return;
  if (!room?.answerRevealed || feedbackCorrect !== null) return;
  if (!selectedWord) return; // student didn't answer — handled by edge case below
  const correct = selectedWord === room.revealedAnswer;
  recordResult(
    correct,
    correct
      ? `Correct! ${room.revealedExplanation}`
      : `The odd one out was "${room.revealedAnswer}". ${room.revealedExplanation}`
  );
}, [room?.answerRevealed]);
```

`recordResult()` sets `showFeedback = true` → the existing `renderFeedback()` takes over. No new feedback UI. The standard ✓/✗ screen handles score, streak, and waiting indicator automatically.

#### Edge case — student didn't tap before reveal
If `room.answerRevealed` is true and `selectedWord` is null: skip `recordResult()`. Show the word grid with the correct answer highlighted in green (using `room.revealedAnswer`). Phone never goes blank.

---

### CSS — `app/play/play.module.css`

New classes needed:
- `.ooGrid` — `display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 16px;`
- `.ooBtn` — purple-tinted button (base state)
- `.ooBtnSelected` — picked state: brighter border, glow, slightly scaled up
- `.ooBtnDisabled` — other buttons after a pick: dimmed opacity
- `.lockedScreen` — full-screen centered flex column for sub-state 2
- `.lockedWord` — the purple pill showing the picked word

All inline styles in the OOO block use CSS classes, not inline `style={}` props.

---

## File Change Summary

| File | Type of change |
|---|---|
| `app/odd-one-out/page.tsx` | Add Phase machine, READY lobby, handleLaunch, fix reveal payload, fix getActiveModel |
| `app/api/room/action/route.ts` | Store revealedAnswer + revealedExplanation on reveal_answer |
| `app/play/[code]/page.tsx` | Add oddoneout block with 3 sub-states + reveal useEffect |
| `app/play/play.module.css` | Add OOO-specific CSS classes |

---

## What Does NOT Change

- All existing game logic (generate, shuffle, timer, scoring, elimination tracker, system log)
- The Fix It flow — this is additive only
- Room polling interval (1.5s) — already fast enough
- The standard `renderFeedback()`, `renderLobby()`, `renderGameChrome()`, `renderTeammateBlock()` — reused as-is
