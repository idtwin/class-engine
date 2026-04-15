"use client";

import { useState, useEffect } from "react";
import styles from "./odd.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles, Lightbulb, ChevronRight } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";
import BoardLibrary from "../components/BoardLibrary";
import { SavedBoard } from "../store/useClassroomStore";

type Phase = "SETUP" | "GENERATING" | "READY" | "PLAYING";
type Question = { level: string, words: string[], answer: string, hint: string };

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function OddOneOut() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, getActiveApiKey, getActiveModel, llmProvider, activeRoomCode, saveBoard } = useClassroomStore();
  
  const handleLoadBoard = (saved: SavedBoard) => {
    setQuestions(saved.content);
    setTopic(saved.topic);
    setCurrentIndex(0);
    setTimerActive(true);
  };
  
  const [topic, setTopic] = useState("");
  const [levelFilter, setLevelFilter] = useState("Mixed Level");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [phase, setPhase] = useState<Phase>("SETUP");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [penalizeWrong, setPenalizeWrong] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimesUp, setShowTimesUp] = useState(false);
  const [timerDuration, setTimerDuration] = useState(20);

  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);


  // Poll for student responses
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomData(data);
          setRoomStudents(data.students || []);
        }
      } catch (e) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  // Auto-reveal when all teams have answered
  useEffect(() => {
    if (!activeRoomCode || !currentQ || showAnswer) return;
    if (roomStudents.length === 0) return;
    
    // Get unique team IDs from connected students
    const teamIds = new Set(roomStudents.map((s: any) => s.teamId).filter(Boolean));
    if (teamIds.size === 0) return;
    
    // Check if every team has at least one answered student
    const allTeamsAnswered = [...teamIds].every(teamId => 
      roomStudents.some((s: any) => s.teamId === teamId && s.answered)
    );
    
    if (allTeamsAnswered) {
      handleReveal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // @ts-ignore — handleReveal is declared after early return but is in scope at runtime
  }, [roomStudents, showAnswer, handleReveal]);

  // Timer countdown — show TIME'S UP but do NOT auto-reveal
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setShowTimesUp(true);
      setTimeout(() => setShowTimesUp(false), 3000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const handleGenerate = async () => {
    
    
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setPhase("GENERATING");
    setQuestions(null);
    setCurrentIndex(0);
    setSelectedWord(null);
    setShowHint(false);
    setShowAnswer(false);
    setPointsEarned({});

    try {
      if (activeRoomCode) {
        await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
        });
      }

      const res = await fetch("/api/generate-odd-one-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          mistralModel: getActiveModel(),
          provider: llmProvider,
          topic,
          level: levelFilter
        })
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        const shuffled = data.questions.map((q: Question) => ({ ...q, words: shuffleArray(q.words) }));
        setQuestions(shuffled);
        setCurrentIndex(0);
        setPhase("READY");
      } else {
        setPhase("SETUP");
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      setPhase("SETUP");
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const handleLaunch = async () => {
    if (activeRoomCode) {
      try {
        const r1 = await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "set_game_mode", payload: { gameMode: "oddoneout" } })
        });
        if (!r1.ok) { alert("Failed to sync game mode. Please try again."); return; }

        const r2 = await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "update_status", payload: { status: "playing" } })
        });
        if (!r2.ok) { alert("Failed to update room status. Please try again."); return; }

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
      } catch {
        alert("Network error during launch. Please try again.");
        return;
      }
    }
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setPhase("PLAYING");
  };

  const handleReveal = async () => {
    setTimerActive(false);
    setShowTimesUp(false);
    setShowAnswer(true);

    if (activeRoomCode) {
      await fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: { answer: currentQ?.answer, explanation: currentQ?.hint } })
      }).catch(() => {});

      // Fetch fresh data for accurate scoring
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const freshData = await res.json();
          const freshStudents = freshData.students || [];
          setRoomStudents(freshStudents);
          setRoomData(freshData);
          scoreStudents(freshStudents, freshData);
        }
      } catch (e) {
        console.error("Failed to fetch fresh data for scoring", e);
        scoreStudents(roomStudents, roomData);
      }
    } else {
      scoreStudents(roomStudents, roomData);
    }
  };

  const scoreStudents = (students: any[], data: any) => {
    const answeredStudents = students.filter((s: any) => s.answered && s.lastAnswer);
    const correctAnswers: any[] = [];
    const wrongAnswers: any[] = [];
    
    answeredStudents.forEach((s: any) => {
      const isCorrect = currentQ && s.lastAnswer === currentQ.answer;
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
  };

  const nextQuestion = async () => {
    if (questions && currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      
      // Reset local state first
      setShowAnswer(false);
      setSelectedWord(null);
      setShowHint(false);
      setPointsEarned({});
      setRoomStudents(prev => prev.map(s => ({ ...s, answered: false, lastAnswer: null })));

      // Push new words to Redis + clear answers (shuffle & strip answer)
      if (activeRoomCode && questions[nextIdx]) {
        try {
          const nextQ = questions[nextIdx];
          const studentQ = { ...nextQ, words: shuffleArray(nextQ.words), answer: undefined, hint: undefined };
          
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
          });
          
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: studentQ } })
          });
        } catch (e) {
          console.error("Sync Error", e);
        }
      }

      // Finally move the index to trigger the host UI update
      setCurrentIndex(nextIdx);
      setTimeLeft(timerDuration);
      setTimerActive(true);
    }
  };

  const currentQ = questions?.[currentIndex];

  const timerDur = timerDuration;
  const timerPct = timerDur > 0 ? (timeLeft / timerDur) * 100 : 100;
  const timerUrgent = timeLeft <= 5 && timerDur > 0 && timerActive;

  return (
    <>
      {/* Setup overlay — shown when no questions yet */}
      {(phase === "SETUP" || phase === "GENERATING" || phase === "READY") && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>🔮</div>
              <div>
                <div className={styles.setupTitleText}>Odd One Out</div>
                <div className={styles.setupTitleSub}>Word Pattern Recognition</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <MultiplayerHost gameMode="oddoneout" />
              </div>
            </div>

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
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Planets, Animals, Sports..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isGenerating && handleGenerate()}
                    autoFocus
                  />
                </div>
                <div className={styles.setupRow}>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Difficulty</div>
                    <select className={styles.setupSelect} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                      <option value="Mixed Level">Mixed Level</option>
                      <option value="Low">Low (A1)</option>
                      <option value="Mid">Mid (A2)</option>
                      <option value="High">High (B1)</option>
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
                      <option value={45}>45 seconds</option>
                    </select>
                  </div>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Penalty for Wrong</div>
                    <select className={styles.setupSelect} value={String(penalizeWrong)} onChange={e => setPenalizeWrong(e.target.value === 'true')}>
                      <option value="false">No penalty</option>
                      <option value="true">Deduct points</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim()}>
                    <Sparkles size={16} /> Generate Sets
                  </button>
                  <BoardLibrary currentGameType="oddoneout" onLoadBoard={handleLoadBoard} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game view */}
      {phase === "PLAYING" && questions && (
        <div className={styles.page}>
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>Odd One Out</div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>
              Q <span className={styles.qCounterNum}>{currentIndex + 1}</span> / {questions.length}
            </div>
            <div className={styles.headerSpacer} />
            {timerDur > 0 && (
              <div className={styles.timerWrap}>
                <div className={`${styles.timerNum} ${timerUrgent ? styles.timerNumUrgent : ''}`}>
                  {timeLeft}
                </div>
                <div className={styles.timerBar}>
                  <div
                    className={`${styles.timerBarFill} ${timerUrgent ? styles.timerBarFillUrgent : ''}`}
                    style={{ width: `${timerPct}%` }}
                  />
                </div>
              </div>
            )}
            <button
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={() => { setPhase("SETUP"); setQuestions(null); setCurrentIndex(0); setShowAnswer(false); setSelectedWord(null); setShowHint(false); setPointsEarned({}); }}
            >
              ← New Game
            </button>
          </div>
          <div className={styles.gameContent}>
            <div className={styles.canvasLeft}>
              <div className={styles.gameSplit}>
                {/* Left Column: Primary Game Area */}
                <div className={styles.leftCol}>
                  <div className={styles.leftDecor}>
                    LAT: 40.7128° N<br/>LNG: 74.0060° W<br/>STREAM: ENCRYPTED
                  </div>

                  <div className={styles.seqLabel}>
                    SEQUENCE_0{currentIndex + 1} // {currentQ?.level.toUpperCase()}
                  </div>

                  <div className={styles.questionTimerRow}>
                    <h2 className={styles.mainSentence}>
                      ISOLATE THE ANOMALY.
                    </h2>
                    <GameTimer
                      timeLeft={timeLeft}
                      totalTime={timerDuration}
                      variant="circle"
                      showTimesUp={showTimesUp}
                      className={styles.timerBig}
                    />
                  </div>

                  <div className={styles.wordsGrid}>
                    {currentQ?.words.map((w, i) => {
                      const isSelected = selectedWord === w || (showAnswer && w === currentQ.answer);
                      const isCorrectAnswer = w === currentQ.answer;

                      let cardClass = styles.wordCard;
                      if (isSelected) {
                        if (isCorrectAnswer) cardClass += ` ${styles.wordCorrect}`;
                        else cardClass += ` ${styles.wordWrong}`;
                      } else if (showAnswer && !isCorrectAnswer) {
                        cardClass += ` opacity-50`;
                      }

                      return (
                        <div
                          key={i}
                          className={cardClass}
                          style={showAnswer && !isCorrectAnswer ? { opacity: 0.3 } : {}}
                          onClick={() => {
                            if (showAnswer) return;
                            setSelectedWord(w);
                            if (w === currentQ.answer) {
                              handleReveal();
                            }
                          }}
                        >
                          {w}
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.techControls}>
                    {!showAnswer ? (
                      <button className={styles.btnSolidMagenta} onClick={handleReveal}>
                        <Sparkles size={18} /> INITIATE REVEAL
                      </button>
                    ) : (
                      <button className={styles.btnOutlineMagenta} onClick={nextQuestion} disabled={currentIndex === questions.length - 1}>
                        NEXT SEQUENCE <ChevronRight size={18} />
                      </button>
                    )}

                    <button className={styles.btnOutlineMagenta} style={{ borderStyle: 'dashed' }} onClick={() => setShowHint(true)} disabled={showHint || showAnswer}>
                      <Lightbulb size={18} /> DEPLOY HINT
                    </button>
                  </div>
                </div>

                {/* Right Column: Sidebar (Logs, Elimination, responses) */}
                <div className={styles.rightCol}>
                  <div className={styles.systemLog}>
                    <div className={styles.logHeader}>SYSTEM_LOG_v4.2</div>
                    <div className={styles.logBody}>
                      <span style={{ color: '#BC13FE' }}>[INIT]</span> Sequence array generated.<br/>
                      {">"} Awaiting anomaly detection...<br/>
                      {showHint && <><span style={{color: 'white'}}>{">"} SYSTEM_HINT: {currentQ?.hint}</span><br/></>}

                      {roomStudents.filter((s:any) => s.answered).map((s:any, idx:number) => (
                        <div key={idx} style={{ color: 'var(--accent-cyan)' }}>
                          {">"} [SIGNAL LOCKED] {s.name} response registered.
                        </div>
                      ))}

                      {showAnswer && <><span style={{color: '#BC13FE'}}>{">"} [ISOLATED] '{currentQ?.answer}' confirmed.</span><br/></>}

                      {showAnswer && Object.entries(pointsEarned).map(([studentId, pts]) => {
                        const studentName = roomStudents.find((s:any) => s.id === studentId)?.name || 'Unknown Node';
                        return (
                          <div key={studentId} style={{ color: pts > 0 ? '#BC13FE' : '#ef4444' }}>
                            {">"} [SCORE] {studentName} {pts > 0 ? `+${pts}` : pts} pts.
                          </div>
                        );
                      })}
                      <br/>
                      <span style={{ opacity: 0.5 }}>{">"} COMMAND_PROMPT_WAITING_</span>
                    </div>
                  </div>

                  {/* Pre-reveal Lock-in Status */}
                  {!showAnswer && activeRoomCode && roomStudents.length > 0 && (
                    <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3 style={{ marginBottom: '1rem', color: '#BC13FE', fontFamily: 'monospace', fontSize: '0.7rem' }}>// NETWORK_STATUS: {roomStudents.filter((s:any) => s.answered).length} LOCKED</h3>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {roomStudents.map((s: any, i: number) => (
                          <div key={i} style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: s.answered ? 'rgba(188, 19, 254, 0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${s.answered ? '#BC13FE' : 'rgba(255,255,255,0.05)'}`,
                            opacity: s.answered ? 1 : 0.4,
                            color: s.answered ? '#BC13FE' : 'white'
                          }}>
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Post-reveal Responses */}
                  {showAnswer && activeRoomCode && roomStudents.filter((s: any) => s.answered).length > 0 && (
                    <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3 style={{ marginBottom: '1rem', color: '#BC13FE', fontFamily: 'monospace', fontSize: '0.7rem' }}>// NETWORK_RESPONSES</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {roomStudents.filter((s: any) => s.answered).map((s: any, i: number) => {
                          const isCorrect = currentQ && s.lastAnswer === currentQ.answer;
                          return (
                            <div key={i} style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${isCorrect ? '#BC13FE' : 'rgba(255,0,0,0.3)'}`, borderRadius: '4px' }}>
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
          </div>
        </div>
      )}
    </>
  );
}
