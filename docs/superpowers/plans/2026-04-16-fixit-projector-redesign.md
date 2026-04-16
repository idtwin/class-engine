# Fix It Projector Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Fix It projector PLAYING + REVEALED views with a yellow-identity single-column layout matching the OOO redesign pattern.

**Architecture:** Two file changes only — append new CSS classes to `fix.module.css` (old classes stay for SETUP/LOBBY/FINISHED), then replace the `<div className={styles.page}>` JSX block in `page.tsx` with a new 3-row grid layout. All game logic, state, API calls, and timers are untouched.

**Tech Stack:** Next.js 14 App Router, TypeScript, CSS Modules, inline SVG

---

## File Map

| File | Change |
|------|--------|
| `app/fix-it/fix.module.css` | Append ~230 lines of new CSS classes after line 886 |
| `app/fix-it/page.tsx` | (1) Add `wrongWordClass?` prop to `HighlightedSentence`; (2) add 4 timer derivation constants; (3) replace lines 390–606 with new JSX |

---

### Task 1: Append new CSS classes to `fix.module.css`

**Files:**
- Modify: `app/fix-it/fix.module.css` (append after line 886)

- [ ] **Step 1: Append new classes at end of `fix.module.css`**

Open `app/fix-it/fix.module.css`. After the final `}` of `@keyframes fadeSlideIn` (line 885), append:

