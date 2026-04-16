# Rapid Fire Projector Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Rapid Fire's two-column SYSTEM_LOG projector layout with a single-column layout using pink (#ff4d8f) identity, SVG circular timer, MC speed ranking, and buzzer sequential unlock.

**Architecture:** Two files touched — append new `rf`-prefixed CSS classes to the existing `rapid-fire.module.css`, then replace the game view JSX block in `page.tsx` (lines 422–627). SETUP/LOADING/READY overlay and FINISHED screen stay unchanged. All game logic, API calls, scoring, and multiplayer state are preserved.

**Tech Stack:** Next.js 14, TypeScript, CSS Modules, JetBrains Mono + Syne fonts

---

## File Map

| File | Change |
|------|--------|
| `app/rapid-fire/rapid-fire.module.css` | Append ~180 lines of `rf`-prefixed classes after existing classes |
| `app/rapid-fire/page.tsx` | Add 2 state vars + 2 handlers + timer derivations; replace game view JSX block |

---

## Task 1: Append CSS classes to rapid-fire.module.css

**Files:**
- Modify: `app/rapid-fire/rapid-fire.module.css` (append after line 408)

- [ ] **Step 1: Append the new CSS block**

Open `app/rapid-fire/rapid-fire.module.css` and append the following at the very end of the file:

