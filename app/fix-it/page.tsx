"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./fix.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import MultiplayerHost from "../components/MultiplayerHost";

// ── Types ────────────────────────────────────────────
type GameMode = "Easy" | "Hard";
type Phase = "SETUP" | "GENERATING" | "READY" | "PLAYING" | "REVEALED" | "FINISHED";

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

  const currentQ = questions[qIndex];

  // ── Generate — fetches questions then waits in lobby ──
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
      setPhase("READY"); // ← hold in lobby until teacher taps Launch
    } catch (err: any) {
      console.error(err);
      setPhase("SETUP");
    }
  };

  // ── Launch — teacher decides when to start ────────────
  const handleLaunch = async () => {
    // Activate room: set game mode + status so phones transition out of lobby
    if (activeRoomCode) {
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "set_game_mode", payload: { gameMode: "fixit", fixitMode: mode } })
      }).catch(() => {});
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "update_status", payload: { status: "playing" } })
      }).catch(() => {});
    }
    setPhase("PLAYING");
    await clearRoom();
    await pushQuestion(questions[0]);
    startTimer();
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
  // New layout timer derivations
  const TIMER_CIRC = 125.66;
  const dashOffset = timerDur > 0 ? TIMER_CIRC * (1 - timeLeft / timerDur) : 0;
  const timerMid = timeLeft <= 20 && timeLeft > 10 && timerDur > 0; // reserved: amber ring state, not wired yet
  const timerUrgentRing = timeLeft <= 10 && timerDur > 0;

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <>
      {/* ── Setup / Generating / Lobby modal ── */}
      {(phase === "SETUP" || phase === "GENERATING" || phase === "READY") && (
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
            ) : phase === "READY" ? (
              <div className={styles.lobbyState}>
                {/* Ready badge */}
                <div className={styles.lobbyReadyBadge}>
                  <span className={styles.lobbyReadyDot} />
                  <span>{questions.length} questions ready</span>
                  <span className={`${styles.modeBadge} ${mode === "Easy" ? styles.modeBadgeEasy : styles.modeBadgeHard}`}>
                    {mode}
                  </span>
                </div>

                {/* Joined students */}
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
                        const team = currentTeams.find(t => t.students.some(ts => ts.name === s.name));
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

                {/* Actions */}
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
                    {mode === "Hard" && !showHint && (
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
    </>
  );
}
