"use client";

import { useState, useEffect } from "react";
import { useClassroomStore, SavedBoard } from "../store/useClassroomStore";
import { Play, Zap, FastForward, Eye, ChevronRight, Sparkles } from "lucide-react";
import styles from "./rapid-fire.module.css";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";
import GameSettingsDrawer from "../components/GameSettingsDrawer";
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

  const handleLoadBoard = (saved: SavedBoard) => {
    setQuestions(saved.content as RapidFireQuestion[]);
    setTopic(saved.topic);
    setGameState("READY");
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

  const timerMax = timerDuration;

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

  const currentQ = questions[cursor];

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
                    <div key={i} style={{ background: 'var(--surface2, #131b2b)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border2, #243347)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text, #dce8f5)', fontSize: 14 }}>{i + 1}. {q.text}</div>
                      <div style={{ color: 'var(--muted, #4a637d)', fontSize: 12, marginTop: 4 }}>Answer: {q.answer}</div>
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
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game view */}
      {(gameState === "PLAYING" || gameState === "REVEALED" || gameState === "FINISHED") && (
        <div className={styles.page}>
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>Rapid Fire</div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>
              Q <span className={styles.qCounterNum}>{cursor + 1}</span> / {questions.length}
            </div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>{rfMode === 'mc' ? 'Multiple Choice' : 'Buzzer'}</div>
            <div className={styles.headerSpacer} />
            {timerDuration > 0 && gameState !== "FINISHED" && (
              <div className={styles.timerWrap}>
                <div className={`${styles.timerNum} ${timeLeft <= 5 && timerActive ? styles.timerNumUrgent : ''}`}>
                  {timeLeft}
                </div>
                <div className={styles.timerBar}>
                  <div
                    className={`${styles.timerBarFill} ${timeLeft <= 5 && timerActive ? styles.timerBarFillUrgent : ''}`}
                    style={{ width: `${timerDuration > 0 ? (timeLeft / timerDuration) * 100 : 100}%` }}
                  />
                </div>
              </div>
            )}
            <button
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={() => setGameState("SETUP")}
            >
              ← New Game
            </button>
          </div>
          <div className={styles.gameContent} style={{ padding: 0, alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'hidden' }}>

            {gameState === "FINISHED" ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
                <h1 style={{ fontSize: "4rem", color: "#00c8f0", fontWeight: 900, margin: 0 }}>Game Over!</h1>
                <button
                  className={styles.btnGenerate}
                  onClick={() => setGameState("SETUP")}
                >
                  New Game
                </button>
              </div>
            ) : currentQ && (
              <div className={styles.canvasLeft}>
                <div className={styles.gameSplit}>
                  {/* Left Column: Question Area */}
                  <div className={styles.leftCol}>
                    <div className={styles.seqLabel}>
                       QUESTION_0{cursor + 1} // {currentQ.level.toUpperCase()} Lvl — {currentQ.type.toUpperCase()}
                    </div>

                    <div className={styles.mainSentence}>
                      {currentQ.text}
                    </div>

                    {/* MC Mode: Show options on projector */}
                    {rfMode === "mc" && currentQ.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: '800px', marginTop: '1rem' }}>
                        {(["A", "B", "C", "D"] as const).map(letter => {
                          const isRevealed = gameState === "REVEALED";
                          const isCorrect = currentQ.correctLetter === letter;
                          return (
                            <div
                              key={letter}
                              onClick={() => {
                                if (gameState !== "PLAYING") return;
                                if (letter === currentQ.correctLetter) {
                                  handleReveal();
                                } else {
                                  setWrongSelections(prev => new Set(prev).add(letter));
                                }
                              }}
                              style={{
                                padding: '1.5rem 2rem',
                                borderRadius: '16px',
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                background: isRevealed && isCorrect ? 'rgba(34,197,94,0.2)' :
                                           wrongSelections.has(letter) ? 'rgba(239, 68, 68, 0.2)' :
                                           'rgba(255,255,255,0.05)',
                                border: `2px solid ${isRevealed && isCorrect ? '#22c55e' :
                                                  wrongSelections.has(letter) ? '#ef4444' :
                                                  'rgba(255,255,255,0.1)'}`,
                                color: isRevealed && isCorrect ? '#22c55e' :
                                       wrongSelections.has(letter) ? '#ef4444' :
                                       'white',
                                opacity: isRevealed && !isCorrect ? 0.3 : 1,
                                transition: 'all 0.3s',
                                cursor: gameState === "PLAYING" ? 'pointer' : 'default'
                              }}
                            >
                              <span style={{ fontWeight: 900, marginRight: '0.75rem', opacity: 0.5 }}>{letter}.</span>
                              {currentQ.options![letter as keyof typeof currentQ.options]}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Buzzer Mode: Answer Box */}
                    {rfMode === "buzzer" && (
                      <div
                        className={styles.answerText}
                        onClick={() => { if (gameState === "PLAYING") handleReveal(); }}
                        style={{
                          cursor: gameState === "PLAYING" ? 'pointer' : 'default',
                          opacity: gameState === "REVEALED" ? 1 : 0.05,
                          transition: 'opacity 0.3s'
                        }}
                      >
                        {gameState === "REVEALED" ? `ANSWER: ${currentQ.answer}` : `[HOST_TOOLTIP: ${currentQ.answer}]`}
                      </div>
                    )}

                    <div className={styles.techControls} style={{ marginTop: '2rem' }}>
                       {gameState !== "REVEALED" ? (
                         <button className={styles.btnSolid} onClick={handleReveal}>
                           <Sparkles size={18} /> INITIATE REVEAL
                         </button>
                       ) : (
                         <button className={styles.btnOutline} onClick={nextQuestion}>
                           {cursor + 1 >= questions.length ? "FINISH SEQUENCE \u2714" : "NEXT SEQUENCE \u27A1"}
                         </button>
                       )}
                    </div>
                  </div>

                  {/* Right Column: Sidebar (Logs, Buzzes, Status) */}
                  <div className={styles.rightCol}>
                    <div className={styles.systemLog}>
                       <div className={styles.logHeader}>SYSTEM_LOG_v4.2</div>
                       <div className={styles.logBody}>
                         <span style={{ color: '#ff3366' }}>[INIT]</span> Sequence activated.<br/>
                         {">"} Awaiting network node responses...<br/>

                         {rfMode === "buzzer" && roomBuzzes.map((b:any, idx:number) => {
                            const studentName = roomStudents.find((s:any) => s.id === b.studentId)?.name || 'Unknown Node';
                            return (
                              <div key={idx} style={{ color: '#ff3366' }}>
                                {">"} [BUZZ] {studentName} at {(b.timestamp - roomData?.questionStartTime)/1000}s!
                              </div>
                            );
                         })}

                         {gameState === "REVEALED" && Object.entries(pointsEarned).map(([studentId, pts]) => {
                            const studentName = roomStudents.find((s:any) => s.id === studentId)?.name || 'Unknown Node';
                            return (
                              <div key={studentId} style={{ color: pts > 0 ? '#ff3366' : '#ef4444' }}>
                                 {">"} [SCORE] {studentName} {pts > 0 ? `+${pts}` : pts} pts.
                              </div>
                            );
                         })}
                         <br/>
                         <span style={{ opacity: 0.5 }}>{">"} COMMAND_PROMPT_WAITING_</span>
                       </div>
                    </div>

                    {/* Pre-reveal Status Cards */}
                    {gameState !== "REVEALED" && rfMode === "mc" && activeRoomCode && roomStudents.length > 0 && (
                      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#ff3366', fontFamily: 'monospace', fontSize: '0.7rem' }}>// NETWORK_STATUS: {roomStudents.filter((s:any) => s.answered).length} LOCKED</h3>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {roomStudents.map((s: any, i: number) => (
                            <div key={i} style={{
                              padding: '0.3rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: s.answered ? 'rgba(255, 51, 102, 0.1)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${s.answered ? '#ff3366' : 'rgba(255,255,255,0.05)'}`,
                              opacity: s.answered ? 1 : 0.4,
                              color: s.answered ? '#ff3366' : 'white'
                            }}>
                              {s.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Post-reveal Responses (MC only) */}
                    {gameState === "REVEALED" && rfMode === "mc" && activeRoomCode && roomStudents.filter((s: any) => s.answered).length > 0 && (
                      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#ff3366', fontFamily: 'monospace', fontSize: '0.7rem' }}>// NETWORK_RESPONSES</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {roomStudents.filter((s: any) => s.answered).map((s: any, i: number) => {
                            const isCorrect = currentQ && s.lastAnswer === currentQ.correctLetter;
                            return (
                              <div key={i} style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${isCorrect ? '#ff3366' : 'rgba(255,0,0,0.3)'}`, borderRadius: '4px' }}>
                                <div style={{ fontWeight: 800, color: isCorrect ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{s.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{s.lastAnswer}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
