# Odd One Out — Phone UI & Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a READY lobby phase to the Odd One Out projector, wire up `set_game_mode`/`update_status` on launch so phones exit the lobby, and add the full student phone UI (purple 2×2 word grid → locked-in screen → reveal-gated feedback).

**Architecture:** The projector gains a Fix-It-style phase machine (SETUP → GENERATING → READY → PLAYING). On launch it fires `set_game_mode` + `update_status` to Redis; the phone polls every 1.5 s and routes on `room.gameMode === "oddoneout"`. When the teacher reveals, `revealedAnswer` + `revealedExplanation` land on the room object; a `useEffect` on the phone compares the student's tap to `revealedAnswer` and calls `recordResult()`, handing off to the existing feedback screen.

**Tech Stack:** Next.js 14 App Router, TypeScript, Upstash Redis (`/api/room/action`), CSS Modules, Zustand store (`useClassroomStore`). No test framework — verification is manual in-browser.

---

## File Map

| File | Change |
|---|---|
| `app/api/room/action/route.ts` | Store `revealedAnswer` + `revealedExplanation` on `reveal_answer` action |
| `app/odd-one-out/page.tsx` | Phase machine, READY lobby, `handleLaunch`, fix reveal payload, fix `getActiveModel`, remove mode selector |
| `app/play/play.module.css` | Add OOO phone grid + locked-in screen CSS classes |
| `app/play/[code]/page.tsx` | Add OOO reveal `useEffect` + three-sub-state phone block |

---

## Task 1: Extend `reveal_answer` in the action route

**Files:**
- Modify: `app/api/room/action/route.ts`

- [ ] **Step 1: Update the `reveal_answer` handler**

In `app/api/room/action/route.ts`, find this line (around line 35):

```typescript
if (action === "reveal_answer") room.answerRevealed = true;
```

Replace it with:

```typescript
if (action === "reveal_answer") {
  room.answerRevealed = true;
  if (payload.answer)      room.revealedAnswer      = payload.answer;
  if (payload.explanation) room.revealedExplanation = payload.explanation;
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd "C:/Users/ROG Michael/Code/Class Engine/.claude/worktrees/objective-babbage"
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/room/action/route.ts
git commit -m "feat(room): store revealedAnswer and revealedExplanation on reveal"
```

---

## Task 2: Add READY lobby CSS to `odd.module.css`

**Files:**
- Modify: `app/odd-one-out/odd.module.css`

- [ ] **Step 1: Append lobby CSS classes to the end of `odd.module.css`**

```css
/* ── READY lobby ─────────────────────── */
.lobbyState { display: flex; flex-direction: column; gap: 20px; }
.lobbyReadyBadge {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  font-size: 12px; color: var(--text, #dce8f5);
  letter-spacing: 0.08em;
}
.lobbyReadyDot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #00e87a; box-shadow: 0 0 6px #00e87a;
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.lobbySection { display: flex; flex-direction: column; gap: 10px; }
.setupLabel { display: flex; align-items: center; gap: 8px; }
.lobbyJoinCount {
  background: var(--surface2, #131b2b);
  border: 1px solid var(--border2, #243347);
  border-radius: 20px; padding: 1px 10px;
  font-size: 11px; color: var(--text, #dce8f5); font-weight: 700;
}
.lobbyEmpty {
  font-size: 13px; color: var(--muted, #4a637d);
  font-style: italic; padding: 8px 0;
}
.lobbyStudentGrid {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.lobbyStudent {
  display: flex; align-items: center; gap: 6px;
  background: var(--surface2, #131b2b);
  border: 1px solid var(--border2, #243347);
  border-radius: 8px; padding: 6px 10px;
}
.lobbyStudentName { font-size: 13px; font-weight: 700; color: var(--text, #dce8f5); }
.lobbyStudentTeam {
  font-size: 10px; color: var(--muted, #4a637d);
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0.08em;
}
.lobbyActions { display: flex; gap: 12px; align-items: center; }
.btnLaunch {
  background: #b06eff; color: #000; border: none;
  border-radius: 10px; padding: 14px 28px;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  font-size: 13px; font-weight: 700; letter-spacing: 0.1em;
  cursor: pointer; transition: opacity 0.15s;
}
.btnLaunch:hover { opacity: 0.88; }
.btnBackSetup {
  background: transparent; color: var(--muted, #4a637d);
  border: 1px solid var(--border2, #243347);
  border-radius: 10px; padding: 14px 20px;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  font-size: 12px; cursor: pointer;
}
.btnBackSetup:hover { color: var(--text, #dce8f5); }
```