```css
/* ═══════════════════════════════════════════════════
   RAPID FIRE — New Single-Column Layout (rf prefix)
   ═══════════════════════════════════════════════════ */

.rfPage {
  position: fixed;
  top: var(--nav-h, 60px);
  left: 0; right: 0;
  bottom: var(--scoreboard-h, 88px);
  display: grid;
  grid-template-rows: 64px 1fr;
  overflow: hidden;
  background: var(--bg, #07090f);
}

/* ── Header ─────────────────────────── */
.rfHeader {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 40px;
  border-bottom: 1px solid var(--border, #1c2a40);
  background: var(--surface, #0e1420);
  flex-shrink: 0;
}

.rfTitle {
  font-family: 'Syne', sans-serif;
  font-size: 14px; font-weight: 800;
  letter-spacing: 0.12em; color: #ff4d8f; text-transform: uppercase;
  flex-shrink: 0;
}

.rfTimerWrap {
  position: relative;
  width: 44px; height: 44px; flex-shrink: 0;
}

.rfTimerSvg {
  width: 44px; height: 44px;
  transform: rotate(-90deg);
}

.rfTimerTrack {
  fill: none;
  stroke: var(--border2, #243347);
  stroke-width: 3;
}

.rfTimerRing {
  fill: none;
  stroke: url(#rfGrad);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 125.66;
  transition: stroke-dashoffset 0.9s linear, stroke 0.3s;
}

.rfTimerRingUrgent {
  stroke: #ff4444 !important;
  animation: rfUrgPulse 0.8s ease-in-out infinite alternate;
}

@keyframes rfUrgPulse {
  from { opacity: 1; }
  to   { opacity: 0.45; }
}

.rfTimerNum {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; font-weight: 700; color: var(--text, #dce8f5); line-height: 1;
}

.rfTimerNumUrgent { color: #ff4444; }

.rfProgressBarWrap {
  flex: 1; height: 3px;
  background: var(--border, #1c2a40);
  border-radius: 2px; overflow: hidden;
}

.rfProgressFill {
  height: 100%; background: #ff4d8f; border-radius: 2px;
  transition: width 0.9s linear, background 0.3s;
}

.rfProgressFillUrgent { background: #ff4444; }

.rfQCounter {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--muted, #4a637d);
  letter-spacing: 0.1em; flex-shrink: 0;
}

.rfQCounterNum { color: var(--text, #dce8f5); font-weight: 700; }

.rfHeaderRight {
  display: flex; align-items: center; gap: 10px; margin-left: auto;
}

/* ── Body ─────────────────────────── */
.rfBody {
  overflow-y: auto;
  padding: 24px 60px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Sentence card */
.rfSentenceCard {
  background: var(--surface, #0e1420);
  border: 1.5px solid rgba(255, 77, 143, 0.2);
  border-left: 4px solid #ff4d8f;
  border-radius: 12px;
  padding: 18px 24px;
}

.rfSentenceText {
  font-family: 'Syne', sans-serif;
  font-size: clamp(18px, 2.4vw, 26px);
  font-weight: 700; color: var(--text, #dce8f5); line-height: 1.4;
}

/* Answer reveal card */
.rfRevealCard {
  background: rgba(0, 232, 122, 0.06);
  border: 1.5px solid rgba(0, 232, 122, 0.3);
  border-radius: 10px;
  padding: 12px 20px;
  display: flex; align-items: center; gap: 16px;
}

.rfRevealLabel {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; color: var(--muted, #4a637d);
  letter-spacing: 0.12em; text-transform: uppercase; flex-shrink: 0;
}

.rfRevealAnswer {
  font-family: 'Syne', sans-serif;
  font-size: 22px; font-weight: 800; color: #00e87a;
}

/* MC options grid */
.rfOptsGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.rfOptTile {
  background: var(--surface, #0e1420);
  border: 1.5px solid var(--border2, #243347);
  border-radius: 10px;
  padding: 14px 18px;
  display: flex; align-items: center; gap: 12px;
  transition: border-color 0.2s, background 0.2s;
}

.rfOptTileCorrect {
  background: rgba(0, 232, 122, 0.06) !important;
  border-color: #00e87a !important;
}

.rfOptTileDimmed { opacity: 0.3; }

.rfOptLetter {
  font-family: 'Syne', sans-serif;
  font-size: 12px; font-weight: 800; color: #ff4d8f;
  background: rgba(255, 77, 143, 0.1);
  border: 1px solid rgba(255, 77, 143, 0.25);
  border-radius: 4px;
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.rfOptTileCorrect .rfOptLetter {
  color: #00e87a;
  background: rgba(0, 232, 122, 0.1);
  border-color: rgba(0, 232, 122, 0.3);
}

.rfOptText {
  font-family: 'Syne', sans-serif;
  font-size: 15px; font-weight: 700; color: var(--text, #dce8f5);
}

.rfOptTileCorrect .rfOptText { color: #00e87a; }

/* Team chips (MC PLAYING) */
.rfTeamChips {
  display: flex; gap: 8px; flex-wrap: wrap;
}

.rfChip {
  font-family: 'Syne', sans-serif;
  font-size: 11px; font-weight: 800;
  border-radius: 20px; padding: 4px 14px;
  border: 1.5px solid; transition: all 0.2s;
}

.rfChipWaiting {
  border-color: var(--border2, #243347);
  color: var(--muted, #4a637d); background: transparent;
}

/* Speed ranking (MC REVEALED) */
.rfSpeedRank {
  background: var(--surface, #0e1420);
  border: 1px solid var(--border2, #243347);
  border-top: 2px solid #ff4d8f;
  border-radius: 10px; overflow: hidden;
}

.rfSpeedRankTitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.15em; text-transform: uppercase; color: #ff4d8f;
  padding: 9px 16px 7px;
  border-bottom: 1px solid var(--border, #1c2a40);
}

.rfSpeedRow {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border, #1c2a40);
}

.rfSpeedRow:last-child { border-bottom: none; }

.rfSpeedMedal { font-size: 15px; width: 22px; text-align: center; flex-shrink: 0; }

.rfSpeedName {
  font-family: 'Syne', sans-serif;
  font-size: 14px; font-weight: 800; color: var(--text, #dce8f5); flex: 1;
}

.rfSpeedTime {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; color: var(--muted, #4a637d);
}

.rfSpeedPts {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; font-weight: 700; color: #00e87a;
  min-width: 52px; text-align: right;
}

.rfSpeedEmpty {
  padding: 14px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--muted, #4a637d); text-align: center;
}

/* Buzz queue (Buzzer mode) */
.rfBuzzQueue { display: flex; flex-direction: column; gap: 6px; }

.rfBuzzEmpty {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--muted, #4a637d); letter-spacing: 0.08em;
  padding: 20px; text-align: center;
  border: 1px dashed var(--border2, #243347); border-radius: 8px;
}

.rfBuzzEntry {
  border-radius: 8px; padding: 9px 13px;
  display: flex; align-items: center; gap: 12px; transition: all 0.2s;
}

.rfBuzzEntryActive {
  background: rgba(255, 77, 143, 0.08);
  border: 1.5px solid #ff4d8f;
}

.rfBuzzEntryWaiting {
  background: transparent;
  border: 1px solid var(--border, #1c2a40); opacity: 0.4;
}

.rfBuzzEntryCorrect {
  background: rgba(0, 232, 122, 0.06);
  border: 1px solid rgba(0, 232, 122, 0.3);
}

.rfBuzzEntryWrong {
  background: rgba(255, 68, 68, 0.05);
  border: 1px solid rgba(255, 68, 68, 0.2); opacity: 0.5;
}

.rfBuzzPos { font-size: 14px; flex-shrink: 0; width: 22px; text-align: center; }
.rfBuzzInfo { flex: 1; min-width: 0; }

.rfBuzzName {
  font-family: 'Syne', sans-serif;
  font-size: 14px; font-weight: 800;
}

.rfBuzzEntryActive .rfBuzzName   { color: #ff4d8f; }
.rfBuzzEntryCorrect .rfBuzzName  { color: #00e87a; }
.rfBuzzEntryWrong .rfBuzzName    { color: #ff4444; }
.rfBuzzEntryWaiting .rfBuzzName  { color: var(--muted, #4a637d); }

.rfBuzzTime {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; color: var(--muted, #4a637d);
}

.rfBuzzBtns { display: flex; gap: 6px; margin-left: auto; flex-shrink: 0; }

.rfBtnCorrect {
  background: rgba(0, 232, 122, 0.12);
  border: 1px solid rgba(0, 232, 122, 0.4);
  color: #00e87a; border-radius: 4px; padding: 4px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 700; cursor: pointer;
}

.rfBtnWrong {
  background: rgba(255, 68, 68, 0.08);
  border: 1px solid rgba(255, 68, 68, 0.3);
  color: #ff4444; border-radius: 4px; padding: 4px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 700; cursor: pointer;
}

.rfBuzzBadge {
  font-size: 10px; font-weight: 700; border-radius: 4px; padding: 2px 8px;
  margin-left: auto; flex-shrink: 0;
}

.rfBuzzBadgeCorrect { background: rgba(0,232,122,0.1); color: #00e87a; }
.rfBuzzBadgeWrong   { background: rgba(255,68,68,0.08); color: #ff4444; }

/* Actions row */
.rfActionsRow {
  display: flex; justify-content: center; gap: 12px; padding-top: 4px;
}

.rfBtnReveal {
  background: rgba(255, 77, 143, 0.1);
  border: 1px solid rgba(255, 77, 143, 0.4);
  color: #ff4d8f; border-radius: 8px; padding: 10px 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; font-weight: 700; cursor: pointer; letter-spacing: 0.05em;
}

.rfBtnNext {
  background: transparent;
  border: 1px solid rgba(255, 77, 143, 0.35);
  color: #ff4d8f; border-radius: 8px; padding: 10px 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; font-weight: 700; cursor: pointer; letter-spacing: 0.05em;
}

.rfBtnNext:hover { background: rgba(255, 77, 143, 0.08); }

.rfBtnNewGame {
  background: transparent;
  border: 1px solid var(--border2, #243347);
  color: var(--muted, #4a637d); border-radius: 8px; padding: 10px 18px;
  font-family: 'JetBrains Mono', monospace; font-size: 11px; cursor: pointer;
}
```

