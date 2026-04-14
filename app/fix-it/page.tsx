"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./fix.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import MultiplayerHost from "../components/MultiplayerHost";

// ── Types ────────────────────────────────────────────
type GameMode = "Easy" | "Hard";
type Phase = "SETUP" | "GENERATING" | "PLAYING" | "REVEALED" | "FINISHED";

interface Question {
  level: string;
  errorType: string;
  sentence: string;
  wrongWord: string;
  correctWord: string;
  hint: string;
  options: string[]; // always 4 items
}

const LETTER = ["A", "B", "C", "D"];

// ── Sentence renderer ────────────────────────────────
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

// ── Main component ────────────────────────────────────
export default function FixIt() {
  const {
    currentTeams, updateTeamScore,
    getActiveApiKey, getActiveModel, llmProvider,
    activeRoomCode,
  } = useClassroomStore();

  // Setup state
  const [topic, setTopic]       = useState("");
  const [level, setLevel]       = useState("Mixed Level");
  const [mode, setMode]         = useState<GameMode>("Easy");
  const [timerDur, setTimerDur] = useState(30); // 0 = off

  // Game state
  const [phase, setPhase]         = useState<Phase>("SETUP");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex]       = useState(0);
  const [showHint, setShowHint]   = useState(false);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState<Record<string, number>>({});

  // Room polling
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Poll room
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomStudents(data.students || []);
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { setTimerActive(false); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [timerActive, timeLeft]);

  // ── Helpers — must be before any early return ────────
  const startTimer = useCallback(() => {
    if (timerDur === 0) return;
    setTimeLeft(timerDur);
    setTimerActive(true);
  }, [timerDur]);

  const pushQuestion = useCallback(async (q: Question) => {
    if (!activeRoomCode) return;
    await fetch("/api/room/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: activeRoomCode,
        action: "set_question",
        payload: {
          question: { ...q, gameMode: "fixit", fixit_mode: mode },
          questionDuration: timerDur > 0 ? timerDur : null,
          questionStartTime: Date.now(),
        }
      })
    }).catch(() => {});
  }, [activeRoomCode, mode, timerDur]);

  const clearRoom = useCallback(async () => {
    if (!activeRoomCode) return;
    await fetch("/api/room/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
    }).catch(() => {});
  }, [activeRoomCode]);

  if (!mounted) return null;

  // ── Generate ─────────────────────────────────────────
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setPhase("GENERATING");
    try {
      const res = await fetch("/api/generate-fix-it", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          mistralModel: getActiveModel(),
          provider: llmProvider,
          topic, level, mode,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.questions) throw new Error(data.error || "Generation failed");
      setQuestions(data.questions);
      setQIndex(0);
      setShowHint(false);
      setPointsAwarded({});
      setPhase("PLAYING");
      await clearRoom();
      await pushQuestion(data.questions[0]);
      startTimer();
    } catch (err: any) {
      console.error(err);
      setPhase("SETUP");
    }
  };

  // ── Reveal ────────────────────────────────────────────
  const handleReveal = async () => {
    setTimerActive(false);
    setPhase("REVEALED");

    // Notify phones
    if (activeRoomCode) {
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
      }).catch(() => {});
    }

    if (!currentQ) return;

    // Fetch fresh room data for scoring
    let students = roomStudents;
    if (activeRoomCode) {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          students = data.students || [];
          setRoomStudents(students);
        }
      } catch {}
    }

    // Score: answered students sorted by answer time
    const correct = students.filter(s =>
      s.answered &&
      s.lastAnswer?.trim().toLowerCase() === currentQ.correctWord.toLowerCase()
    );
    correct.sort((a, b) => (a.answerTime || 0) - (b.answerTime || 0));

    const pts: Record<string, number> = {};
    const ptValues = [500, 400, 300, 200];
    correct.forEach((s, i) => {
      const award = ptValues[i] ?? 100;
      pts[s.name] = award;
      const team = currentTeams.find(t => t.students.some(ts => ts.name === s.name));
      if (team) updateTeamScore(team.id, award);
    });
    setPointsAwarded(pts);
  };

  // ── Next question ─────────────────────────────────────
  const handleNext = async () => {
    const nextIdx = qIndex + 1;
    if (nextIdx >= questions.length) {
      setPhase("FINISHED");
      return;
    }
    setQIndex(nextIdx);
    setShowHint(false);
    setPointsAwarded({});
    setPhase("PLAYING");
    await clearRoom();
    await pushQuestion(questions[nextIdx]);
    startTimer();
  };

  // ── Timer helpers ─────────────────────────────────────
  const timerPct = timerDur > 0 ? (timeLeft / timerDur) * 100 : 100;
  const timerUrgent = timeLeft <= 5 && timerDur > 0 && timerActive;

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <>
      {/* ── Setup / Generating modal ── */}
      {(phase === "SETUP" || phase === "GENERATING") && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitle}>
              <div className={styles.setupTitleIcon}>🟡</div>
              <div>
                <div className={styles.setupTitleText}>Fix It</div>
                <div className={styles.setupTitleSub}>Grammar Correction Game</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <MultiplayerHost gameMode="fixit" />
              </div>
            </div>

            {phase === "GENERATING" ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Generating questions...</div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Travel, Food, School life..."
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
                      <option value="Mixed Level">Mixed Level</option>
                      <option value="Low">Low (A1)</option>
                      <option value="Mid">Mid (A2)</option>
                      <option value="High">High (B1)</option>
                    </select>
                  </div>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Timer per Question</div>
                    <select className={styles.setupSelect} value={timerDur} onChange={e => setTimerDur(Number(e.target.value))}>
                      <option value={0}>Off (teacher-paced)</option>
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>
                  </div>
                </div>

                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Mode</div>
                  <div className={styles.modeToggle}>
                    <button
                      className={`${styles.modeBtn} ${mode === "Easy" ? styles.modeBtnActive : ""}`}
                      onClick={() => setMode("Easy")}
                    >
                      <span className={styles.modeBtnIcon}>🔵</span>
                      <span className={styles.modeBtnLabel}>Easy</span>
                      <span className={styles.modeBtnDesc}>4 multiple choice options</span>
                    </button>
                    <button
                      className={`${styles.modeBtn} ${mode === "Hard" ? styles.modeBtnActive : ""}`}
                      onClick={() => setMode("Hard")}
                    >
                      <span className={styles.modeBtnIcon}>🔴</span>
                      <span className={styles.modeBtnLabel}>Hard</span>
                      <span className={styles.modeBtnDesc}>Type the correct word</span>
                    </button>
                  </div>
                </div>

                <button
                  className={styles.btnGenerate}
                  onClick={handleGenerate}
                  disabled={!topic.trim()}
                >
                  Generate Questions
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Three-zone game layout ── */}
      <div className={styles.page}>

        {/* Zone 1: Header */}
        <div className={styles.gameHeader}>
          <span className={styles.gameTitle}>Fix It</span>
          <div className={styles.headerDivider} />
          {phase !== "SETUP" && phase !== "GENERATING" && (
            <>
              <span className={styles.qCounter}>
                Q <span className={styles.qCounterNum}>{qIndex + 1}</span> / {questions.length}
              </span>
              <div className={styles.headerDivider} />
              <span className={`${styles.modeBadge} ${mode === "Easy" ? styles.modeBadgeEasy : styles.modeBadgeHard}`}>
                {mode}
              </span>
            </>
          )}

          <div className={styles.headerSpacer} />

          {/* Timer */}
          {timerDur > 0 && phase === "PLAYING" && (
            <div className={styles.timerWrap}>
              <div className={`${styles.timerNum} ${timerUrgent ? styles.timerNumUrgent : ""}`}>
                {timeLeft}
              </div>
              <div className={styles.timerBar}>
                <div
                  className={`${styles.timerBarFill} ${timerUrgent ? styles.timerBarFillUrgent : ""}`}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Zone 2: Content */}
        <div className={styles.gameContent}>

          {/* ── PLAYING ── */}
          {(phase === "PLAYING" || phase === "REVEALED") && currentQ && (
            <>
              <div className={styles.errorTypeLabel}>
                Error type: <span className={styles.errorTypeName}>{currentQ.errorType}</span>
              </div>

              {/* Sentence */}
              <div className={styles.sentenceWrap}>
                {phase === "PLAYING"
                  ? <HighlightedSentence sentence={currentQ.sentence} wrongWord={currentQ.wrongWord} />
                  : null
                }
              </div>

              {/* PLAYING state controls */}
              {phase === "PLAYING" && (
                <>
                  {/* Easy: MC options */}
                  {mode === "Easy" && (
                    <div className={styles.optionsGrid}>
                      {currentQ.options.map((opt, i) => (
                        <div key={opt} className={styles.optionCard}>
                          <span className={styles.optionLetter}>{LETTER[i]}</span>
                          <span className={styles.optionText}>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hard: waiting status */}
                  {mode === "Hard" && (
                    <div className={styles.hardStatus}>
                      <div className={styles.hardStatusDots}>
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className={`${styles.hardStatusDot} ${lockedCount > i ? styles.hardStatusDotActive : ""}`}
                          />
                        ))}
                      </div>
                      <div className={styles.hardStatusText}>
                        <span className={styles.hardStatusCount}>{lockedCount}</span>
                        {" "}answer{lockedCount !== 1 ? "s" : ""} locked
                      </div>
                    </div>
                  )}

                  {/* Hint (Hard mode only) */}
                  {mode === "Hard" && showHint && (
                    <div className={styles.hintCard}>
                      <span className={styles.hintIcon}>💡</span>
                      <span className={styles.hintText}>{currentQ.hint}</span>
                    </div>
                  )}

                  {/* Student answer chips */}
                  {roomStudents.length > 0 && (
                    <div className={styles.answersRow}>
                      {roomStudents.map(s => (
                        <div
                          key={s.id}
                          className={`${styles.answerChip} ${s.answered ? styles.answerChipLocked : ""}`}
                        >
                          {s.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Controls */}
                  <div className={styles.controls}>
                    <button className={styles.btnReveal} onClick={handleReveal}>
                      Reveal Answer
                    </button>
                    {mode === "Hard" && !showHint && (
                      <button className={styles.btnHint} onClick={() => setShowHint(true)}>
                        💡 Show Hint
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* REVEALED state */}
              {phase === "REVEALED" && (
                <>
                  <div className={styles.revealBlock}>
                    {/* Before */}
                    <div className={styles.revealRow}>
                      <span className={styles.revealIcon}>❌</span>
                      <span className={`${styles.revealSentence} ${styles.revealWrong}`}>
                        {currentQ.sentence.split(new RegExp(`(\\b${currentQ.wrongWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i")).map((part, i, arr) =>
                          arr.length > 1 && i === 1
                            ? <span key={i} className={styles.revealStrike}>{part}</span>
                            : part
                        )}
                      </span>
                    </div>
                    {/* After */}
                    <div className={styles.revealRow}>
                      <span className={styles.revealIcon}>✅</span>
                      <span className={`${styles.revealSentence} ${styles.revealCorrect}`}>
                        {currentQ.sentence.split(new RegExp(`(\\b${currentQ.wrongWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i")).map((part, i, arr) =>
                          arr.length > 1 && i === 1
                            ? <span key={i} className={styles.revealHighlight}>{currentQ.correctWord}</span>
                            : part
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Score awards */}
                  {Object.keys(pointsAwarded).length > 0 && (
                    <div className={styles.scoreAwards}>
                      {Object.entries(pointsAwarded).map(([name, pts]) => {
                        const team = currentTeams.find(t => t.students.some(s => s.name === name));
                        return (
                          <div key={name} className={styles.scoreAward}>
                            <span className={styles.scoreAwardTeam}>{team?.name || name}</span>
                            <span className={styles.scoreAwardPts}>+{pts}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Post-reveal answer chips */}
                  {roomStudents.filter(s => s.answered).length > 0 && (
                    <div className={styles.answersRow}>
                      {roomStudents.filter(s => s.answered).map(s => {
                        const correct = s.lastAnswer?.trim().toLowerCase() === currentQ.correctWord.toLowerCase();
                        return (
                          <div
                            key={s.id}
                            className={`${styles.answerChip} ${correct ? styles.answerChipCorrect : styles.answerChipWrong}`}
                          >
                            {s.name} · {s.lastAnswer}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className={styles.controls}>
                    <button
                      className={styles.btnNext}
                      onClick={handleNext}
                    >
                      {qIndex + 1 >= questions.length ? "Finish Game" : "Next Question →"}
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
    </>
  );
}