- [ ] **Step 2: Commit**

```bash
git add app/odd-one-out/odd.module.css
git commit -m "feat(odd-one-out): add READY lobby CSS classes"
```

---

## Task 3: Refactor the Odd One Out projector with a phase machine

**Files:**
- Modify: `app/odd-one-out/page.tsx`

This task makes the projector emit `set_game_mode` + `update_status` on launch, enabling phones to exit the lobby. It also removes all mode-related code (Classic was the only real mode).

- [ ] **Step 1: Update the type definitions and imports at the top of the file**

Replace the existing type line at the top:

```typescript
type Mode = "Classic" | "Debate" | "Elimination";
type Question = { level: string, words: string[], answer: string, hint: string };
```

With:

```typescript
type Phase = "SETUP" | "GENERATING" | "READY" | "PLAYING";
type Question = { level: string, words: string[], answer: string, hint: string };
```

In the same file, remove `Ban` from the lucide import — it's only used by the Elimination tracker which we're removing:

```typescript
// Before
import { Sparkles, Lightbulb, ChevronRight, Ban } from "lucide-react";

// After
import { Sparkles, Lightbulb, ChevronRight } from "lucide-react";
```

- [ ] **Step 2: Update the store destructure to use `getActiveModel`**

Find the store destructure (around line 27):

```typescript
const { currentTeams, updateTeamScore, getActiveApiKey, mistralModel, llmProvider, activeRoomCode, saveBoard } = useClassroomStore();
```

Replace with:

```typescript
const { currentTeams, updateTeamScore, getActiveApiKey, getActiveModel, llmProvider, activeRoomCode, saveBoard } = useClassroomStore();
```

- [ ] **Step 3: Replace `activeMode` state with `phase` state, remove eliminated teams**

Find and remove these state declarations:

```typescript
const [activeMode, setActiveMode] = useState<Mode>("Classic");
// ...
const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());
```

Add in their place (group with the other useState declarations):

```typescript
const [phase, setPhase] = useState<Phase>("SETUP");
```

- [ ] **Step 4: Remove the auto-push useEffect (lines ~60–74)**

Find and delete this entire useEffect block:

```typescript
// Push the first question when generated (shuffle words, strip answer for students)
useEffect(() => {
  if (activeRoomCode && questions && currentIndex === 0) {
     const q = questions[0];
     const studentQ = { ...q, words: shuffleArray(q.words), answer: undefined, hint: undefined };
     fetch("/api/room/action", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
          code: activeRoomCode,
          action: "set_question",
          payload: { question: studentQ }
       })
     }).catch((e) => console.error("Sync Error", e));
  }
}, [questions, activeRoomCode]);
```

This is replaced by `handleLaunch` which pushes the first question at the right time.

- [ ] **Step 5: Update `handleGenerate` — set READY phase instead of starting the game**

Find the entire `handleGenerate` function. The section after receiving questions currently pushes the first question and starts the timer. Replace it so it just sets the READY phase.

Find this block inside `handleGenerate` (around lines 164–185):

```typescript
      if (res.ok && data.questions) {
        // Shuffle words on each question so the answer isn't always in the same position
        const shuffled = data.questions.map((q: Question) => ({ ...q, words: shuffleArray(q.words) }));
        setQuestions(shuffled);
        
        if (activeRoomCode && shuffled[0]) {
           const firstQ = shuffled[0];
           const studentQ = { ...firstQ, words: shuffleArray(firstQ.words), answer: undefined, hint: undefined };
           await fetch("/api/room/action", {
             method: "POST", headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: studentQ } })
           });
        }

        setTimeLeft(timerDuration);
        setTimerActive(true);
      } else {
```

Replace with:

```typescript
      if (res.ok && data.questions) {
        const shuffled = data.questions.map((q: Question) => ({ ...q, words: shuffleArray(q.words) }));
        setQuestions(shuffled);
        setCurrentIndex(0);
        setPhase("READY");
      } else {
```

Also at the start of `handleGenerate`, find the line that sets generating state and resets things:

```typescript
    setIsGenerating(true);
    setQuestions(null);
    setCurrentIndex(0);
    setSelectedWord(null);
    setShowHint(false);
    setShowAnswer(false);
    setPointsEarned({});
    setEliminatedTeams(new Set());
```

Remove `setEliminatedTeams(new Set());` (we removed that state):

```typescript
    setIsGenerating(true);
    setQuestions(null);
    setCurrentIndex(0);
    setSelectedWord(null);
    setShowHint(false);
    setShowAnswer(false);
    setPointsEarned({});
```

