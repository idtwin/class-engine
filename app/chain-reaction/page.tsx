"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles } from "lucide-react";
import styles from "./chain.module.css";
import MultiplayerHost from "../components/MultiplayerHost";
import ScoreboardOverlay from "../components/ScoreboardOverlay";

const TEAM_COLORS = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];
const PTS_CLEAN  = 200;
const PTS_HINTED = 100;
const CIRC = 125.66;

interface ChainData {
  words: string[];
  connections: string[];
}

interface WordState {
  word: string;
  revealed: boolean[];
  solved: boolean;
  isGiven: boolean;
}

type GamePhase = "setup" | "loading" | "playing";

export default function ChainReaction() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, getActiveApiKey, getActiveModel, llmProvider, activeRoomCode } = useClassroomStore();

  // Setup options
  const [topic, setTopic]               = useState("");
  const [level, setLevel]               = useState("Mid (A2)");
  const [easyMode, setEasyMode]         = useState(true);
  const [rounds, setRounds]             = useState(5);
  const [timerDuration, setTimerDuration] = useState(0);
  const [phase, setPhase]               = useState<GamePhase>("setup");

  // Chain / game state
  const [chains, setChains]                 = useState<ChainData[]>([]);
  const [currentChainIdx, setCurrentChainIdx] = useState(0);
  const [chainComplete, setChainComplete]   = useState(false);
  const [words, setWords]                   = useState<WordState[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(1);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentInput, setCurrentInput]     = useState("");
  const [gameTally, setGameTally]           = useState<Record<string, number>>({});
  const [feedback, setFeedback]             = useState<{ type: "correct" | "wrong" | null; msg: string }>({ type: null, msg: "" });
  const [pushed, setPushed]                 = useState(false);
  const [flippingTiles, setFlippingTiles]   = useState<Set<string>>(new Set());

  // Timer
  const [timeLeft, setTimeLeft]       = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Sync / Reliability
  const [syncing, setSyncing]         = useState(false);
  const [syncError, setSyncError]     = useState(false);
  const syncRetryRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to avoid stale closures in event listeners
  const wordsRef         = useRef<WordState[]>([]);
  const currentWordIdxRef = useRef(1);
  const currentInputRef  = useRef("");
  const chainCompleteRef = useRef(false);
  wordsRef.current         = words;
  currentWordIdxRef.current = currentWordIdx;
  currentInputRef.current  = currentInput;
  chainCompleteRef.current = chainComplete;

  const handleSubmitRef      = useRef<(ans?: string) => void>(() => {});
  const handleTimeoutRef     = useRef<() => void>(() => {});
  const lastChainSubmitTsRef = useRef<number>(0);

  useEffect(() => { setMounted(true); }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timerDuration === 0 || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timerDuration, timeLeft]);

  // Timer expiry
  useEffect(() => {
    if (timeLeft === 0 && timerActive && timerDuration > 0) {
      setTimerActive(false);
      handleTimeoutRef.current();
    }
  }, [timeLeft, timerActive, timerDuration]);

  // ── Room sync helpers ─────────────────────────────────────────────────────────

  const syncChainState = useCallback(async (
    w: WordState[], wIdx: number, cIdx: number, totalC: number,
    complete: boolean, teamId: string | null,
    lastGuess?: { teamName: string; answer: string; correct: boolean } | null
  ) => {
    if (!activeRoomCode) return false;
    setSyncing(true);
    try {
      const res = await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeRoomCode,
          action: "set_chain_state",
          payload: {
            words: w, currentWordIdx: wIdx, currentChainIdx: cIdx,
            totalChains: totalC, chainComplete: complete, currentTeamId: teamId,
            lastGuess: lastGuess ?? null,
          },
        }),
      });
      if (res.ok) {
        setSyncError(false);
        setSyncing(false);
        return true;
      }
      throw new Error("Sync failed");
    } catch (err) {
      console.error("Chain Reaction Sync Error:", err);
      setSyncError(true);
      setSyncing(false);
      return false;
    }
  }, [activeRoomCode]);

  // Periodic heartbeat sync to force convergence
  useEffect(() => {
    if (phase !== "playing" || !activeRoomCode || chainComplete) return;
    const interval = setInterval(() => {
      const currentTeamId = currentTeams[currentTeamIdx]?.id ?? null;
      syncChainState(words, currentWordIdx, currentChainIdx, chains.length, chainComplete, currentTeamId);
    }, 6000); // Pulse every 6s
    return () => clearInterval(interval);
  }, [phase, activeRoomCode, chainComplete, words, currentWordIdx, currentChainIdx, chains.length, currentTeams, currentTeamIdx, syncChainState]);

  // Poll for phone submits while game is active
  useEffect(() => {
    if (!activeRoomCode || phase !== "playing") return;
    const poll = async () => {
      if (chainCompleteRef.current) return;
      const res = await fetch(`/api/room/get?code=${activeRoomCode}`).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      const sub = data?.chainSubmit;
      if (sub && sub.ts > lastChainSubmitTsRef.current) {
        lastChainSubmitTsRef.current = sub.ts;
        // Override current input and submit
        (handleSubmitRef.current as (ans: string) => void)(sub.answer);
        // Clear the submit flag
        fetch("/api/room/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_chain_submit", payload: {} }),
        }).catch(() => {});
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [activeRoomCode, phase]);

  // Global keyboard handler — set up once per phase entry
  useEffect(() => {
    if (phase !== "playing") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (chainCompleteRef.current) return;
      if (e.key === "Enter") {
        handleSubmitRef.current();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setCurrentInput(prev => prev.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        const w = wordsRef.current[currentWordIdxRef.current];
        if (w && currentInputRef.current.length < w.word.length) {
          setCurrentInput(prev => prev + e.key.toUpperCase());
        }
      }
    };
    // capture:true fires before any focused element; window survives tab/window switches
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [phase]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const resetTimer = useCallback(() => {
    setTimeLeft(timerDuration);
    setTimerActive(timerDuration > 0);
  }, [timerDuration]);

  const showFeedback = (type: "correct" | "wrong", msg: string) => {
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

  const revealNextLetter = (wordsList: WordState[], wordIdx: number): WordState[] => {
    const w = wordsList[wordIdx];
    const unrevealedCount = w.revealed.filter(r => !r).length;
    // Never reveal the last letter — team must guess it
    if (unrevealedCount <= 1) return wordsList;
    const nextUnrevealed = w.revealed.findIndex(r => !r);
    if (nextUnrevealed === -1) return wordsList;
    revealTileAnimate(wordIdx, nextUnrevealed);
    const newRevealed = [...w.revealed];
    newRevealed[nextUnrevealed] = true;
    const newWords = [...wordsList];
    newWords[wordIdx] = { ...w, revealed: newRevealed, solved: newRevealed.every(Boolean) };
    return newWords;
  };

  const addTally = (teamId: string, pts: number) => {
    setGameTally(prev => ({ ...prev, [teamId]: (prev[teamId] || 0) + pts }));
  };

  const initChain = (chain: ChainData, easy: boolean): WordState[] =>
    chain.words.map((word, i) => {
      const upper    = word.toUpperCase();
      const isFirst  = i === 0;
      const isLast   = easy && i === chain.words.length - 1;
      const isGiven  = isFirst || isLast;
      if (isGiven) {
        return { word: upper, revealed: upper.split("").map(() => true), solved: true, isGiven: true };
      }
      const revealed = upper.split("").map((_, idx) => easy && idx === 0);
      return { word: upper, revealed, solved: false, isGiven: false };
    });

  // ── Submit (auto-check typed word) ───────────────────────────────────────────

  const handleSubmit = useCallback((overrideAnswer?: string) => {
    const w = words[currentWordIdx];
    if (!w || w.isGiven || w.solved || chainComplete) return;
    const typed = (overrideAnswer ?? currentInput).toUpperCase();
    if (typed.length === 0) return;

    if (typed === w.word) {
      const anyRevealed = w.revealed.some(Boolean);
      const pts         = anyRevealed ? PTS_HINTED : PTS_CLEAN;
      const teamId      = currentTeams[currentTeamIdx]?.id;

      const newRevealed = w.word.split("").map(() => true);
      w.word.split("").forEach((_, i) => { if (!w.revealed[i]) revealTileAnimate(currentWordIdx, i); });
      const newWords = [...words];
      newWords[currentWordIdx] = { ...w, revealed: newRevealed, solved: true };

      const teamName = currentTeams[currentTeamIdx]?.name ?? "";
      if (teamId) addTally(teamId, pts);
      showFeedback("correct", pts === PTS_CLEAN ? `★ PERFECT! +${pts}` : `✓ +${pts} pts`);
      setCurrentInput("");

      const nextIdx = newWords.findIndex((ww, i) => i > currentWordIdx && !ww.solved && !ww.isGiven);
      const guess = { teamName, answer: typed, correct: true };
      if (nextIdx === -1) {
        setWords(newWords);
        setChainComplete(true);
        setTimerActive(false);
        syncChainState(newWords, currentWordIdx, currentChainIdx, chains.length, true, teamId ?? null, guess);
      } else {
        setWords(newWords);
        setCurrentWordIdx(nextIdx);
        resetTimer();
        const nextTeamId = currentTeams[currentTeamIdx]?.id ?? null;
        syncChainState(newWords, nextIdx, currentChainIdx, chains.length, false, nextTeamId, guess);
      }
    } else {
      const teamName = currentTeams[currentTeamIdx]?.name ?? "";
      const newWords = revealNextLetter([...words], currentWordIdx);
      showFeedback("wrong", "✗ Wrong — next letter revealed");
      setWords(newWords);
      setCurrentInput("");
      const nextTeamIdx = (currentTeamIdx + 1) % Math.max(currentTeams.length, 1);
      setCurrentTeamIdx(nextTeamIdx);
      resetTimer();
      const guess = { teamName, answer: typed, correct: false };
      syncChainState(newWords, currentWordIdx, currentChainIdx, chains.length, false, currentTeams[nextTeamIdx]?.id ?? null, guess);
    }
  }, [words, currentWordIdx, currentInput, currentTeams, currentTeamIdx, chainComplete, resetTimer, syncChainState, currentChainIdx, chains.length]);

  handleSubmitRef.current = handleSubmit;

  // Timer timeout → reveal letter + next team (no guess submitted)
  const handleTimeout = useCallback(() => {
    if (chainComplete) return;
    const newWords = revealNextLetter([...words], currentWordIdx);
    showFeedback("wrong", "⏱ Time's up!");
    setWords(newWords);
    setCurrentInput("");
    const nextTeamIdx = (currentTeamIdx + 1) % Math.max(currentTeams.length, 1);
    setCurrentTeamIdx(nextTeamIdx);
    resetTimer();
    syncChainState(newWords, currentWordIdx, currentChainIdx, chains.length, false, currentTeams[nextTeamIdx]?.id ?? null);
  }, [words, currentWordIdx, currentTeams, currentTeamIdx, chainComplete, resetTimer, syncChainState, currentChainIdx, chains.length]);

  handleTimeoutRef.current = handleTimeout;

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setPhase("loading");
    try {
      const res = await fetch("/api/generate-chain-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey:       getActiveApiKey(),
          mistralModel: getActiveModel(),
          provider:     llmProvider,
          topic,
          level,
          count:        rounds,
          circleCount:  "random",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const chainList: ChainData[] = data.chains || [];
      if (chainList.length === 0) throw new Error("No chains generated.");

      const firstWords    = initChain(chainList[0], easyMode);
      const firstActiveIdx = firstWords.findIndex(w => !w.isGiven);

      setChains(chainList);
      setWords(firstWords);
      setCurrentChainIdx(0);
      setCurrentWordIdx(firstActiveIdx === -1 ? 0 : firstActiveIdx);
      setCurrentTeamIdx(0);
      setCurrentInput("");
      setGameTally(Object.fromEntries(currentTeams.map(t => [t.id, 0])));
      setFeedback({ type: null, msg: "" });
      setPushed(false);
      setChainComplete(firstActiveIdx === -1);
      setFlippingTiles(new Set());
      setTimeLeft(timerDuration);
      setTimerActive(timerDuration > 0);
      setPhase("playing");
      // Sync initial state to phones
      const firstTeamId = currentTeams[0]?.id ?? null;
      syncChainState(firstWords, firstActiveIdx === -1 ? 0 : firstActiveIdx, 0, chainList.length, firstActiveIdx === -1, firstTeamId);
    } catch (err: any) {
      alert("Failed: " + err.message);
      setPhase("setup");
    }
  };

  const handleNextChain = () => {
    const nextIdx = currentChainIdx + 1;
    if (nextIdx >= chains.length) return;
    const nextWords      = initChain(chains[nextIdx], easyMode);
    const firstActiveIdx = nextWords.findIndex(w => !w.isGiven);
    setCurrentChainIdx(nextIdx);
    setWords(nextWords);
    setCurrentWordIdx(firstActiveIdx === -1 ? 0 : firstActiveIdx);
    setCurrentInput("");
    setFeedback({ type: null, msg: "" });
    setChainComplete(firstActiveIdx === -1);
    setFlippingTiles(new Set());
    setTimeLeft(timerDuration);
    setTimerActive(timerDuration > 0);
    // Team rotation + tally persist across chains
    const nextTeamId = currentTeams[currentTeamIdx]?.id ?? null;
    syncChainState(nextWords, firstActiveIdx === -1 ? 0 : firstActiveIdx, nextIdx, chains.length, firstActiveIdx === -1, nextTeamId);
  };

  const handlePush = () => {
    Object.entries(gameTally).forEach(([teamId, pts]) => {
      if (pts > 0) updateTeamScore(teamId, pts);
    });
    setPushed(true);
  };

  const reset = () => {
    setWords([]);
    setChains([]);
    setCurrentChainIdx(0);
    setCurrentWordIdx(1);
    setCurrentTeamIdx(0);
    setCurrentInput("");
    setGameTally({});
    setFeedback({ type: null, msg: "" });
    setPushed(false);
    setChainComplete(false);
    setFlippingTiles(new Set());
    setTimerActive(false);
    setPhase("setup");
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const currentTeam  = currentTeams[currentTeamIdx % Math.max(currentTeams.length, 1)];
  const currentColor = TEAM_COLORS[currentTeamIdx % TEAM_COLORS.length];
  const isLastChain  = currentChainIdx + 1 >= chains.length;

  const timerDash   = timerDuration > 0 && timeLeft > 0
    ? CIRC - (timeLeft / timerDuration) * CIRC
    : timerDuration > 0 ? CIRC : 0;
  const timerUrgent = timerDuration > 0 && timeLeft <= 5 && timeLeft > 0;

  const leadingTeamId = Object.entries(gameTally).reduce<string | null>((best, [id, pts]) => {
    if (!best) return id;
    return pts > (gameTally[best] || 0) ? id : best;
  }, null);

  const getRowStyle = (idx: number) => {
    const w = words[idx];
    if (w?.isGiven && idx === 0)                  return "given-first";
    if (w?.isGiven)                               return "given-last";
    if (w?.solved)                                return "solved";
    if (idx === currentWordIdx)                   return "active";
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

  // ── Render ───────────────────────────────────────────────────────────────────

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
                <div className={styles.setupTitleSub}>Compound Word Chain</div>
              </div>
              <MultiplayerHost gameMode="chainreaction" />
            </div>

            {phase === "loading" ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>
                  Generating {rounds} chain{rounds !== 1 ? "s" : ""}…
                </div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Weather, Animals, Sports…"
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

                <div className={styles.setupRow}>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Mode</div>
                    <div className={styles.modeToggle}>
                      <button
                        className={`${styles.modeBtn} ${easyMode ? styles.modeBtnActive : ""}`}
                        onClick={() => setEasyMode(true)}
                      >
                        Easy
                      </button>
                      <button
                        className={`${styles.modeBtn} ${!easyMode ? styles.modeBtnActive : ""}`}
                        onClick={() => setEasyMode(false)}
                      >
                        Hard
                      </button>
                    </div>
                    <div className={styles.modeHint}>
                      {easyMode
                        ? "First + last word given · first letters shown"
                        : "Only first word given · no hints"}
                    </div>
                  </div>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Rounds</div>
                    <select className={styles.setupSelect} value={rounds} onChange={e => setRounds(Number(e.target.value))}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={7}>7</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                </div>

                <button
                  className={styles.btnGenerate}
                  onClick={handleGenerate}
                  disabled={!topic.trim()}
                >
                  <Sparkles size={16} />
                  Generate Chains
                </button>

                <button className={styles.btnBack} onClick={() => router.push("/games")}>
                  ← Back to Arcade
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game view */}
      {phase === "playing" && words.length > 0 && (
        <div
          className={styles.page}
          onMouseDown={() => { (document.activeElement as HTMLElement)?.blur(); }}
        >
          {/* Header */}
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>Chain Reaction</div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>
              CHAIN <span className={styles.qCounterNum}>{currentChainIdx + 1}</span> / {chains.length}
            </div>
            <div className={styles.headerDivider} />
            <div className={styles.modePill}>{easyMode ? "EASY" : "HARD"}</div>
            <div className={styles.headerSpacer} />
            <MultiplayerHost gameMode="chainreaction" />
            <button className={styles.btnNewGame} onClick={reset}>← New Game</button>
            
            <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ 
                width: 8, height: 8, borderRadius: '50%', 
                background: syncError ? '#ff4d8f' : syncing ? '#ffc843' : '#00e87a',
                boxShadow: syncError ? '0 0 10px #ff4d8f' : 'none',
                transition: 'all 0.3s'
              }} />
              <span style={{ 
                fontSize: 10, color: syncError ? '#ff4d8f' : 'var(--muted)',
                fontFamily: 'var(--font-mono)', fontWeight: 700
              }}>
                {syncError ? "SYNC ERROR" : syncing ? "SYNCING..." : "SYNCED"}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className={styles.gameBody}>
            {/* Board */}
            <div className={styles.boardPanel}>
              {feedback.type && (
                <div className={`${styles.feedbackToast} ${feedback.type === "correct" ? styles.feedbackToastGood : styles.feedbackToastBad}`}>
                  {feedback.msg}
                </div>
              )}

              {words.map((w, wordIdx) => {
                const rowStyle     = chainComplete ? (w.isGiven ? (wordIdx === 0 ? "given-first" : "given-last") : "solved") : getRowStyle(wordIdx);
                const isGivenFirst = rowStyle === "given-first";
                const isGivenLast  = rowStyle === "given-last";
                const isGiven      = isGivenFirst || isGivenLast;
                const isActive     = rowStyle === "active";
                const isSolved     = rowStyle === "solved";
                const isAdjacent   = rowStyle === "adjacent";
                const isInactive   = rowStyle === "inactive";
                const opacity      = isInactive ? getInactiveOpacity(wordIdx) : 1;

                return (
                  <div key={wordIdx}>
                    <div
                      className={[
                        styles.wordRow,
                        isActive     ? styles.wordRowActive     : "",
                        isSolved     ? styles.wordRowSolved     : "",
                        isAdjacent   ? styles.wordRowAdjacent   : "",
                        isGivenFirst ? styles.wordRowGivenFirst : "",
                        isGivenLast  ? styles.wordRowGivenLast  : "",
                      ].join(" ")}
                      style={{ opacity }}
                    >
                      <div className={`${styles.rowNum} ${isActive ? styles.rowNumActive : ""}`}>
                        {wordIdx + 1}
                      </div>
                      <div className={styles.tilesRow}>
                        {w.word.split("").map((letter, li) => {
                          const key       = `${wordIdx}-${li}`;
                          const isFlipping = flippingTiles.has(key);
                          const typedChar  = isActive ? currentInput[li] : undefined;
                          const isTyped    = typedChar !== undefined;
                          const isHint     = !isGiven && !isSolved && !isTyped && w.revealed[li];
                          const isCursor   = isActive && !chainComplete && li === currentInput.length;

                          return (
                            <div
                              key={li}
                              className={[
                                styles.tile,
                                isGivenFirst ? styles.tileGivenFirst : "",
                                isGivenLast  ? styles.tileGivenLast  : "",
                                isSolved     ? styles.tileSolved      : "",
                                isHint       ? styles.tileHint        : "",
                                isTyped      ? styles.tileTyped       : "",
                                isCursor     ? styles.tileCursor      : "",
                                isFlipping   ? styles.tileFlip        : "",
                              ].join(" ")}
                            >
                              {isGiven ? letter : (typedChar ?? (w.revealed[li] ? letter : ""))}
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
              {chainComplete ? (
                <div className={styles.endPanel}>
                  <div className={styles.endTitle}>
                    {isLastChain ? "★ All Chains Done!" : `✓ Chain ${currentChainIdx + 1} Complete!`}
                  </div>

                  <div className={styles.endTally}>
                    {currentTeams.map((t, i) => {
                      const pts    = gameTally[t.id] || 0;
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

                  {!isLastChain ? (
                    <button className={styles.btnNextChain} onClick={handleNextChain}>
                      → Chain {currentChainIdx + 2} / {chains.length}
                    </button>
                  ) : (
                    <>
                      {!pushed ? (
                        <button className={styles.btnPush} onClick={handlePush}>
                          ✓ PUSH TO SCOREBOARD
                        </button>
                      ) : (
                        <div className={styles.savedMsg}>✓ Scores saved!</div>
                      )}
                      <button className={styles.btnPlayAgain} onClick={reset}>↺ Play Again</button>
                      {!pushed && (
                        <button className={styles.btnSkipSave} onClick={reset}>
                          Skip — don't save scores
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
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

                  <div className={styles.ctrlDivider} />
                  <div className={styles.ctrlSection}>TYPE YOUR ANSWER</div>
                  <div className={styles.typingHint}>
                    Type anywhere · Enter to submit · Backspace to delete
                  </div>

                  <div className={styles.ctrlDivider} />
                  <div className={styles.ctrlSection}>SCORING</div>
                  <div className={styles.ptsKeyRow}>
                    <div className={styles.ptsChip}>+{PTS_CLEAN} No hints</div>
                    <div className={styles.ptsChip}>+{PTS_HINTED} With hints</div>
                  </div>

                  <div className={styles.ctrlDivider} />
                  <div className={styles.ctrlSection}>THIS GAME</div>
                  <div className={styles.gameTally}>
                    {currentTeams.map((t, i) => {
                      const pts    = gameTally[t.id] || 0;
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
