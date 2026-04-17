"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles } from "lucide-react";
import styles from "./chain.module.css";
import MultiplayerHost from "../components/MultiplayerHost";
import ScoreboardOverlay from "../components/ScoreboardOverlay";

const TEAM_COLORS = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];
const PTS_LETTER = 20;
const PTS_WORD = 100;
const CIRC = 125.66;

interface WordState {
  word: string;
  revealed: boolean[];
  solved: boolean;
}

type GamePhase = "setup" | "loading" | "playing" | "finished";

export default function ChainReaction() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, getActiveApiKey, getActiveModel, llmProvider } = useClassroomStore();

  // Setup
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Mid (A2)");
  const [timerDuration, setTimerDuration] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("setup");

  // Game state
  const [words, setWords] = useState<WordState[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [gameTally, setGameTally] = useState<Record<string, number>>({});
  const [currentLetter, setCurrentLetter] = useState("");
  const [feedback, setFeedback] = useState<{ type: "correct" | "wrong" | "solve" | null; msg: string }>({ type: null, msg: "" });
  const [finished, setFinished] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [flippingTiles, setFlippingTiles] = useState<Set<string>>(new Set());

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const letterInputRef = useRef<HTMLInputElement>(null);
  const handleWrongRef = useRef<() => void>(() => {});

  useEffect(() => { setMounted(true); }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timerDuration === 0) return;
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timerDuration, timeLeft]);

  // Timer expiry → wrong
  useEffect(() => {
    if (timeLeft === 0 && timerActive && timerDuration > 0) {
      setTimerActive(false);
      handleWrongRef.current();
    }
  }, [timeLeft, timerActive, timerDuration]);

  // ── Helpers ──

  const resetTimer = () => {
    setTimeLeft(timerDuration);
    setTimerActive(timerDuration > 0);
  };

  const advanceTeam = (teams: typeof currentTeams) => {
    setCurrentTeamIdx(i => (i + 1) % Math.max(teams.length, 1));
  };

  const showFeedback = (type: "correct" | "wrong" | "solve", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback({ type: null, msg: "" }), 2000);
  };

  const revealTileAnimate = (wordIdx: number, letterIdx: number) => {
    const key = `${wordIdx}-${letterIdx}`;
    setFlippingTiles(prev => new Set(prev).add(key));
    setTimeout(() => setFlippingTiles(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    }), 450);
  };

  const revealRandomLetter = (wordsList: WordState[], wordIdx: number): WordState[] => {
    const w = wordsList[wordIdx];
    const unrevealed = w.revealed.reduce<number[]>((acc, r, i) => (!r ? [...acc, i] : acc), []);
    if (unrevealed.length === 0) return wordsList;
    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    revealTileAnimate(wordIdx, pick);
    const newRevealed = [...w.revealed];
    newRevealed[pick] = true;
    const allDone = newRevealed.every(Boolean);
    const newWords = [...wordsList];
    newWords[wordIdx] = { ...w, revealed: newRevealed, solved: allDone };
    return newWords;
  };

  const addTally = (teamId: string, pts: number) => {
    setGameTally(prev => ({ ...prev, [teamId]: (prev[teamId] || 0) + pts }));
  };

  // ── Game flow ──

  const handleWordSolved = (newWords: WordState[], teamId?: string) => {
    const nextIdx = newWords.findIndex((w, i) => i > currentWordIdx && !w.solved);
    if (nextIdx === -1) {
      setWords(newWords);
      setCurrentWordIdx(newWords.length - 1);
      setFinished(true);
      setTimerActive(false);
      return;
    }
    const afterReveal = revealRandomLetter(newWords, nextIdx);
    setWords(afterReveal);
    setCurrentWordIdx(nextIdx);
    setCurrentTeamIdx(i => (i + 1) % Math.max(currentTeams.length, 1));
    resetTimer();
  };

  const handleCorrect = () => {
    if (!words.length || finished) return;
    const letter = currentLetter.trim().toUpperCase();
    if (!letter) return;
    const w = words[currentWordIdx];
    const indices = w.revealed.reduce<number[]>((acc, r, i) => (!r && w.word[i] === letter ? [...acc, i] : acc), []);
    if (indices.length === 0) {
      handleWrong();
      return;
    }
    const newRevealed = [...w.revealed];
    indices.forEach(i => {
      newRevealed[i] = true;
      revealTileAnimate(currentWordIdx, i);
    });
    const allDone = newRevealed.every(Boolean);
    const newWords = [...words];
    newWords[currentWordIdx] = { ...w, revealed: newRevealed, solved: allDone };

    const teamId = currentTeams[currentTeamIdx]?.id;
    if (teamId) addTally(teamId, PTS_LETTER);
    showFeedback("correct", `+${PTS_LETTER} — "${letter}" revealed!`);
    setCurrentLetter("");

    if (allDone) {
      handleWordSolved(newWords, teamId);
    } else {
      setWords(newWords);
      resetTimer();
    }
  };

  const handleWrong = useCallback(() => {
    if (!words.length || finished) return;
    const newWords = revealRandomLetter([...words], currentWordIdx);
    showFeedback("wrong", "✗ Wrong — next team gets a hint letter");
    setWords(newWords);
    setCurrentLetter("");
    setCurrentTeamIdx(i => (i + 1) % Math.max(currentTeams.length, 1));
    resetTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, currentWordIdx, currentTeams, finished, timerDuration]);

  // Keep ref current at render time (not in effect) to avoid stale closure
  handleWrongRef.current = handleWrong;

  const handlePass = () => {
    if (finished) return;
    showFeedback("wrong", "↷ Passed — next team, no hint");
    setCurrentLetter("");
    setCurrentTeamIdx(i => (i + 1) % Math.max(currentTeams.length, 1));
    resetTimer();
  };

  const handleSolveWord = () => {
    if (!words.length || finished) return;
    const w = words[currentWordIdx];
    const newRevealed = w.word.split("").map(() => true);
    w.word.split("").forEach((_, i) => {
      if (!w.revealed[i]) revealTileAnimate(currentWordIdx, i);
    });
    const newWords = [...words];
    newWords[currentWordIdx] = { ...w, revealed: newRevealed, solved: true };

    const teamId = currentTeams[currentTeamIdx]?.id;
    if (teamId) addTally(teamId, PTS_WORD);
    showFeedback("solve", `★ SOLVED! +${PTS_WORD}`);
    setCurrentLetter("");
    handleWordSolved(newWords, teamId);
  };

  const handlePush = () => {
    Object.entries(gameTally).forEach(([teamId, pts]) => {
      if (pts > 0) updateTeamScore(teamId, pts);
    });
    setPushed(true);
  };

  const reset = () => {
    setWords([]);
    setCurrentWordIdx(0);
    setCurrentTeamIdx(0);
    setGameTally({});
    setCurrentLetter("");
    setFeedback({ type: null, msg: "" });
    setFinished(false);
    setPushed(false);
    setFlippingTiles(new Set());
    setTimerActive(false);
    setPhase("setup");
  };

  // ── Generate ──

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setPhase("loading");
    try {
      const res = await fetch("/api/generate-chain-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          mistralModel: getActiveModel(),
          provider: llmProvider,
          topic,
          level,
          mode: "word-reveal",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const rawWords: string[] = data.words || [];
      if (rawWords.length === 0) throw new Error("No words generated.");

      const initialWords: WordState[] = rawWords.map(w => {
        const upper = w.toUpperCase();
        const revealed = upper.split("").map(() => false);
        // Reveal 1 random letter to start
        const pick = Math.floor(Math.random() * upper.length);
        revealed[pick] = true;
        return { word: upper, revealed, solved: false };
      });

      setWords(initialWords);
      setCurrentWordIdx(0);
      setCurrentTeamIdx(0);
      setGameTally(Object.fromEntries(currentTeams.map(t => [t.id, 0])));
      setFinished(false);
      setPushed(false);
      setCurrentLetter("");
      setFeedback({ type: null, msg: "" });
      setFlippingTiles(new Set());
      setTimeLeft(timerDuration);
      setTimerActive(timerDuration > 0);
      setPhase("playing");
      setTimeout(() => letterInputRef.current?.focus(), 100);
    } catch (err: any) {
      alert("Failed: " + err.message);
      setPhase("setup");
    }
  };

  // ── Derived ──

  const currentTeam = currentTeams[currentTeamIdx % Math.max(currentTeams.length, 1)];
  const currentColor = TEAM_COLORS[currentTeamIdx % TEAM_COLORS.length];
  const totalWords = words.length;
  const solvedCount = words.filter(w => w.solved).length;

  const timerDash = timerDuration > 0 && timeLeft > 0
    ? CIRC - (timeLeft / timerDuration) * CIRC
    : timerDuration > 0 ? CIRC : 0;
  const timerUrgent = timerDuration > 0 && timeLeft <= 5 && timeLeft > 0;

  const leadingTeamId = Object.entries(gameTally).reduce<string | null>((best, [id, pts]) => {
    if (!best) return id;
    return pts > (gameTally[best] || 0) ? id : best;
  }, null);

  const getRowStyle = (idx: number): "active" | "adjacent" | "solved" | "inactive" => {
    if (words[idx]?.solved) return "solved";
    if (idx === currentWordIdx) return "active";
    if (idx === currentWordIdx - 1 || idx === currentWordIdx + 1) return "adjacent";
    return "inactive";
  };

  const getInactiveOpacity = (idx: number): number => {
    const dist = Math.abs(idx - currentWordIdx);
    if (dist === 2) return 0.38;
    if (dist === 3) return 0.25;
    if (dist === 4) return 0.15;
    return 0.08;
  };

  // ── Render ──

  if (!mounted) return null;

  return (
    <>
      {/* Setup / Loading overlay */}
      {(phase === "setup" || phase === "loading") && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>⚡</div>
              <div style={{ flex: 1 }}>
                <div className={styles.setupTitleText}>Chain Reaction</div>
                <div className={styles.setupTitleSub}>Word Reveal Game</div>
              </div>
              <MultiplayerHost gameMode="chainreaction" />
            </div>

            {phase === "loading" ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Generating vocabulary chain...</div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Weather, Animals, Sports..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && topic.trim() && handleGenerate()}
                    autoFocus
                  />
                </div>

                <div className={styles.setupRow}>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Level</div>
                    <select className={styles.setupSelect} value={level} onChange={e => setLevel(e.target.value)}>
                      <option value="Low (A1)">Low (A1)</option>
                      <option value="Low-Mid (A1-A2)">Low-Mid (A1-A2)</option>
                      <option value="Mid (A2)">Mid (A2)</option>
                      <option value="Mid-High (A2-B1)">Mid-High (A2-B1)</option>
                      <option value="High (B1)">High (B1)</option>
                      <option value="Mixed Level">Mixed Level</option>
                    </select>
                  </div>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Timer</div>
                    <select className={styles.setupSelect} value={timerDuration} onChange={e => setTimerDuration(Number(e.target.value))}>
                      <option value={0}>No Timer</option>
                      <option value={15}>15s</option>
                      <option value={20}>20s</option>
                      <option value={30}>30s</option>
                      <option value={45}>45s</option>
                      <option value={60}>60s</option>
                    </select>
                  </div>
                </div>

                <button
                  className={styles.btnGenerate}
                  onClick={handleGenerate}
                  disabled={!topic.trim()}
                >
                  <Sparkles size={16} />
                  Generate Chain
                </button>

                <button
                  className={styles.btnBack}
                  onClick={() => router.push("/games")}
                >
                  ← Back to Arcade
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game view */}
      {(phase === "playing") && words.length > 0 && (
        <div className={styles.page}>
          {/* Header */}
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>Chain Reaction</div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>
              WORD <span className={styles.qCounterNum}>{Math.min(currentWordIdx + 1, totalWords)}</span> / {totalWords}
            </div>
            <div className={styles.headerSpacer} />
            <button className={styles.btnNewGame} onClick={reset}>← New Game</button>
          </div>

          {/* Body: board + control panel */}
          <div className={styles.gameBody}>
            {/* Board panel */}
            <div className={styles.boardPanel}>
              {/* Feedback toast */}
              {feedback.type && (
                <div className={`${styles.feedbackToast} ${feedback.type === "correct" || feedback.type === "solve" ? styles.feedbackToastGood : styles.feedbackToastBad}`}>
                  {feedback.msg}
                </div>
              )}

              {words.map((w, wordIdx) => {
                const rowStyle = finished ? "solved" : getRowStyle(wordIdx);
                const isActive = rowStyle === "active";
                const isSolved = rowStyle === "solved";
                const isAdjacent = rowStyle === "adjacent";
                const isInactive = rowStyle === "inactive";
                const opacity = isInactive ? getInactiveOpacity(wordIdx) : 1;

                return (
                  <div key={wordIdx}>
                    <div
                      className={`${styles.wordRow} ${isActive ? styles.wordRowActive : ""} ${isSolved ? styles.wordRowSolved : ""} ${isAdjacent ? styles.wordRowAdjacent : ""}`}
                      style={{ opacity }}
                    >
                      <div className={`${styles.rowNum} ${isActive ? styles.rowNumActive : ""}`}>
                        {wordIdx + 1}
                      </div>
                      <div className={styles.tilesRow}>
                        {w.word.split("").map((letter, li) => {
                          const key = `${wordIdx}-${li}`;
                          const isRevealed = w.revealed[li];
                          const isFlipping = flippingTiles.has(key);
                          return (
                            <div
                              key={li}
                              className={`${styles.tile} ${isActive ? styles.tileActive : ""} ${isSolved ? styles.tileSolved : ""} ${isRevealed && !isSolved ? styles.tileRevealed : ""} ${isFlipping ? styles.tileFlip : ""}`}
                            >
                              {isRevealed || isSolved ? letter : ""}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {wordIdx < words.length - 1 && <div className={styles.rowDivider} />}
                  </div>
                );
              })}
            </div>

            {/* Control panel */}
            <div className={styles.controlPanel}>
              {finished ? (
                /* End panel */
                <div className={styles.endPanel}>
                  <div className={styles.endTitle}>Chain Complete</div>

                  <div className={styles.endTally}>
                    {currentTeams.map((t, i) => {
                      const pts = gameTally[t.id] || 0;
                      const isLead = t.id === leadingTeamId && pts > 0;
                      return (
                        <div key={t.id} className={`${styles.tallyRow} ${isLead ? styles.tallyRowLead : ""}`}>
                          <span className={styles.tallyDot} style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                          <span className={styles.tallyName}>{t.name}</span>
                          <span className={styles.tallyDelta} style={{ color: isLead ? "var(--yellow)" : "var(--text)" }}>
                            +{pts}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {!pushed ? (
                    <button className={styles.btnPush} onClick={handlePush}>
                      ✓ PUSH TO SCOREBOARD
                    </button>
                  ) : (
                    <div className={styles.savedMsg}>✓ Scores saved!</div>
                  )}

                  <button className={styles.btnPlayAgain} onClick={reset}>
                    ↺ Play Again (new chain)
                  </button>

                  {!pushed && (
                    <button className={styles.btnSkipSave} onClick={reset}>
                      Skip — don't save scores
                    </button>
                  )}
                </div>
              ) : (
                /* Active control panel */
                <>
                  <div className={styles.ctrlSection}>CURRENT TURN</div>

                  <div className={styles.turnRow}>
                    {currentTeam && (
                      <div className={styles.teamBadge} style={{ borderColor: currentColor, color: currentColor }}>
                        {currentTeam.name}
                      </div>
                    )}
                    {timerDuration > 0 && (
                      <div className={styles.timerWrap}>
                        <svg width="64" height="64" viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r="20" fill="none" stroke="var(--border2)" strokeWidth="3" />
                          <circle
                            cx="22" cy="22" r="20" fill="none"
                            stroke={timerUrgent ? "#ff4d8f" : "var(--cyan)"}
                            strokeWidth="3"
                            strokeDasharray={CIRC}
                            strokeDashoffset={timerDash}
                            strokeLinecap="round"
                            transform="rotate(-90 22 22)"
                            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
                          />
                          <text
                            x="22" y="27" textAnchor="middle"
                            fill={timerUrgent ? "#ff4d8f" : "var(--text)"}
                            fontSize="14" fontWeight="700"
                            fontFamily="var(--font-mono)"
                            className={timerUrgent ? styles.timerPulse : ""}
                          >
                            {timeLeft}
                          </text>
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className={styles.ctrlSection}>LETTER GUESS</div>

                  <input
                    ref={letterInputRef}
                    className={styles.letterInput}
                    value={currentLetter}
                    onChange={e => setCurrentLetter(e.target.value.slice(-1).toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") handleCorrect(); }}
                    maxLength={1}
                    placeholder="A"
                    autoComplete="off"
                  />

                  <button className={styles.btnCorrect} onClick={handleCorrect}>
                    ✓ CORRECT — REVEAL
                  </button>
                  <button className={styles.btnWrong} onClick={handleWrong}>
                    ✗ WRONG — HINT + NEXT TEAM
                  </button>

                  <div className={styles.ctrlDivider} />

                  <button className={styles.btnPass} onClick={handlePass}>
                    ↷ PASS — next team, no hint
                  </button>
                  <button className={styles.btnSolve} onClick={handleSolveWord}>
                    ★ SOLVE WORD (full word guessed)
                  </button>

                  <div className={styles.ctrlDivider} />

                  <div className={styles.ptsKeyRow}>
                    <div className={styles.ptsChip}>+{PTS_LETTER} Letter</div>
                    <div className={styles.ptsChip}>+{PTS_WORD} Word</div>
                  </div>

                  <div className={styles.ctrlDivider} />

                  <div className={styles.ctrlSection}>THIS GAME</div>

                  <div className={styles.gameTally}>
                    {currentTeams.map((t, i) => {
                      const pts = gameTally[t.id] || 0;
                      const isLead = t.id === leadingTeamId && pts > 0;
                      return (
                        <div key={t.id} className={`${styles.tallyRow} ${isLead ? styles.tallyRowLead : ""}`}>
                          <span className={styles.tallyDot} style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                          <span className={styles.tallyName}>{t.name}</span>
                          <span className={styles.tallyDelta} style={{ color: isLead ? "var(--yellow)" : "var(--muted)" }}>
                            +{pts}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ScoreboardOverlay />
    </>
  );
}