Also update `setIsGenerating(false)` at the end of `handleGenerate` — this is fine to leave as-is.

- [ ] **Step 6: Add `handleLaunch` — fires game mode, status, then pushes first question**

Add this new function after `handleGenerate`:

```typescript
  const handleLaunch = async () => {
    if (activeRoomCode) {
      await fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "set_game_mode", payload: { gameMode: "oddoneout" } })
      }).catch(() => {});
      await fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "update_status", payload: { status: "playing" } })
      }).catch(() => {});
      await fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
      }).catch(() => {});

      if (questions && questions[0]) {
        const firstQ = questions[0];
        const studentQ = { ...firstQ, words: shuffleArray(firstQ.words), answer: undefined, hint: undefined };
        await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: studentQ } })
        }).catch(() => {});
      }
    }
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setPhase("PLAYING");
  };
```

- [ ] **Step 7: Update `handleReveal` to include answer + explanation in payload**

Find this line inside `handleReveal`:

```typescript
      body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
```

Replace with:

```typescript
      body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: { answer: currentQ?.answer, explanation: currentQ?.hint } })
```

- [ ] **Step 8: Update `handleGenerate` API call to use `getActiveModel()`**

Inside `handleGenerate`, find:

```typescript
        body: JSON.stringify({ 
          apiKey: getActiveApiKey(), 
          mistralModel, 
          provider: llmProvider, 
          topic, 
          level: levelFilter 
        })
```

Replace with:

```typescript
        body: JSON.stringify({ 
          apiKey: getActiveApiKey(), 
          mistralModel: getActiveModel(), 
          provider: llmProvider, 
          topic, 
          level: levelFilter 
        })
```

- [ ] **Step 9: Remove `toggleElimination` function**

Find and delete the entire function:

```typescript
  const toggleElimination = (teamId: string) => {
    setEliminatedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };
```

- [ ] **Step 10: Change the two outer render guards from question-based to phase-based**

Find:
```typescript
      {(!questions || isGenerating) && (
```
Replace with:
```typescript
      {(phase === "SETUP" || phase === "GENERATING" || phase === "READY") && (
```

Find:
```typescript
      {questions && !isGenerating && (
```
Replace with:
```typescript
      {phase === "PLAYING" && questions && (
```

- [ ] **Step 11: Add the READY phase branch inside the setup overlay**

Inside the setup modal, find:
```typescript
            {isGenerating ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Generating word sets...</div>
              </div>
            ) : (
              <>
```
Replace with:
```typescript
            {phase === "GENERATING" ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Generating word sets...</div>
              </div>
            ) : phase === "READY" ? (
              <div className={styles.lobbyState}>
                <div className={styles.lobbyReadyBadge}>
                  <span className={styles.lobbyReadyDot} />
                  <span>{questions?.length} questions ready</span>
                </div>
                <div className={styles.lobbySection}>
                  <div className={styles.setupLabel}>
                    Students joined
                    <span className={styles.lobbyJoinCount}>{roomStudents.length}</span>
                  </div>
                  {roomStudents.length === 0 ? (
                    <div className={styles.lobbyEmpty}>Waiting for students to connect...</div>
                  ) : (
                    <div className={styles.lobbyStudentGrid}>
                      {roomStudents.map(s => {
                        const team = currentTeams.find(t => t.students.some((ts: any) => ts.name === s.name));
                        return (
                          <div key={s.id || s.name} className={styles.lobbyStudent}>
                            <span className={styles.lobbyStudentName}>{s.name}</span>
                            {team && <span className={styles.lobbyStudentTeam}>{team.name}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className={styles.lobbyActions}>
                  <button className={styles.btnLaunch} onClick={handleLaunch}>
                    Launch Game →
                  </button>
                  <button className={styles.btnBackSetup} onClick={() => setPhase("SETUP")}>
                    ← Back
                  </button>
                </div>
              </div>
            ) : (
              <>
```

- [ ] **Step 12: Update the "← New Game" button onClick**

Find:
```typescript
              onClick={() => { setQuestions(null); setCurrentIndex(0); }}
```
Replace with:
```typescript
              onClick={() => { setPhase("SETUP"); setQuestions(null); setCurrentIndex(0); setShowAnswer(false); setSelectedWord(null); setShowHint(false); setPointsEarned({}); }}
```

- [ ] **Step 13: Replace the mode sentence in the game view**

