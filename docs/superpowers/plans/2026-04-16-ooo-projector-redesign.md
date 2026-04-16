# OOO Projector Playing View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-column sidebar layout of the OOO projector PLAYING view with a clean single-column centered layout featuring a compact animated circular countdown timer, clear word tiles with corner reticles, inline team status chips, and proper pre/post-reveal states.

**Architecture:** Two-step change — CSS first, then JSX. All new CSS classes are appended to `odd.module.css` (existing classes are left untouched). The PLAYING phase JSX block in `page.tsx` is replaced wholesale while all game logic (timer, scoring, reveal, room sync) stays identical.

**Tech Stack:** Next.js 14 App Router, TypeScript, CSS Modules, SVG (inline, for circular timer)

---

## File Map

| File | Change |
|------|--------|
| `app/odd-one-out/odd.module.css` | **Append** ~120 lines of new CSS classes at end of file |
| `app/odd-one-out/page.tsx` | Add 4 computed timer constants after line 309; replace PLAYING phase JSX (lines 425–603) |

---

### Task 1: Add CSS classes for the redesigned playing view

**Files:**
- Modify: `app/odd-one-out/odd.module.css` (append at end)

- [ ] **Step 1: Append all new CSS classes**

Open `app/odd-one-out/odd.module.css` and append the following block at the very end of the file:

```css
/* ══ PLAYING VIEW REDESIGN (2026-04-16) ══════════════════════════════════
   All classes below are used by the redesigned PLAYING phase.
   Old classes above are kept for reference but are no longer rendered.
   ═══════════════════════════════════════════════════════════════════════ */

/* Page shell — 3-row grid: header | progress bar | body */
.pageNew {
  position: fixed;
  top: var(--nav-h, 60px);
  left: 0; right: 0;
  bottom: var(--scoreboard-h, 88px);
  display: grid;
  grid-template-rows: 62px 3px 1fr;
  overflow: hidden;
  background: var(--bg, #07090f);
}

/* ── Header: sequence label + level badge ── */
.seqText {
  font-size: 12px;
  color: var(--muted, #4a637d);
  letter-spacing: 0.06em;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
}
.levelBadge {
  font-size: 11px;
  background: rgba(176, 110, 255, 0.1);
  color: var(--purple, #b06eff);
  border: 1px solid rgba(176, 110, 255, 0.2);
  border-radius: 20px;
  padding: 2px 10px;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0.06em;
}

/* ── Compact circular timer (48×48 SVG ring in header) ── */
.timerCircleWrap {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  margin-left: auto;
}
.timerSvg {
  width: 48px;
  height: 48px;
  transform: rotate(-90deg);
}
.timerTrack {
  fill: none;
  stroke: var(--border, #1c2a40);
  stroke-width: 3.5;
}
.timerRing {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dasharray: 125.66;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.9s linear;
}
.timerRingUrgent {
  animation: ringUrgentPulse 0.6s ease-in-out infinite alternate;
}
@keyframes ringUrgentPulse {
  from { opacity: 1; }
  to   { opacity: 0.4; }
}
.timerCircleNum {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--purple, #b06eff);
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0;
}
.timerCircleNumMid    { color: var(--yellow, #ffc843); }
.timerCircleNumUrgent {
  color: var(--red, #ff4444);
  animation: ringUrgentPulse 0.6s ease-in-out infinite alternate;
}

/* ── Thin progress bar (row 2 in grid) ── */
.progressBar { height: 3px; background: var(--surface2, #131b2b); }
.progressFill {
  height: 3px;
  background: linear-gradient(90deg, var(--purple, #b06eff), rgba(176, 110, 255, 0.2));
  border-radius: 0 2px 2px 0;
  transition: width 0.9s linear, background 0.3s;
}
.progressFillMid    { background: linear-gradient(90deg, var(--purple, #b06eff), var(--yellow, #ffc843)); }
.progressFillUrgent { background: linear-gradient(90deg, var(--red, #ff4444), rgba(255, 68, 68, 0.25)); }

/* ── Game body — single centered column ── */
.gameBody {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 28px 56px 32px;
  overflow-y: auto;
  background: radial-gradient(ellipse at 50% 0%, rgba(176, 110, 255, 0.05) 0%, transparent 60%);
}

/* ── Prompt label ── */
.promptLabel {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text, #dce8f5);
  text-transform: uppercase;
  opacity: 0.6;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
}
.promptRevealed {
  color: var(--green, #00e87a);
  opacity: 1;
}

/* ── Word tiles (2×2 grid) ── */
.wordGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  max-width: 760px;
}
.wordTile {
  height: 120px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 800;
  color: var(--text, #dce8f5);
  letter-spacing: 0.06em;
  font-family: var(--font-syne), sans-serif;
  background: #0d1424;
  border: 1.5px solid rgba(176, 110, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(176, 110, 255, 0.08);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  user-select: none;
}
/* Corner reticles */
.wordTile::before,
.wordTile::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: rgba(176, 110, 255, 0.3);
  border-style: solid;
}
.wordTile::before { top: 8px; left: 8px; border-width: 1.5px 0 0 1.5px; }
.wordTile::after  { bottom: 8px; right: 8px; border-width: 0 1.5px 1.5px 0; }
.wordTile:hover:not(.wordTileCorrect):not(.wordTileDimmed) {
  border-color: rgba(176, 110, 255, 0.65);
}
/* Correct answer — green glow */
.wordTileCorrect {
  background: #061610;
  border-color: var(--green, #00e87a);
  color: var(--green, #00e87a);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5),
              0 0 40px rgba(0, 232, 122, 0.15),
              inset 0 1px 0 rgba(0, 232, 122, 0.1);
  cursor: default;
}
.wordTileCorrect::before,
.wordTileCorrect::after { border-color: rgba(0, 232, 122, 0.4); }
/* Dimmed (wrong answers after reveal) */
.wordTileDimmed {
  opacity: 0.18;
  box-shadow: none;
  border-color: var(--border, #1c2a40);
  cursor: default;
}

/* ── Hint / Explain card ── */
.explainCard {
  background: var(--surface, #0e1420);
  border: 1px solid rgba(176, 110, 255, 0.15);
  border-radius: 10px;
  padding: 14px 28px;
  max-width: 640px;
  width: 100%;
  text-align: center;
  font-size: 14px;
  color: var(--muted, #4a637d);
  line-height: 1.6;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0.02em;
}
.explainHint  { border-color: rgba(255, 200, 67, 0.2); color: #8899aa; }
.explainAnswer { color: var(--purple, #b06eff); font-weight: 700; }
.scorePop      { color: var(--green, #00e87a); font-weight: 700; }

/* ── Team status chips row ── */
.teamsRow {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.teamChip {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  border-radius: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border2, #243347);
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  background: transparent;
  color: var(--muted, #4a637d);
}
.teamChipCorrect {
  background: rgba(0, 232, 122, 0.08);
  border-color: rgba(0, 232, 122, 0.4);
  color: var(--green, #00e87a);
}
.teamChipWrong {
  background: rgba(255, 68, 68, 0.06);
  border-color: rgba(255, 68, 68, 0.3);
  color: var(--red, #ff4444);
}

/* ── Action buttons ── */
.actionsRow { display: flex; gap: 12px; margin-top: 4px; }
.btnReveal {
  background: var(--purple, #b06eff);
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 13px 40px;
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0.1em;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(176, 110, 255, 0.3);
  transition: opacity 0.15s;
}
.btnReveal:hover { opacity: 0.88; }
.btnHint {
  background: transparent;
  border: 1px dashed rgba(176, 110, 255, 0.35);
  color: var(--purple, #b06eff);
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 13px;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btnHint:disabled { opacity: 0.35; cursor: default; }
.btnNextSeq {
  background: transparent;
  border: 1px solid rgba(176, 110, 255, 0.3);
  color: var(--purple, #b06eff);
  border-radius: 8px;
  padding: 13px 36px;
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0.1em;
  cursor: pointer;
}
.btnNextSeq:disabled { opacity: 0.35; cursor: default; }
.btnNewGame {
  background: transparent;
  border: 1px solid var(--border, #1c2a40);
  color: var(--muted, #4a637d);
  border-radius: 8px;
  padding: 12px 18px;
  font-size: 12px;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  cursor: pointer;
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: 0 errors (CSS modules don't affect TypeScript)

- [ ] **Step 3: Commit**

```bash
git add app/odd-one-out/odd.module.css
git commit -m "style(ooo): add redesigned playing view CSS classes"
```

---

### Task 2: Replace PLAYING phase JSX in page.tsx

**Files:**
- Modify: `app/odd-one-out/page.tsx` (lines 307–310 and 425–603)

- [ ] **Step 1: Add timer derivations after existing timer constants**

Locate this block (currently lines 307–309):
```tsx
const timerDur = timerDuration;
const timerPct = timerDur > 0 ? (timeLeft / timerDur) * 100 : 100;
const timerUrgent = timeLeft <= 5 && timerDur > 0 && timerActive;
```

Add three lines immediately after it:
```tsx
const TIMER_CIRC = 125.66; // 2π × r(20)
const dashOffset = timerDur > 0 ? TIMER_CIRC * (1 - timeLeft / timerDur) : 0;
const timerMid = timeLeft <= 20 && timeLeft > 10 && timerDur > 0;
const timerUrgentRing = timeLeft <= 10 && timerDur > 0;
```

- [ ] **Step 2: Replace the PLAYING phase JSX block**

Find and replace the entire PLAYING phase block. It starts with:
```tsx
      {/* Game view */}
      {phase === "PLAYING" && questions && (
```
and ends at the closing `)}` before the final `</>` and `);` of the return statement.

Replace it with:

```tsx
      {/* ── PLAYING view ── */}
      {phase === "PLAYING" && questions && (
        <div className={styles.pageNew}>

          {/* Header */}
          <div className={styles.gameHeader}>
            <span className={styles.gameTitle}>ODD ONE OUT</span>
            <div className={styles.headerDivider} />
            <span className={styles.seqText}>SEQUENCE_0{currentIndex + 1}</span>
            <span className={styles.levelBadge}>{currentQ?.level.toUpperCase()}</span>
            {timerDur > 0 && (
              <div className={styles.timerCircleWrap}>
                <svg className={styles.timerSvg} viewBox="0 0 48 48">
                  <defs>
                    <linearGradient id="timerGradOoo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#b06eff" />
                      <stop offset="100%" stopColor="#ffc843" />
                    </linearGradient>
                  </defs>
                  <circle className={styles.timerTrack} cx="24" cy="24" r="20" />
                  <circle
                    className={`${styles.timerRing}${timerUrgentRing ? ` ${styles.timerRingUrgent}` : ''}`}
                    cx="24" cy="24" r="20"
                    stroke={timerUrgentRing ? '#ff4444' : timerMid ? '#ffc843' : 'url(#timerGradOoo)'}
                    style={{ strokeDashoffset: dashOffset }}
                  />
                </svg>
                <div className={`${styles.timerCircleNum}${timerUrgentRing ? ` ${styles.timerCircleNumUrgent}` : timerMid ? ` ${styles.timerCircleNumMid}` : ''}`}>
                  {timeLeft}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill}${timerUrgentRing ? ` ${styles.progressFillUrgent}` : timerMid ? ` ${styles.progressFillMid}` : ''}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>

          {/* Body — single centered column */}
          <div className={styles.gameBody}>

            {/* Prompt */}
            <div className={`${styles.promptLabel}${showAnswer ? ` ${styles.promptRevealed}` : ''}`}>
              {showAnswer ? 'ANSWER REVEALED' : "PICK THE WORD THAT DOESN'T BELONG"}
            </div>

            {/* Word tiles */}
            <div className={styles.wordGrid}>
              {currentQ?.words.map((w, i) => {
                const isCorrect = w === currentQ.answer;
                const tileClass = showAnswer
                  ? isCorrect
                    ? `${styles.wordTile} ${styles.wordTileCorrect}`
                    : `${styles.wordTile} ${styles.wordTileDimmed}`
                  : styles.wordTile;
                return (
                  <div
                    key={i}
                    className={tileClass}
                    onClick={() => {
                      if (showAnswer) return;
                      setSelectedWord(w);
                      if (w === currentQ.answer) handleReveal();
                    }}
                  >
                    {w}{showAnswer && isCorrect ? ' ◆' : ''}
                  </div>
                );
              })}
            </div>

            {/* Hint card — shown before reveal when hint deployed */}
            {showHint && !showAnswer && currentQ?.hint && (
              <div className={`${styles.explainCard} ${styles.explainHint}`}>
                💡 {currentQ.hint}
              </div>
            )}

            {/* Explanation card — shown after reveal */}
            {showAnswer && currentQ && (
              <div className={styles.explainCard}>
                <strong className={styles.explainAnswer}>{currentQ.answer}</strong>
                {currentQ.hint ? ` — ${currentQ.hint}` : ''}
              </div>
            )}

            {/* Team status chips — only when a room is active and students are connected */}
            {currentTeams.length > 0 && roomStudents.length > 0 && (
              <div className={styles.teamsRow}>
                {currentTeams.map((team, idx) => {
                  const TEAM_COLORS = ['#00e87a','#00c8f0','#ffc843','#ff4d8f','#b06eff','#ff7d3b','#e2e8f0'];
                  const teamColor = TEAM_COLORS[idx % 7];
                  const members = roomStudents.filter(s =>
                    team.students.some((ts: any) => ts.name === s.name)
                  );
                  if (members.length === 0) return null;

                  const locked = !showAnswer && members.some(s => s.answered);
                  const anyCorrect = showAnswer && members.some(s => currentQ && s.lastAnswer === currentQ.answer);
                  const anyWrong = showAnswer && members.some(s => s.answered) && !anyCorrect;

                  const teamPts = showAnswer
                    ? Object.entries(pointsEarned)
                        .filter(([id]) => members.some(s => s.id === id))
                        .reduce((sum, [, p]) => sum + (p as number), 0)
                    : 0;

                  const chipClass = [
                    styles.teamChip,
                    anyCorrect ? styles.teamChipCorrect : '',
                    anyWrong   ? styles.teamChipWrong   : '',
                  ].filter(Boolean).join(' ');

                  const chipStyle = locked
                    ? { borderColor: teamColor, color: teamColor, backgroundColor: teamColor + '15' }
                    : {};

                  const prefix = anyCorrect ? '✓ ' : anyWrong ? '✗ ' : (showAnswer && !members.some(s => s.answered)) ? '— ' : locked ? '🔒 ' : '· ';

                  return (
                    <div key={team.id} className={chipClass} style={chipStyle}>
                      {prefix}{team.name.toUpperCase()}
                      {showAnswer && teamPts > 0 && <span className={styles.scorePop}> +{teamPts}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            <div className={styles.actionsRow}>
              {!showAnswer ? (
                <>
                  <button className={styles.btnReveal} onClick={handleReveal}>
                    ✦ INITIATE REVEAL
                  </button>
                  <button
                    className={styles.btnHint}
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                  >
                    💡 DEPLOY HINT
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={styles.btnNextSeq}
                    onClick={nextQuestion}
                    disabled={currentIndex === questions.length - 1}
                  >
                    NEXT SEQUENCE →
                  </button>
                  <button
                    className={styles.btnNewGame}
                    onClick={() => {
                      setPhase("SETUP");
                      setQuestions(null);
                      setCurrentIndex(0);
                      setShowAnswer(false);
                      setSelectedWord(null);
                      setShowHint(false);
                      setPointsEarned({});
                    }}
                  >
                    ← NEW GAME
                  </button>
                </>
              )}
            </div>

          </div>{/* /gameBody */}
        </div>
      )}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 errors. If `p as number` on `pointsEarned` causes an error, check the type of `pointsEarned` — it's `Record<string, number>` so the cast is redundant and can be removed.

- [ ] **Step 4: Start dev server and visually verify all 4 states**

```bash
npm run dev
```

Open `http://localhost:3000/odd-one-out` and verify:

1. **SETUP phase** — unchanged, still works
2. **PLAYING, timer normal (>20s)** — single centered column, circular ring in purple/gold gradient, word tiles with corner reticles, prompt says "PICK THE WORD THAT DOESN'T BELONG"
3. **PLAYING, timer urgent (≤10s)** — ring turns red and pulses, number turns red, thin bar under header turns red
4. **POST-REVEAL** — correct tile green with ◆, others dimmed to 18% opacity, explanation card, prompt says "ANSWER REVEALED" in green, NEXT SEQUENCE → button

If no room is active, team chips don't appear (correct — `roomStudents.length === 0`).

- [ ] **Step 5: Commit**

```bash
git add app/odd-one-out/page.tsx
git commit -m "feat(ooo): redesign projector playing view — circular timer, centered layout, inline team chips"
```