- [ ] **Step 2: Verify no syntax errors by checking the file compiles**

Run: `cd "app/rapid-fire" && npx tsc --noEmit 2>&1 | head -20` from the project root.
CSS modules don't need compilation — just confirm the file was appended correctly by checking its line count.

Run from project root:
```bash
wc -l app/rapid-fire/rapid-fire.module.css
```
Expected: ~590 lines (original 408 + ~180 new).

- [ ] **Step 3: Commit**

```bash
git add app/rapid-fire/rapid-fire.module.css
git commit -m "style(rapid-fire): add rf-prefixed single-column layout CSS classes"
```

---

## Task 2: Update page.tsx — state, handlers, and new game view JSX

**Files:**
- Modify: `app/rapid-fire/page.tsx`

This task makes four targeted changes to `page.tsx`:
1. Add two state variables after `showTimesUp` (line 47)
2. Add timer derivations after `const timerMax = timerDuration;` (line 192)
3. Add two buzzer handlers after `findTeamForName` (line 302)
4. Replace the game view block (lines 422–627) with new single-column layout

- [ ] **Step 1: Add buzzer state variables**

Find this line (currently line 47):
```tsx
const [showTimesUp, setShowTimesUp] = useState(false);
```

Add two lines immediately after it:
```tsx
const [buzzActiveIdx, setBuzzActiveIdx] = useState(0);
const [buzzResults, setBuzzResults] = useState<Record<number, 'correct' | 'wrong'>>({});
```

- [ ] **Step 2: Reset buzzer state in startGame**