Find:
```typescript
                    {activeMode === "Classic" && "ISOLATE THE ANOMALY."}
                    {activeMode === "Debate" && "DEBATE PROTOCOL ACTIVE."}
                    {activeMode === "Elimination" && "ELIMINATION PROTOCOL ACTIVE."}
```
Replace with:
```typescript
                    ISOLATE THE ANOMALY.
```

- [ ] **Step 14: Remove the Elimination tracker sidebar block**

Find and delete the entire block that starts with:
```typescript
                  {/* Elimination Module (Sideline) */}
                  {activeMode === "Elimination" && currentTeams.length > 0 && (
```
And ends with the matching closing `)}` (around 30 lines, includes the `currentTeams.map` and all the inline styles).

- [ ] **Step 15: Verify TypeScript compiles**

```bash
cd "C:/Users/ROG Michael/Code/Class Engine/.claude/worktrees/objective-babbage"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 16: Manual verification — projector lobby**

```bash
npm run dev
```

1. Open `/odd-one-out` — should see SETUP form with no mode selector, just Difficulty / Timer / Penalty
2. Enter a topic, click Generate — spinner shows, then READY lobby appears
3. READY lobby shows question count badge and "Students joined 0"
4. "← Back" button returns to SETUP form
5. "Launch Game →" button transitions to PLAYING phase

- [ ] **Step 17: Commit**

```bash
git add app/odd-one-out/page.tsx
git commit -m "feat(odd-one-out): add phase machine, READY lobby, handleLaunch, fix getActiveModel"
```

---

## Task 4: Add OOO phone CSS classes

**Files:**
- Modify: `app/play/play.module.css`

- [ ] **Step 1: Append OOO-specific classes to the end of `play.module.css`**

```css
/* ════════════════════════════════════
   ODD ONE OUT — phone grid & locked screen
   ════════════════════════════════════ */

.ooGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 16px;
  width: 100%;
}

.ooBtn {
  background: rgba(176, 110, 255, 0.08);
  border: 1.5px solid rgba(176, 110, 255, 0.25);
  border-radius: 14px;
  padding: 28px 8px;
  text-align: center;
  font-family: var(--font-nunito, 'Nunito', sans-serif);
  font-weight: 900;
  font-size: 18px;
  color: var(--text);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  -webkit-tap-highlight-color: transparent;
}

.ooBtn:active {
  transform: scale(0.95);
}

.ooBtnDisabled {
  opacity: 0.28;
  pointer-events: none;
}

.ooBtnRevealed {
  background: rgba(0, 232, 122, 0.12);
  border-color: #00e87a;
  box-shadow: 0 0 16px rgba(0, 232, 122, 0.2);
  color: #00e87a;
  pointer-events: none;
}

/* Locked-in waiting screen */
.lockedScreen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 24px;
  flex: 1;
  text-align: center;
}

.lockedIcon {
  font-size: 52px;
  line-height: 1;
}

.lockedTitle {
  font-family: var(--font-nunito, 'Nunito', sans-serif);
  font-size: 26px;
  font-weight: 900;
  color: #b06eff;
}

