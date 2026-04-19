"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClassroomStore, SavedBoard } from "../store/useClassroomStore";
import { Sparkles } from "lucide-react";
import styles from "./rapid-fire.module.css";
import MultiplayerHost from "../components/MultiplayerHost";
import BoardLibrary from "../components/BoardLibrary";

interface RapidFireQuestion {
  text: string;
  answer: string;
  level: string;
  type: string;
  options?: { A: string; B: string; C: string; D: string };
  correctLetter?: string;
}

type GameState = "SETUP" | "LOADING" | "READY" | "PLAYING" | "REVEALED" | "FINISHED";
type RFMode = "buzzer" | "mc";

export default function RapidFire() {
  const router = useRouter();
  const { currentTeams, updateTeamScore, getActiveApiKey, mistralModel, llmProvider, triggerTwist, activeRoomCode, saveBoard } = useClassroomStore();
  const [mounted, setMounted] = useState(false);
  const [roomBuzzes, setRoomBuzzes] = useState<any[]>([]);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [gameState, setGameState] = useState<GameState>("SETUP");
  const [rfMode, setRfMode] = useState<RFMode>("buzzer");
  const [topic, setTopic] = useState("");
  const [targetLevel, setTargetLevel] = useState("Mid");
  const [questions, setQuestions] = useState<RapidFireQuestion[]>([]);
  const [cursor, setCursor] = useState(0);
  const [wrongSelections, setWrongSelections] = useState<Set<string>>(new Set());

  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(15);

  const [penalizeWrong, setPenalizeWrong] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<Record<string, number>>({});
  const [showTimesUp, setShowTimesUp] = useState(false);
  const [buzzActiveIdx, setBuzzActiveIdx] = useState(0);
  const [buzzResults, setBuzzResults] = useState<Record<number, 'correct' | 'wrong'>>({});

  const handleLoadBoard = (saved: SavedBoard) => {
    setQuestions(saved.content as RapidFireQuestion[]);
    setTopic(saved.topic);
    setGameState("READY");
  };

  const replaceQuestion = async (idx: number) => {
    const apiKey = getActiveApiKey();
    if (!apiKey && llmProvider !== 'lmstudio') return;
    try {
      const existing = questions.map(q => q.text);
      const res = await fetch("/api/generate-rapid-fire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, provider: llmProvider, mistralModel, topic, level: targetLevel, mode: rfMode, replaceOne: true, existingQuestions: existing }),
      });
      const data = await res.json();
      if (data.question) {
        setQuestions(prev => prev.map((q, i) => i === idx ? data.question : q));
      }
    } catch (e) { console.error("Replace error:", e); }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      // Show TIME'S UP animation — do NOT auto-reveal
      setShowTimesUp(true);
      setTimeout(() => setShowTimesUp(false), 3000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Auto-reveal when all connected students have answered
  useEffect(() => {
    if (gameState === "PLAYING" && roomStudents.length > 0) {
      const allAnswered = roomStudents.every((s: any) => s.answered);
      if (allAnswered) {
        handleReveal();
      }
    }
  }, [roomStudents, gameState]);

  // Poll for buzzes and student answers
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomBuzzes(data.buzzes || []);
          setRoomStudents(data.students || []);
          setRoomData(data);
        }
      } catch (e) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  if (!mounted) return null;

  if (currentTeams.length === 0) {
    return (
      <div className={styles.setupOverlay}>
        <div className={styles.setupModal}>
          <div className={styles.setupTitleRow}>
            <div className={styles.setupTitleIcon}>⚡</div>
            <div>
              <div className={styles.setupTitleText}>No Teams Found</div>
              <div className={styles.setupTitleSub}>Setup Required</div>
            </div>
          </div>
          <p style={{ color: 'var(--muted, #4a637d)', fontSize: 14 }}>You must generate teams in the Dashboard before playing.</p>
        </div>
      </div>
    );
  }

  const generateGame = async () => {
    if (!topic) return alert("Please enter a topic!");

    if (!getActiveApiKey() && llmProvider !== 'lmstudio') return alert("Please set your API key in Dashboard → Config first!");

    setIsGenerating(true);
    setGameState("LOADING");

    try {
      const response = await fetch("/api/generate-rapid-fire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          mistralModel,
          provider: llmProvider,
          topic,
          level: targetLevel,
          mode: rfMode
        })
      });
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setQuestions(data.questions);
      setGameState("READY");
    } catch (err: any) {
      alert("Failed: " + err.message);
      setGameState("SETUP");
    } finally {
      setIsGenerating(false);
    }
  };

  const startGame = async () => {
    setGameState("LOADING"); // Transition to loading IMMEDIATELY to prevent state bleed
    setCursor(0);
    setRoomBuzzes([]);
    setPointsEarned({});
    setWrongSelections(new Set());
    setBuzzActiveIdx(0);
    setBuzzResults({});
    setRoomStudents(prev => prev.map(s => ({ ...s, answered: false, lastAnswer: null })));

    if (activeRoomCode && questions.length > 0) {
      try {
        await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_buzzes", payload: {} })
        });
        await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
        });
        await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: questions[0] } })
        });
      } catch (e) {
        console.error("Game sync failed", e);
      }
    }

    setGameState("PLAYING");
    startTimer();
  };

  const startTimer = () => {
    setTimeLeft(timerDuration);
    setTimerActive(true);
  };

  const RF_CIRC = 125.66;
  const rfDashOffset = timerDuration > 0 ? RF_CIRC * (1 - timeLeft / timerDuration) : 0;
  const rfTimerUrgent = timeLeft <= 10 && timerDuration > 0 && timerActive;

  const nextQuestion = async () => {
    if (cursor + 1 >= questions.length) {
      setGameState("FINISHED");
      setTimerActive(false);
    } else {
      setGameState("LOADING"); // Transition to loading IMMEDIATELY to prevent state bleed
      const nextIdx = cursor + 1;
      setCursor(nextIdx);
      setRoomBuzzes([]);
      setPointsEarned({});
      setWrongSelections(new Set());
      setBuzzActiveIdx(0);
      setBuzzResults({});
      setRoomStudents(prev => prev.map(s => ({ ...s, answered: false, lastAnswer: null })));

      if (activeRoomCode) {
        // We stay in current state or transition to a loading-like state if needed,
        // essentially we wait for the network to clear before allowing PLAYING logic to re-run.
        try {
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "clear_buzzes", payload: {} })
          });
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
          });
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: questions[nextIdx] } })
          });
        } catch (e) {
          console.error("Next question sync failed", e);
        }
      }

      setGameState("PLAYING");
      startTimer();
    }
  };

  const handleReveal = async () => {
    setTimerActive(false);
    setShowTimesUp(false);
    setGameState("REVEALED");

    if (activeRoomCode) {
      // Send reveal action
      await fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
      }).catch(() => {});

      // Fetch fresh room data for accurate scoring
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const freshData = await res.json();
          const freshStudents = freshData.students || [];
          setRoomStudents(freshStudents);
          setRoomData(freshData);

          // Auto-scoring for MC mode
          if (rfMode === "mc" && currentQ) {
            const answeredStudents = freshStudents.filter((s: any) => s.answered && s.lastAnswer);
            const correctAnswers: any[] = [];
            const wrongAnswers: any[] = [];

            answeredStudents.forEach((s: any) => {
              const isCorrect = s.lastAnswer === currentQ.correctLetter;
              if (isCorrect) correctAnswers.push(s);
              else wrongAnswers.push(s);
            });

            correctAnswers.sort((a: any, b: any) => (a.answerTime || 0) - (b.answerTime || 0));

            const newPointsEarned: Record<string, number> = {};

            correctAnswers.forEach((s: any, idx: number) => {
              let pts = 100;
              if (idx === 0) pts = 500;
              else if (idx === 1) pts = 400;
              else if (idx === 2) pts = 300;
              else if (idx === 3) pts = 200;

              newPointsEarned[s.id] = pts;
              const team = currentTeams.find(t => t.name === s.name || t.students.some(ts => ts.name === s.name));
              if (team) updateTeamScore(team.id, pts);
            });

            if (penalizeWrong) {
              wrongAnswers.forEach((s: any) => {
                newPointsEarned[s.id] = -100;
                const team = currentTeams.find(t => t.name === s.name || t.students.some(ts => ts.name === s.name));
                if (team) updateTeamScore(team.id, -100);
              });
            }

            setPointsEarned(newPointsEarned);
          }
        }
      } catch (e) {
        console.error("Failed to fetch fresh data for scoring", e);
      }
    }
  };

  // Helper: find team for a given student/team name
  const findTeamForName = (name: string) => {
    return currentTeams.find(t => t.name === name || t.students.some(s => s.name === name));
  };

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

  const currentQ = questions[cursor];
  const TEAM_COLORS = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];

  return (
    <>
      {/* Setup / Loading overlay */}
      {(gameState === "SETUP" || gameState === "LOADING" || gameState === "READY") && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>⚡</div>
              <div>
                <div className={styles.setupTitleText}>Rapid Fire</div>
                <div className={styles.setupTitleSub}>Speed Answer Challenge</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <MultiplayerHost gameMode="rapidfire" />
              </div>
            </div>

            {gameState === "LOADING" ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Generating questions...</div>
              </div>
            ) : gameState === "READY" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: 'var(--font-mono, JetBrains Mono, monospace)', fontSize: 12, color: 'var(--muted, #4a637d)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Review Questions
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      onClick={() => {
                        const title = prompt("Name this question set:", topic);
                        if (title) {
                          saveBoard({ title, topic, gameType: 'rapid-fire', content: questions });
                          alert("Set saved!");
                        }
                      }}
                      style={{ background: 'var(--surface2, #131b2b)', border: '1px solid var(--border2, #243347)', borderRadius: 8, padding: '8px 14px', color: 'var(--text, #dce8f5)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, cursor: 'pointer' }}
                    >
                      Save Set
                    </button>
                    <button onClick={startGame} className={styles.btnGenerate}>
                      Approve &amp; Start
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {questions.map((q, i) => (
                    <div key={i} style={{ background: 'var(--surface2, #131b2b)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border2, #243347)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text, #dce8f5)', fontSize: 14 }}>{i + 1}. {q.text}</div>
                        <div style={{ color: 'var(--muted, #4a637d)', fontSize: 12, marginTop: 4 }}>Answer: {q.answer}</div>
                      </div>
                      <button
                        title="Replace this question"
                        onClick={() => replaceQuestion(i)}
                        style={{ background: 'rgba(255,77,143,0.08)', border: '1px solid rgba(255,77,143,0.25)', borderRadius: 6, padding: '4px 10px', color: '#ff4d8f', fontFamily: 'var(--font-mono, monospace)', fontSize: 13, cursor: 'pointer', flexShrink: 0, lineHeight: 1.4 }}
                      >
                        ↺
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Sports, History, Science..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateGame()}
                    autoFocus
                  />
                </div>
                <div className={styles.setupRow}>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Level</div>
                    <select className={styles.setupSelect} value={targetLevel} onChange={e => setTargetLevel(e.target.value)}>
                      <option value="Low">Low (A1)</option>
                      <option value="Mid">Mid (A2)</option>
                      <option value="High">High (B1)</option>
                      <option value="Mixed">Mixed Level</option>
                    </select>
                  </div>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Mode</div>
                    <select className={styles.setupSelect} value={rfMode} onChange={e => setRfMode(e.target.value as RFMode)}>
                      <option value="buzzer">Buzzer</option>
                      <option value="mc">Multiple Choice</option>
                    </select>
                  </div>
                </div>
                <div className={styles.setupRow}>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Timer per Question</div>
                    <select className={styles.setupSelect} value={timerDuration} onChange={e => setTimerDuration(Number(e.target.value))}>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                      <option value={20}>20 seconds</option>
                      <option value={30}>30 seconds</option>
                    </select>
                  </div>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Penalty</div>
                    <select className={styles.setupSelect} value={String(penalizeWrong)} onChange={e => setPenalizeWrong(e.target.value === 'true')}>
                      <option value="false">No penalty</option>
                      <option value="true">Deduct points</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className={styles.btnGenerate} onClick={generateGame} disabled={!topic.trim()}>
                    <Sparkles size={16} /> Generate Questions
                  </button>
                  <BoardLibrary currentGameType="rapidfire" onLoadBoard={handleLoadBoard} />
                  <button
                    style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 10, padding: '14px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}
                    onClick={() => router.push('/games')}
                  >
                    ← Back to Arcade
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
              <MultiplayerHost gameMode="rapidfire" forceShow />
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
                        {currentTeams.map((team, tIdx) => {
                          const teamColor = TEAM_COLORS[tIdx % 7];
                          const submitted = roomStudents.some((s: any) =>
                            (s.name === team.name || team.students.some((ts: any) => ts.name === s.name)) && s.answered
                          );
                          return (
                            <div
                              key={team.id}
                              className={`${styles.rfChip}${submitted ? '' : ` ${styles.rfChipWaiting}`}`}
                              style={submitted ? { borderColor: teamColor, color: teamColor, background: `${teamColor}14` } : {}}
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
                          const pts = [500, 400, 300, 200];
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