Find this block inside `startGame` (after `setWrongSelections(new Set());`):
```tsx
setWrongSelections(new Set());
```

Add the resets on the next two lines:
```tsx
setBuzzActiveIdx(0);
setBuzzResults({});
```

- [ ] **Step 3: Reset buzzer state in nextQuestion**

Find this block inside `nextQuestion` (after `setWrongSelections(new Set());`):
```tsx
setWrongSelections(new Set());
```

Add the resets on the next two lines:
```tsx
setBuzzActiveIdx(0);
setBuzzResults({});
```

- [ ] **Step 4: Add timer derivations**

Find this line (currently line 192):
```tsx
const timerMax = timerDuration;
```

Add these three lines immediately after it:
```tsx
const RF_CIRC = 125.66;
const rfDashOffset = timerDuration > 0 ? RF_CIRC * (1 - timeLeft / timerDuration) : 0;
const rfTimerUrgent = timeLeft <= 10 && timerDuration > 0 && timerActive;
```

- [ ] **Step 5: Add buzzer handlers**

Find this function (currently line 300):
```tsx
// Helper: find team for a given student/team name
const findTeamForName = (name: string) => {
  return currentTeams.find(t => t.name === name || t.students.some(s => s.name === name));
};
```

Add these two functions immediately after it:
```tsx
const handleBuzzerCorrect = () => {
  const sorted = [...roomBuzzes].sort((a: any, b: any) => a.timestamp - b.timestamp);
  const activeBuzz = sorted[buzzActiveIdx];
  if (!activeBuzz) return;
  const studentName = roomStudents.find((s: any) => s.id === activeBuzz.studentId)?.name || '';
  const team = findTeamForName(studentName);
  if (team) updateTeamScore(team.id, 300);
  setBuzzResults(prev => ({ ...prev, [buzzActiveIdx]: 'correct' }));
  setTimerActive(false);
  setGameState("REVEALED");
};

const handleBuzzerWrong = () => {
  const sorted = [...roomBuzzes].sort((a: any, b: any) => a.timestamp - b.timestamp);
  setBuzzResults(prev => ({ ...prev, [buzzActiveIdx]: 'wrong' }));
  if (buzzActiveIdx + 1 < sorted.length) {
    setBuzzActiveIdx(prev => prev + 1);
  } else {
    setTimerActive(false);
    setGameState("REVEALED");
  }
};
```

- [ ] **Step 6: Replace the game view JSX block**

Find and replace this entire block (starts at line 422, ends at line 627):

**OLD — find this opening:**
```tsx
      {/* Game view */}
      {(gameState === "PLAYING" || gameState === "REVEALED" || gameState === "FINISHED") && (
        <div className={styles.page}>
```

**...ends with:**
```tsx
      )}
    </>
  );
}
```

Replace the entire game view block (everything from `{/* Game view */}` to the final `</>`) with:

```tsx
      {/* Game view */}
      {(gameState === "PLAYING" || gameState === "REVEALED" || gameState === "FINISHED") && (
        <div className={styles.rfPage}>

          {/* ── Header ── */}
          <div className={styles.rfHeader}>
            <div className={styles.rfTitle}>Rapid Fire</div>

            {/* SVG circular timer */}
            {gameState !== "FINISHED" && (
              <div className={styles.rfTimerWrap}>
                <svg className={styles.rfTimerSvg} viewBox="0 0 44 44">
                  <defs>
                    <linearGradient id="rfGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ff4d8f" />
                      <stop offset="100%" stopColor="#ff7d3b" />
                    </linearGradient>
                  </defs>
                  <circle className={styles.rfTimerTrack} cx="22" cy="22" r="20" />
                  <circle
                    className={`${styles.rfTimerRing}${rfTimerUrgent ? ` ${styles.rfTimerRingUrgent}` : ''}`}
                    cx="22" cy="22" r="20"
                    stroke={rfTimerUrgent ? "#ff4444" : "url(#rfGrad)"}
                    strokeDashoffset={rfDashOffset}
                  />
                </svg>
                <div className={`${styles.rfTimerNum}${rfTimerUrgent ? ` ${styles.rfTimerNumUrgent}` : ''}`}>
                  {timeLeft}
                </div>
              </div>
            )}

            {/* Progress bar */}
            {gameState !== "FINISHED" && (
              <div className={styles.rfProgressBarWrap}>
                <div
                  className={`${styles.rfProgressFill}${rfTimerUrgent ? ` ${styles.rfProgressFillUrgent}` : ''}`}
                  style={{ width: `${timerDuration > 0 ? (timeLeft / timerDuration) * 100 : 0}%` }}
                />
              </div>
            )}

            <div className={styles.rfHeaderRight}>
              <div className={styles.rfQCounter}>
                Q <span className={styles.rfQCounterNum}>{cursor + 1}</span> / {questions.length}
              </div>
              <button
                style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 6, padding: '5px 12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}
                onClick={() => setGameState("SETUP")}
              >
                ← NEW GAME
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className={styles.rfBody}>

            {gameState === "FINISHED" ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
                <h1 style={{ fontSize: "4rem", color: "#ff4d8f", fontWeight: 900, margin: 0, fontFamily: 'Syne, sans-serif' }}>Game Over!</h1>
                <button className={styles.rfBtnNext} onClick={() => setGameState("SETUP")}>
                  New Game
                </button>
              </div>
            ) : currentQ && (
              <>
                {/* Sentence card */}
                <div className={styles.rfSentenceCard}>
                  <div className={styles.rfSentenceText}>{currentQ.text}</div>
                </div>

                {/* Answer reveal (REVEALED state only) */}
                {gameState === "REVEALED" && (
                  <div className={styles.rfRevealCard}>
                    <div className={styles.rfRevealLabel}>Correct Answer</div>
                    <div className={styles.rfRevealAnswer}>{currentQ.answer}</div>
                  </div>
                )}

                {/* ── MC Mode ── */}
                {rfMode === "mc" && currentQ.options && (
                  <>
                    <div className={styles.rfOptsGrid}>
                      {(["A", "B", "C", "D"] as const).map(letter => {
                        const isCorrect = currentQ.correctLetter === letter;
                        const isRevealed = gameState === "REVEALED";
                        return (
                          <div
                            key={letter}
                            className={`${styles.rfOptTile}${isRevealed && isCorrect ? ` ${styles.rfOptTileCorrect}` : ''}${isRevealed && !isCorrect ? ` ${styles.rfOptTileDimmed}` : ''}`}
                          >
                            <div className={styles.rfOptLetter}>{letter}</div>
                            <div className={styles.rfOptText}>{currentQ.options![letter as keyof typeof currentQ.options]}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Team submission chips (PLAYING) */}
                    {gameState === "PLAYING" && activeRoomCode && roomStudents.length > 0 && (
                      <div className={styles.rfTeamChips}>
                        {currentTeams.map(team => {
                          const submitted = roomStudents.some((s: any) =>
                            (s.name === team.name || team.students.some((ts: any) => ts.name === s.name)) && s.answered
                          );
                          return (
                            <div
                              key={team.id}
                              className={`${styles.rfChip}${submitted ? '' : ` ${styles.rfChipWaiting}`}`}
                              style={submitted ? { borderColor: team.color, color: team.color, background: `${team.color}14` } : {}}
                            >
                              {team.name}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Speed ranking (REVEALED) */}
                    {gameState === "REVEALED" && (
                      <div className={styles.rfSpeedRank}>
                        <div className={styles.rfSpeedRankTitle}>Speed Ranking</div>
                        {(() => {
                          const ranked = roomStudents
                            .filter((s: any) => s.answered && s.lastAnswer === currentQ.correctLetter)
                            .sort((a: any, b: any) => (a.answerTime || 0) - (b.answerTime || 0));
                          if (ranked.length === 0) {
                            return <div className={styles.rfSpeedEmpty}>No correct answers</div>;
                          }
                          const medals = ['🥇', '🥈', '🥉'];
                          const pts = [500, 400, 300];
                          return ranked.map((s: any, idx: number) => (
                            <div key={s.id} className={styles.rfSpeedRow}>
                              <div className={styles.rfSpeedMedal}>{medals[idx] ?? '·'}</div>
                              <div className={styles.rfSpeedName}>{s.name}</div>
                              <div className={styles.rfSpeedTime}>{s.answerTime ? `${(s.answerTime / 1000).toFixed(1)}s` : '—'}</div>
                              <div className={styles.rfSpeedPts}>+{pointsEarned[s.id] ?? pts[idx] ?? 100}</div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </>
                )}

                {/* ── Buzzer Mode ── */}
                {rfMode === "buzzer" && (
                  <>
                    {(() => {
                      const sorted = [...roomBuzzes].sort((a: any, b: any) => a.timestamp - b.timestamp);
                      return (
                        <div className={styles.rfBuzzQueue}>
                          {sorted.length === 0 ? (
                            <div className={styles.rfBuzzEmpty}>Waiting for first buzz...</div>
                          ) : sorted.map((b: any, idx: number) => {
                            const result = buzzResults[idx];
                            const isActive = gameState === "PLAYING" && !result && idx === buzzActiveIdx;
                            const isWaiting = gameState === "PLAYING" && !result && idx > buzzActiveIdx;
                            const studentName = roomStudents.find((s: any) => s.id === b.studentId)?.name || 'Unknown';
                            const buzzMs = roomData?.questionStartTime
                              ? `${((b.timestamp - roomData.questionStartTime) / 1000).toFixed(1)}s`
                              : '—';
                            const entryClass = [
                              styles.rfBuzzEntry,
                              isActive ? styles.rfBuzzEntryActive
                                : isWaiting ? styles.rfBuzzEntryWaiting
                                : result === 'correct' ? styles.rfBuzzEntryCorrect
                                : styles.rfBuzzEntryWrong
                            ].join(' ');
                            return (
                              <div key={idx} className={entryClass}>
                                <div className={styles.rfBuzzPos}>
                                  {isActive ? '⚡' : idx + 1}
                                </div>
                                <div className={styles.rfBuzzInfo}>
                                  <div className={styles.rfBuzzName}>{studentName}</div>
                                  <div className={styles.rfBuzzTime}>{buzzMs}</div>
                                </div>
                                {isActive && (
                                  <div className={styles.rfBuzzBtns}>
                                    <button className={styles.rfBtnCorrect} onClick={handleBuzzerCorrect}>✓</button>
                                    <button className={styles.rfBtnWrong} onClick={handleBuzzerWrong}>✗</button>
                                  </div>
                                )}
                                {result === 'correct' && (
                                  <div className={`${styles.rfBuzzBadge} ${styles.rfBuzzBadgeCorrect}`}>✓ +300</div>
                                )}
                                {result === 'wrong' && (
                                  <div className={`${styles.rfBuzzBadge} ${styles.rfBuzzBadgeWrong}`}>✗ wrong</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* ── Actions ── */}
                <div className={styles.rfActionsRow}>
                  {gameState === "PLAYING" && (
                    <button className={styles.rfBtnReveal} onClick={handleReveal}>
                      Reveal Answer
                    </button>
                  )}
                  {gameState === "REVEALED" && (
                    <button className={styles.rfBtnNext} onClick={nextQuestion}>
                      {cursor + 1 >= questions.length ? "Finish →" : "Next Question →"}
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 7: TypeScript check**

Run from project root:
```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: no errors. If errors appear, fix them before committing.