```css
/* ═══════════════════════════════════════════════════
   FIX IT — New Single-Column Playing Layout (2026-04)
   ═══════════════════════════════════════════════════ */

/* Page shell — 3-row grid */
.pageNew {
  position: fixed;
  top: var(--nav-h, 60px);
  left: 0;
  right: 0;
  bottom: var(--scoreboard-h, 88px);
  display: grid;
  grid-template-rows: 62px 3px 1fr;
  overflow: hidden;
  background: var(--bg);
}

/* ── Header ── */
.fixHeader {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 36px;
  border-bottom: 1px solid var(--border);
  background: #0a0d18;
  flex-shrink: 0;
}

.fixTitle {
  font-family: 'Syne', var(--font-main), sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: var(--yellow);
  letter-spacing: 0.1em;
}

.fixHeaderDiv {
  width: 1px;
  height: 22px;
  background: var(--border);
}

.fixQSeq {
  font-family: var(--font-mono), monospace;
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.06em;
}

.fixLevelBadge {
  font-family: var(--font-mono), monospace;
  font-size: 11px;
  background: rgba(255,200,67,0.1);
  color: var(--yellow);
  border: 1px solid rgba(255,200,67,0.2);
  border-radius: 20px;
  padding: 2px 10px;
  letter-spacing: 0.06em;
}

/* ── Circular timer ── */
.fixTimerWrap {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  margin-left: auto;
}

.fixTimerSvg {
  width: 48px;
  height: 48px;
  transform: rotate(-90deg);
}

.fixTimerTrack {
  fill: none;
  stroke: var(--border);
  stroke-width: 3.5;
}

.fixTimerRing {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dasharray: 125.66;
}

.fixTimerRingUrgent {
  stroke: var(--red) !important;
  animation: fixUrgPulse 0.6s ease-in-out infinite alternate;
}

@keyframes fixUrgPulse {
  from { opacity: 1; }
  to   { opacity: 0.4; }
}

.fixTimerNum {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono), monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--yellow);
}

.fixTimerNumUrgent {
  color: var(--red);
  animation: fixUrgPulse 0.6s ease-in-out infinite alternate;
}

/* ── Progress bar ── */
.fixProgressBar {
  height: 3px;
  background: var(--surface2);
}

.fixProgressFill {
  height: 3px;
  background: linear-gradient(90deg, var(--yellow), rgba(255,200,67,0.2));
  border-radius: 0 2px 2px 0;
  transition: width 0.9s linear, background 0.3s;
}

.fixProgressFillUrgent {
  background: linear-gradient(90deg, var(--red), rgba(255,68,68,0.2));
}

/* ── Body ── */
.fixBody {
  padding: 28px 56px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  overflow-y: auto;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,200,67,0.04) 0%, transparent 60%);
}

/* ── Prompt label ── */
.fixPromptLabel {
  font-family: var(--font-mono), monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text);
  text-transform: uppercase;
  opacity: 0.6;
}

.fixPromptRevealed {
  color: var(--green);
  opacity: 1;
}

/* ── Error type label ── */
.fixErrorLabel {
  font-family: var(--font-mono), monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
  text-align: center;
}

.fixErrorName {
  color: var(--yellow);
  font-weight: 700;
}

/* ── Sentence card ── */
.fixSentenceCard {
  background: #0d1424;
  border: 1.5px solid rgba(255,200,67,0.2);
  border-radius: 12px;
  padding: 22px 32px;
  max-width: 760px;
  width: 100%;
  text-align: center;
  position: relative;
}

.fixSentenceCard::before,
.fixSentenceCard::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: rgba(255,200,67,0.3);
  border-style: solid;
}

.fixSentenceCard::before { top: 8px; left: 8px; border-width: 1.5px 0 0 1.5px; }
.fixSentenceCard::after  { bottom: 8px; right: 8px; border-width: 0 1.5px 1.5px 0; }

.fixSentenceText {
  font-family: 'Syne', var(--font-main), sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.5;
}

.fixWrongWord {
  color: var(--red);
  text-decoration: underline;
  text-decoration-color: rgba(255,68,68,0.5);
  font-weight: 800;
}

/* ── Option tiles (Easy mode) ── */
.fixOptsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
  max-width: 760px;
}

.fixOptTile {
  height: 72px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
  background: #0d1424;
  border: 1.5px solid rgba(255,200,67,0.2);
  position: relative;
  overflow: hidden;
}

.fixOptTile::before,
.fixOptTile::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: rgba(255,200,67,0.25);
  border-style: solid;
}

.fixOptTile::before { top: 6px; left: 6px; border-width: 1px 0 0 1px; }
.fixOptTile::after  { bottom: 6px; right: 6px; border-width: 0 1px 1px 0; }

.fixOptTileCorrect {
  background: #061610;
  border-color: var(--green);
}

.fixOptTileDimmed {
  opacity: 0.18;
  border-color: var(--border);
}

.fixOptLetter {
  font-family: var(--font-mono), monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--yellow);
  background: rgba(255,200,67,0.1);
  border: 1px solid rgba(255,200,67,0.25);
  border-radius: 4px;
  padding: 2px 8px;
  flex-shrink: 0;
  letter-spacing: 0.06em;
}

.fixOptTileCorrect .fixOptLetter {
  color: var(--green);
  background: rgba(0,232,122,0.1);
  border-color: rgba(0,232,122,0.3);
}

.fixOptText {
  font-family: 'Syne', var(--font-main), sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: 0.04em;
}

.fixOptTileCorrect .fixOptText { color: var(--green); }

/* ── Hard mode hint card ── */
.fixHintCard {
  background: #0d1424;
  border: 1.5px solid rgba(255,200,67,0.15);
  border-radius: 10px;
  padding: 16px 24px;
  max-width: 760px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: fadeSlideIn 0.3s ease;
}

.fixHintLabel {
  font-family: var(--font-mono), monospace;
  font-size: 11px;
  color: var(--yellow);
  opacity: 0.6;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.fixHintText {
  font-family: 'Syne', var(--font-main), sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

/* ── Reveal block (before/after) ── */
.fixRevealBlock {
  background: #0d1424;
  border: 1.5px solid rgba(255,200,67,0.15);
  border-radius: 12px;
  padding: 20px 28px;
  max-width: 760px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fadeSlideIn 0.35s ease;
}

.fixRevealRow {
  display: flex;
  align-items: center;
  gap: 14px;
}

.fixRevealIcon { font-size: 20px; flex-shrink: 0; }

.fixRevealSentence {
  font-family: 'Syne', var(--font-main), sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.4;
}

.fixRevealStrike {
  text-decoration: line-through;
  color: var(--red);
  opacity: 0.7;
}

.fixRevealHighlight {
  color: var(--green);
  font-weight: 800;
}

.fixRevealDivider {
  height: 1px;
  background: var(--border);
}

/* ── Team chips ── */
.fixTeamsRow {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.fixChip {
  font-family: var(--font-mono), monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  border-radius: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border2);
  color: var(--muted);
}

.fixChipLocked {
  border-color: rgba(255,200,67,0.4);
  color: var(--yellow);
  background: rgba(255,200,67,0.08);
}

.fixChipCorrect {
  border-color: rgba(0,232,122,0.4);
  color: var(--green);
  background: rgba(0,232,122,0.08);
}

.fixChipWrong {
  border-color: rgba(255,68,68,0.3);
  color: var(--red);
  background: rgba(255,68,68,0.06);
}

/* ── Action buttons ── */
.fixActionsRow {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.fixBtnReveal {
  background: var(--yellow);
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 13px 40px;
  font-family: var(--font-mono), monospace;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(255,200,67,0.25);
  transition: filter 0.15s;
}

.fixBtnReveal:hover { filter: brightness(1.08); }

.fixBtnHint {
  background: transparent;
  border: 1px dashed rgba(255,200,67,0.35);
  color: var(--yellow);
  border-radius: 8px;
  padding: 12px 20px;
  font-family: var(--font-mono), monospace;
  font-size: 13px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 0.15s;
}

.fixBtnHint:hover { background: rgba(255,200,67,0.07); }

.fixBtnNext {
  background: transparent;
  border: 1px solid rgba(255,200,67,0.3);
  color: var(--yellow);
  border-radius: 8px;
  padding: 13px 36px;
  font-family: var(--font-mono), monospace;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 0.15s;
}

.fixBtnNext:hover { background: rgba(255,200,67,0.07); }

.fixBtnNewGame {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 8px;
  padding: 12px 18px;
  font-family: var(--font-mono), monospace;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.fixBtnNewGame:hover { border-color: var(--border2); }
```