.lockedWord {
  font-family: var(--font-nunito, 'Nunito', sans-serif);
  font-size: 22px;
  font-weight: 900;
  color: var(--text);
  background: rgba(176, 110, 255, 0.1);
  border: 1.5px solid rgba(176, 110, 255, 0.4);
  border-radius: 14px;
  padding: 14px 32px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lockedWaiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.lockedWaitingText {
  font-size: 13px;
  color: var(--muted);
  font-family: var(--font-nunito, 'Nunito', sans-serif);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/play/play.module.css
git commit -m "feat(play): add Odd One Out phone grid and locked-screen CSS classes"
```

---

## Task 5: Add OOO reveal `useEffect` to the phone page

**Files:**
- Modify: `app/play/[code]/page.tsx`

This useEffect must live at component level (not inside the game block), alongside the existing Fix It and Rapid Fire reveal effects (~line 248).

- [ ] **Step 1: Add the OOO reveal useEffect after the Fix It reveal useEffect**

Find the end of the Fix It reveal useEffect (around line 269):

```typescript
  // Fix It: evaluate when answerRevealed flips (both Easy and Hard modes)
  useEffect(() => {
    ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.answerRevealed]);
```

Immediately after it, add:

```typescript
  // Odd One Out: evaluate when answerRevealed flips
  useEffect(() => {
    if (room?.gameMode !== "oddoneout") return;
    if (!room?.answerRevealed || feedbackCorrect !== null) return;
    if (!selectedWord) return; // student didn't tap — edge case handled in render
    const correct = selectedWord === room.revealedAnswer;
    recordResult(
      correct,
      correct
        ? `Correct! ${room.revealedExplanation || "Well spotted!"}`
        : `The odd one out was "${room.revealedAnswer}". ${room.revealedExplanation || "Keep it up!"}`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.answerRevealed]);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/play/[code]/page.tsx"
git commit -m "feat(play): add Odd One Out reveal useEffect for answer evaluation"
```

---

## Task 6: Add the OOO phone game block

**Files:**
- Modify: `app/play/[code]/page.tsx`

- [ ] **Step 1: Add the OOO block after the Fix It block**

Locate the end of the Fix It block. It ends with a closing `}` after the final JSX return for Fix It mode. Immediately after that closing brace, add:

```typescript
  // ── ODD ONE OUT ─────────────────────────────────
  if (room.gameMode === "oddoneout" && room.currentQuestion) {
    const q = room.currentQuestion;
    const isRevealed = !!room.answerRevealed;
    const anyPicked  = !!selectedWord;

    // Sub-state 2: tapped but not yet revealed → locked-in screen
    if (anyPicked && !isRevealed && !showFeedback) {
      return (
        <div className={styles.screen}>
          {renderGameChrome()}
          <div className={styles.gameBody}>
            <div className={styles.lockedScreen}>
              <div className={styles.lockedIcon}>🔒</div>
              <div className={styles.lockedTitle}>Locked In!</div>
              <div className={styles.lockedWord}>{selectedWord}</div>
              <div className={styles.lockedWaiting}>
                <div className={styles.waitDots}>
                  <div className={styles.waitDot} />
                  <div className={styles.waitDot} />
                  <div className={styles.waitDot} />
                </div>
                <div className={styles.lockedWaitingText}>Waiting for class...</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Edge case: teacher revealed but student never tapped → show grid with answer highlighted
    if (isRevealed && !anyPicked && !showFeedback) {
      return (
        <div className={styles.screen}>
          {renderGameChrome()}
          <div className={styles.gameBody}>
            <div className={styles.fixitPromptLabel}>Which word doesn't belong?</div>
            <div className={styles.ooGrid}>
              {(q.words as string[]).map((word: string) => {
                const isAnswer = word === room.revealedAnswer;
                return (
                  <div
                    key={word}
                    className={`${styles.ooBtn} ${isAnswer ? styles.ooBtnRevealed : styles.ooBtnDisabled}`}
                  >
                    {word}
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
              The odd one out was{" "}
              <strong style={{ color: "#00e87a" }}>{room.revealedAnswer}</strong>
            </div>
          </div>
        </div>
      );
    }

    // Sub-state 1: word grid (default — nothing tapped yet)
    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.gameBody}>
          <div className={styles.fixitPromptLabel}>Which word doesn't belong?</div>
          {renderTeammateBlock()}
          {!teammateBlocked && (
            <div className={styles.ooGrid}>
              {(q.words as string[]).map((word: string) => (
                <button
                  key={word}
                  className={styles.ooBtn}
                  onClick={async () => {
                    if (selectedWord || teammateBlocked) return;
                    const result = await sendAction("student_answer", { studentId, answer: word });
                    if (result?.error === "teammate_answered") {
                      setTeammateBlocked(result.answeredBy);
                      return;
                    }
                    setSelectedWord(word);
                  }}
                  disabled={!!selectedWord || !!teammateBlocked}
                >
                  {word}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: End-to-end manual verification**

Run `npm run dev` and test the full flow:

**Projector flow:**
1. `/odd-one-out` — enter topic → Generate → READY lobby appears
2. Open `/play/[code]` in another tab — phone shows lobby (waiting state)
3. Click "Launch Game →" on projector → phone immediately transitions to the OOO word grid (2×2 purple buttons)
4. Tap a word on the phone → phone shows Locked In screen with picked word + waiting dots
5. Click "INITIATE REVEAL" on projector → phone immediately shows ✓ Correct or ✗ Not Quite with the hint text as AI feedback
6. Score and streak update on the feedback screen
7. Teacher clicks "NEXT SEQUENCE" on projector → phone returns to word grid for next question
8. After last question, phone returns to lobby

**Edge case:**
1. Start a round, do NOT tap on phone
2. Reveal on projector → phone shows the grid with the correct answer highlighted green, others dimmed, "The odd one out was X" below

- [ ] **Step 4: Final commit**

```bash
git add "app/play/[code]/page.tsx"
git commit -m "feat(play): add Odd One Out phone UI — word grid, locked-in screen, reveal feedback"
```