- [ ] **Step 8: Commit**

```bash
git add app/rapid-fire/page.tsx
git commit -m "feat(rapid-fire): single-column projector layout with speed ranking and buzzer unlock"
```

---

## Self-Review Checklist

- [x] **Pink identity** — `#ff4d8f` used in rfTitle, rfTimerRing gradient, rfSentenceCard border-left, rfBtnReveal/Next, rfSpeedRankTitle, rfOptLetter
- [x] **SVG circular timer** — rfTimerWrap/Svg/Track/Ring with dashoffset derivation, urgent threshold ≤10s
- [x] **MC PLAYING** — 4 tiles + team chips row
- [x] **MC REVEALED** — correct tile green, others dimmed, speed ranking block
- [x] **Speed ranking** — ranked by `answerTime`, medals 🥇🥈🥉, pts from existing `pointsEarned` state
- [x] **Buzzer PLAYING** — full sorted queue, only active entry (idx=buzzActiveIdx) shows ✓/✗ buttons
- [x] **Buzzer sequential unlock** — ✗ increments buzzActiveIdx; last ✗ → REVEALED; ✓ → award 300pts + REVEALED
- [x] **Buzzer REVEALED** — final queue state with badges, answer revealed
- [x] **No scoring logic changed** — existing `handleReveal` MC scoring untouched; buzzer scoring is additive (new handlers)
- [x] **SETUP/LOADING/READY overlay** — unchanged
- [x] **FINISHED screen** — kept, updated to pink identity
- [x] **Reset on nextQuestion/startGame** — buzzActiveIdx + buzzResults reset
- [x] **No SYSTEM_LOG sidebar** — removed
- [x] **CSS prefix `rf`** — no collision with existing classes