- [ ] **Step 2: Verify file saved without syntax errors**

Run: `npx --prefix "/c/Users/ROG Michael/Code/Class Engine/.claude/worktrees/objective-babbage" stylelint app/fix-it/fix.module.css --allow-empty-input 2>&1 | head -20`

If stylelint not available, just verify the file has no obvious unclosed braces by checking its line count:
```bash
wc -l "app/fix-it/fix.module.css"
```
Expected: roughly 1120+ lines (original 886 + ~230 new)

- [ ] **Step 3: Commit**

```bash
git add app/fix-it/fix.module.css
git commit -m "style(fix-it): append new single-column playing layout CSS classes"
```

---

### Task 2: Update `page.tsx` — component, derivations, and new JSX

**Files:**
- Modify: `app/fix-it/page.tsx`

- [ ] **Step 1: Add `wrongWordClass` prop to `HighlightedSentence` (lines 25–37)**

Replace:
```tsx
function HighlightedSentence({ sentence, wrongWord }: { sentence: string; wrongWord: string }) {
  const regex = new RegExp(`(\\b${wrongWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i");
  const parts = sentence.split(regex);
  return (
    <span className={styles.sentence}>
      {parts.map((part, i) =>
        regex.test(part)
          ? <span key={i} className={styles.wrongWord}>{part}</span>
          : part
      )}
    </span>
  );
}
```

With:
```tsx
function HighlightedSentence({ sentence, wrongWord, wrongWordClass }: { sentence: string; wrongWord: string; wrongWordClass?: string }) {
  const regex = new RegExp(`(\\b${wrongWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i");
  const parts = sentence.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part)
          ? <span key={i} className={wrongWordClass ?? styles.wrongWord}>{part}</span>
          : part
      )}
    </span>
  );
}
```

- [ ] **Step 2: Add timer derivations after line 247**

Current lines 246–248:
```tsx
  // ── Timer helpers ─────────────────────────────────────
  const timerPct = timerDur > 0 ? (timeLeft / timerDur) * 100 : 100;
  const timerUrgent = timeLeft <= 5 && timerDur > 0 && timerActive;
```

Replace with:
```tsx
  // ── Timer helpers ─────────────────────────────────────
  const timerPct = timerDur > 0 ? (timeLeft / timerDur) * 100 : 100;
  const timerUrgent = timeLeft <= 5 && timerDur > 0 && timerActive;

  // New layout timer derivations
  const TIMER_CIRC = 125.66;
  const dashOffset = timerDur > 0 ? TIMER_CIRC * (1 - timeLeft / timerDur) : 0;
  const timerMid = timeLeft <= 20 && timeLeft > 10 && timerDur > 0;
  const timerUrgentRing = timeLeft <= 10 && timerDur > 0;
```

- [ ] **Step 3: Replace the old `<div className={styles.page}>` block (lines 390–606)**

Find and replace the entire block starting at:
```tsx
      {/* ── Three-zone game layout ── */}
      <div className={styles.page}>
```
...through the closing `</div>` at line 606, with:

```tsx
      {/* ── New single-column layout ── */}
      <div className={styles.pageNew}>

        {/* Row 1: Header */}
        <div className={styles.fixHeader}>
          <span className={styles.fixTitle}>FIX IT</span>
          <div className={styles.fixHeaderDiv} />
          <span className={styles.fixQSeq}>
            QUESTION_{String(qIndex + 1).padStart(2, "0")}
          </span>
          <span className={styles.fixLevelBadge}>{level.toUpperCase()}</span>
          {timerDur > 0 && (
            <div className={styles.fixTimerWrap}>
              <svg className={styles.fixTimerSvg} viewBox="0 0 48 48">
                <defs>
                  <linearGradient id="fixGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffc843" />
                    <stop offset="100%" stopColor="rgba(255,200,67,0.3)" />
                  </linearGradient>
                </defs>
                <circle className={styles.fixTimerTrack} cx="24" cy="24" r="20" />
                <circle
                  className={`${styles.fixTimerRing}${timerUrgentRing ? ` ${styles.fixTimerRingUrgent}` : ""}`}
                  cx="24" cy="24" r="20"
                  stroke={timerUrgentRing ? "#ff4444" : "url(#fixGrad)"}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className={`${styles.fixTimerNum}${timerUrgentRing ? ` ${styles.fixTimerNumUrgent}` : ""}`}>
                {timeLeft}
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Progress bar */}
        <div className={styles.fixProgressBar}>
          <div
            className={`${styles.fixProgressFill}${timerUrgentRing ? ` ${styles.fixProgressFillUrgent}` : ""}`}
            style={{ width: timerDur > 0 ? `${(timeLeft / timerDur) * 100}%` : "100%" }}
          />
        </div>

        {/* Row 3: Body */}
        <div className={styles.fixBody}>

          {/* ── PLAYING + REVEALED ── */}
          {(phase === "PLAYING" || phase === "REVEALED") && currentQ && (
            <>
              {/* Prompt label */}
              <div className={`${styles.fixPromptLabel}${phase === "REVEALED" ? ` ${styles.fixPromptRevealed}` : ""}`}>
                {phase === "PLAYING" ? "Find and fix the error" : "Answer Revealed"}
              </div>

              {/* Sentence card */}
              <div>
                <div className={styles.fixErrorLabel}>
                  Error type: <span className={styles.fixErrorName}>{currentQ.errorType}</span>
                </div>
                <div className={styles.fixSentenceCard}>
                  <span className={styles.fixSentenceText}>
                    <HighlightedSentence
                      sentence={currentQ.sentence}
                      wrongWord={currentQ.wrongWord}
                      wrongWordClass={styles.fixWrongWord}
                    />
                  </span>
                </div>
              </div>

              {/* ── PLAYING controls ── */}
              {phase === "PLAYING" && (
                <>
                  {/* Easy: 4 option tiles */}
                  {mode === "Easy" && (
                    <div className={styles.fixOptsGrid}>
                      {currentQ.options.map((opt, i) => (
                        <div key={opt} className={styles.fixOptTile}>
                          <span className={styles.fixOptLetter}>{LETTER[i]}</span>
                          <span className={styles.fixOptText}>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hard: hint card when deployed */}
                  {mode === "Hard" && showHint && (
                    <div className={styles.fixHintCard}>
                      <div className={styles.fixHintLabel}>💡 HINT</div>
                      <div className={styles.fixHintText}>{currentQ.hint}</div>
                    </div>
                  )}

                  {/* Team chips — locked-in state */}
                  {currentTeams.length > 0 && (
                    <div className={styles.fixTeamsRow}>
                      {currentTeams.map(team => {
                        const locked = roomStudents.some(
                          s => s.answered && team.students.some(ts => ts.name === s.name)
                        );
                        return (
                          <div
                            key={team.id}
                            className={`${styles.fixChip}${locked ? ` ${styles.fixChipLocked}` : ""}`}
                          >
                            {locked ? "🔒 " : "· "}{team.name.toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className={styles.fixActionsRow}>
                    <button className={styles.fixBtnReveal} onClick={handleReveal}>
                      ✦ REVEAL ANSWER
                    </button>
                    {!showHint && (
                      <button className={styles.fixBtnHint} onClick={() => setShowHint(true)}>
                        💡 DEPLOY HINT
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ── REVEALED controls ── */}
              {phase === "REVEALED" && (
                <>
                  {/* Easy: correct/wrong tile states */}
                  {mode === "Easy" && (
                    <div className={styles.fixOptsGrid}>
                      {currentQ.options.map((opt, i) => {
                        const isCorrect = opt.trim().toLowerCase() === currentQ.correctWord.toLowerCase();
                        return (
                          <div
                            key={opt}
                            className={`${styles.fixOptTile}${isCorrect ? ` ${styles.fixOptTileCorrect}` : ` ${styles.fixOptTileDimmed}`}`}
                          >
                            <span className={styles.fixOptLetter}>{LETTER[i]}</span>
                            <span className={styles.fixOptText}>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Before/after reveal block */}
                  <div className={styles.fixRevealBlock}>
                    <div className={styles.fixRevealRow}>
                      <span className={styles.fixRevealIcon}>❌</span>
                      <span className={styles.fixRevealSentence}>
                        {currentQ.sentence
                          .split(new RegExp(`(\\b${currentQ.wrongWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i"))
                          .map((part, i, arr) =>
                            arr.length > 1 && i === 1
                              ? <span key={i} className={styles.fixRevealStrike}>{part}</span>
                              : part
                          )}
                      </span>
                    </div>
                    <div className={styles.fixRevealDivider} />
                    <div className={styles.fixRevealRow}>
                      <span className={styles.fixRevealIcon}>✅</span>
                      <span className={styles.fixRevealSentence}>
                        {currentQ.sentence
                          .split(new RegExp(`(\\b${currentQ.wrongWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i"))
                          .map((part, i, arr) =>
                            arr.length > 1 && i === 1
                              ? <span key={i} className={styles.fixRevealHighlight}>{currentQ.correctWord}</span>
                              : part
                          )}
                      </span>
                    </div>
                  </div>

                  {/* Team chips — correct/wrong state */}
                  {currentTeams.length > 0 && (
                    <div className={styles.fixTeamsRow}>
                      {currentTeams.map(team => {
                        const teamStudents = roomStudents.filter(s =>
                          team.students.some(ts => ts.name === s.name)
                        );
                        const anyAnswered = teamStudents.some(s => s.answered);
                        const anyCorrect = teamStudents.some(
                          s => s.answered && s.lastAnswer?.trim().toLowerCase() === currentQ.correctWord.toLowerCase()
                        );
                        const pts = anyCorrect
                          ? Object.entries(pointsAwarded)
                              .filter(([name]) => team.students.some(ts => ts.name === name))
                              .reduce((sum, [, p]) => sum + p, 0)
                          : 0;

                        if (!anyAnswered) {
                          return <div key={team.id} className={styles.fixChip}>· {team.name.toUpperCase()}</div>;
                        }
                        if (anyCorrect) {
                          return (
                            <div key={team.id} className={`${styles.fixChip} ${styles.fixChipCorrect}`}>
                              ✓ {team.name.toUpperCase()}{pts > 0 ? ` +${pts}` : ""}
                            </div>
                          );
                        }
                        return (
                          <div key={team.id} className={`${styles.fixChip} ${styles.fixChipWrong}`}>
                            ✗ {team.name.toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className={styles.fixActionsRow}>
                    <button className={styles.fixBtnNext} onClick={handleNext}>
                      {qIndex + 1 >= questions.length ? "⟳ NEW GAME" : "→ NEXT QUESTION"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── FINISHED ── */}
          {phase === "FINISHED" && (
            <div className={styles.finishedScreen}>
              <div className={styles.finishedEmoji}>🏁</div>
              <div className={styles.finishedTitle}>Round Complete!</div>
              <div className={styles.finishedSub}>{questions.length} questions · {mode} mode</div>
              <button
                className={styles.btnPlayAgain}
                onClick={() => {
                  setPhase("SETUP");
                  setQuestions([]);
                  setQIndex(0);
                  setTopic("");
                }}
              >
                Play Again
              </button>
            </div>
          )}

        </div>
      </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/c/Users/ROG Michael/Code/Class Engine/.claude/worktrees/objective-babbage" && npx tsc --noEmit 2>&1 | grep "fix-it" | head -20
```

Expected: no output (no errors in fix-it files)

- [ ] **Step 5: Verify dev server starts**

```bash
cd "/c/Users/ROG Michael/Code/Class Engine" && npm run dev 2>&1 | head -30
```

Expected: `✓ Ready in` within 30 seconds, no compilation errors about fix-it

- [ ] **Step 6: Visual check — PLAYING phase (Easy mode)**

Navigate to `http://localhost:3000/fix-it`. Click through SETUP → generate questions → launch.

Verify:
- Header has "FIX IT" in yellow, question counter, level badge, circular SVG timer (not a number box)
- Yellow gradient progress bar below header
- Body shows "FIND AND FIX THE ERROR" label (muted)
- Sentence card has yellow border + corner reticles, wrong word in red
- 2×2 grid of option tiles with yellow letter badges (A/B/C/D) and corner reticles
- Team chips row (if teams exist) in muted state
- "✦ REVEAL ANSWER" yellow fill button + "💡 DEPLOY HINT" dashed button

- [ ] **Step 7: Visual check — timer urgency**

Wait for timer to reach ≤10s. Verify:
- Timer ring switches from yellow gradient to solid red with pulse animation
- Timer number turns red and pulses
- Progress bar fill turns red

- [ ] **Step 8: Visual check — REVEALED phase**

Click "✦ REVEAL ANSWER". Verify:
- Prompt changes to "ANSWER REVEALED" in green
- Sentence card still visible (with wrong word red)
- Easy mode: correct tile turns green, others fade to 18% opacity
- Reveal block appears: ❌ strikethrough row, divider, ✅ correct word green
- Team chips show ✓/✗ state with point deltas
- "→ NEXT QUESTION" button (or "⟳ NEW GAME" on last question)

- [ ] **Step 9: Visual check — Hard mode**

Back to SETUP, switch to Hard mode, generate + launch. Verify:
- No option tiles shown in PLAYING
- "💡 DEPLOY HINT" button present
- Clicking hint shows hint card (yellow-bordered, hint text)
- REVEALED phase shows reveal block (no option tiles)

- [ ] **Step 10: Commit**

```bash
git add app/fix-it/page.tsx
git commit -m "feat(fix-it): redesign projector playing/revealed views with yellow identity layout

Single-column layout matching OOO pattern: circular SVG timer, progress bar,
sentence card with corner reticles, option tiles (easy mode), hint card (hard mode),
before/after reveal block, team chip states. All game logic untouched.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
