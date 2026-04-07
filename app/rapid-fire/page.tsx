"use client";

import { useState, useEffect } from "react";
import { useClassroomStore, Level } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Play, Zap, FastForward, Loader2, Eye, ChevronRight } from "lucide-react";
import styles from "./rapid-fire.module.css";
import MultiplayerHost from "../components/MultiplayerHost";

interface RapidFireQuestion {
  text: string;
  answer: string;
  level: Level;
  type: string;
  options?: { A: string; B: string; C: string; D: string };
  correctLetter?: string;
}

type GameState = "SETUP" | "LOADING" | "READY" | "PLAYING" | "REVEALED" | "FINISHED";
type RFMode = "buzzer" | "mc";

export default function RapidFire() {
  const { currentTeams, updateTeamScore, geminiKey, ollamaModel, llmProvider, triggerTwist, activeRoomCode } = useClassroomStore();
  const [mounted, setMounted] = useState(false);
  const [roomBuzzes, setRoomBuzzes] = useState<any[]>([]);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);
  
  const [gameState, setGameState] = useState<GameState>("SETUP");
  const [rfMode, setRfMode] = useState<RFMode>("buzzer");
  const [topic, setTopic] = useState("");
  const [targetLevel, setTargetLevel] = useState<Level>("Mid");
  const [questions, setQuestions] = useState<RapidFireQuestion[]>([]);
  const [cursor, setCursor] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(false);

  const [penalizeWrong, setPenalizeWrong] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<Record<string, number>>({});

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
      // Auto-reveal when timer expires in MC mode
      if (rfMode === "mc" && gameState === "PLAYING") {
        handleReveal();
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

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
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.homeBtn}><ArrowLeft size={20} /> Dashboard</Link>
          <h2>Rapid Fire</h2>
          <div style={{width: 100}}></div>
        </header>
        <div className={styles.setupContainer}>
          <h1>No Teams Found</h1>
          <p>You must generate teams in the Dashboard before playing.</p>
        </div>
      </div>
    );
  }

  const generateGame = async () => {
    if (!topic || !geminiKey) return alert("Missing topic or Gemini API Key (set in Dashboard).");
    setGameState("LOADING");
    
    try {
      const res = await fetch("/api/generate-rapid-fire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, ollamaModel, provider: llmProvider, llmProvider, topic, level: targetLevel, mode: rfMode })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setQuestions(data.questions);
      setGameState("READY");
    } catch (err: any) {
      alert("Failed: " + err.message);
      setGameState("SETUP");
    }
  };

  const startGame = () => {
    setCursor(0);
    setGameState("PLAYING");
    startTimer();
    setRoomBuzzes([]);
    setPointsEarned({});
    // Push first question to Redis
    if (activeRoomCode && questions.length > 0) {
      fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "clear_buzzes", payload: {} })
      }).then(() => {
        fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: questions[0] } })
        });
      }).catch(() => {});
    }
  };

  const startTimer = () => {
    setTimeLeft(rfMode === "mc" ? 20 : 15);
    setTimerActive(true);
  };

  const timerMax = rfMode === "mc" ? 20 : 15;

  const nextQuestion = () => {
    if (cursor + 1 >= questions.length) {
      setGameState("FINISHED");
      setTimerActive(false);
    } else {
      const nextIdx = cursor + 1;
      setCursor(nextIdx);
      setGameState("PLAYING");
      startTimer();
      setRoomBuzzes([]);
      setPointsEarned({});
      // Push next question + clear buzzes/answers
      if (activeRoomCode) {
        fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_buzzes", payload: {} })
        }).then(() => {
          fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
          }).then(() => {
            fetch("/api/room/action", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: questions[nextIdx] } })
            });
          });
        }).catch(() => {});
      }
    }
  };

  const handleReveal = async () => {
    setTimerActive(false);
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
    <div className={styles.container} style={{ paddingBottom: '220px' }}>
      <header className={styles.header}>
        <Link href="/games" className={styles.homeBtn}><ArrowLeft size={20} /> Exit Game</Link>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", textTransform: "uppercase" }}>Game</div>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>Rapid Fire {rfMode === "mc" ? "— MC" : "— Buzzer"}</div>
        </div>
        <MultiplayerHost gameMode="rapidfire" />
        {gameState !== "SETUP" && gameState !== "LOADING" && gameState !== "FINISHED" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", textTransform: "uppercase" }}>Round</div>
            <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{cursor + 1} of {questions.length}</div>
          </div>
        )}
      </header>

      {gameState === "SETUP" && (
        <div className={styles.setupContainer}>
          <div className={styles.formBox}>
            <h1 style={{ textAlign: "center" }}>Rapid Fire Setup</h1>
            
            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: '0', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '0.4rem', marginBottom: '0.5rem' }}>
              <button
                onClick={() => setRfMode("buzzer")}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem',
                  background: rfMode === "buzzer" ? 'var(--accent)' : 'transparent',
                  color: rfMode === "buzzer" ? '#111' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s'
                }}
              >
                🔔 Buzzer Mode
              </button>
              <button
                onClick={() => setRfMode("mc")}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem',
                  background: rfMode === "mc" ? '#3b82f6' : 'transparent',
                  color: rfMode === "mc" ? '#fff' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s'
                }}
              >
                📝 Multiple Choice
              </button>
            </div>
            <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem', marginTop: '-0.5rem' }}>
              {rfMode === "buzzer" ? "Students buzz in — teacher judges answer verbally." : "Students pick A/B/C/D on phones — auto-scored by speed."}
            </p>
            
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>Topic / Target Language</label>
              <input 
                className={styles.input} 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)} 
                placeholder="e.g. Past tense irregular verbs, Food vocabulary..." 
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>Class Level</label>
              <select className={styles.select} value={targetLevel} onChange={(e) => setTargetLevel(e.target.value as Level)}>
                <option value="Low">Low (Beginner)</option>
                <option value="Mid">Mid (Intermediate)</option>
                <option value="High">High (Advanced)</option>
              </select>
            </div>
            
            {rfMode === "mc" && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                <input type="checkbox" id="penaltyModeRF" checked={penalizeWrong} onChange={e => setPenalizeWrong(e.target.checked)} />
                <label htmlFor="penaltyModeRF" style={{ cursor: 'pointer', userSelect: 'none' }}>Penalty for Wrong Answers (-100 pts)</label>
              </div>
            )}
            
            <button className={styles.btn} onClick={generateGame} disabled={!geminiKey}>
              {geminiKey ? "Generate Questions" : "API Key Missing (View Dashboard Settings)"}
            </button>
          </div>
        </div>
      )}

      {gameState === "LOADING" && (
        <div className={styles.setupContainer}>
          <Loader2 size={64} className={styles.spin} style={{ color: "var(--accent)" }} />
          <h2>{rfMode === "mc" ? "Crafting Multiple Choice Questions..." : "Generating High-Speed Questions..."}</h2>
        </div>
      )}

      {gameState === "READY" && (
        <div className={styles.setupContainer}>
          <h1 style={{ fontSize: "3rem" }}>{questions.length} Questions Generated!</h1>
          <p style={{ opacity: 0.5, fontSize: '1.2rem' }}>Mode: {rfMode === "mc" ? "📝 Multiple Choice (Auto-Scored)" : "🔔 Buzzer"}</p>
          <button className={styles.btn} style={{ fontSize: "2rem", padding: "1.5rem 4rem", borderRadius: "50px", display: 'flex', alignItems: 'center' }} onClick={startGame}>
            <Play fill="currentColor" size={32} style={{ marginRight: "1rem" }}/> START
          </button>
        </div>
      )}

      {(gameState === "PLAYING" || gameState === "REVEALED") && currentQ && (
        <div className={styles.gameContainer}>
          
          <div className={styles.questionBox}>
            <span className={styles.metadataBadge}>
               Question {cursor + 1} — {currentQ.level} Lvl — {currentQ.type}
            </span>
            <div className={styles.questionText}>
              {currentQ.text}
            </div>

            {/* MC Mode: Show options on projector */}
            {rfMode === "mc" && currentQ.options && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: '800px', marginTop: '1rem' }}>
                {(["A", "B", "C", "D"] as const).map(letter => {
                  const isRevealed = gameState === "REVEALED";
                  const isCorrect = currentQ.correctLetter === letter;
                  return (
                    <div key={letter} style={{
                      padding: '1.5rem 2rem',
                      borderRadius: '16px',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      background: isRevealed && isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${isRevealed && isCorrect ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                      color: isRevealed && isCorrect ? '#22c55e' : 'white',
                      opacity: isRevealed && !isCorrect ? 0.3 : 1,
                      transition: 'all 0.3s'
                    }}>
                      <span style={{ fontWeight: 900, marginRight: '0.75rem', opacity: 0.5 }}>{letter}.</span>
                      {currentQ.options![letter as keyof typeof currentQ.options]}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Buzzer Mode: Show answer on reveal */}
            {rfMode === "buzzer" && gameState === "REVEALED" && (
              <div className={styles.answerText}>
                ANSWER: {currentQ.answer}
              </div>
            )}
            
            {rfMode === "buzzer" && gameState !== "REVEALED" && (
              <div style={{ height: "2.5rem" }}></div>
            )}

            {/* Buzz-in Banner (Buzzer Mode) */}
            {rfMode === "buzzer" && activeRoomCode && roomBuzzes.length > 0 && (
              <div style={{ width: '100%', padding: '1.5rem', borderRadius: '16px', background: 'rgba(45,212,191,0.1)', border: '2px solid var(--accent)', marginTop: '1rem' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: '0.75rem', fontSize: '1.2rem' }}>🔔 Buzz Order:</div>
                {roomBuzzes.sort((a: any, b: any) => a.time - b.time).map((b: any, i: number) => {
                  const team = findTeamForName(b.name);
                  return (
                    <div key={i} style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: i === 0 ? 900 : 400, 
                      color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)',
                      padding: '0.5rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderBottom: i < roomBuzzes.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                    }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                        color: i === 0 ? '#111' : 'rgba(255,255,255,0.5)',
                        fontWeight: 900, fontSize: '0.9rem'
                      }}>{i + 1}</span>
                      <span>{b.name}</span>
                      {team && <span style={{ fontSize: '0.85rem', opacity: 0.5, background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>Team: {team.name}</span>}
                      {i === 0 && <span>🏆</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* MC Mode: Locked-in progress (before reveal) */}
            {rfMode === "mc" && gameState === "PLAYING" && activeRoomCode && roomStudents.length > 0 && (
              <div style={{ marginTop: '1.5rem', width: '100%', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1rem', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>🔒 Locked In: {roomStudents.filter((s:any) => s.answered).length} / {roomStudents.length}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {roomStudents.map((s: any, i: number) => (
                    <div key={i} style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: s.answered ? 'rgba(45,212,191,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${s.answered ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                      transition: 'all 0.2s ease',
                      opacity: s.answered ? 1 : 0.5
                    }}>
                      {s.name} {s.answered && '✅'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MC Mode: Student responses (after reveal) */}
            {rfMode === "mc" && gameState === "REVEALED" && activeRoomCode && roomStudents.filter((s: any) => s.answered).length > 0 && (
              <div style={{ marginTop: '1.5rem', width: '100%', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--accent)' }}>📱 Student Responses</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                  {roomStudents.filter((s: any) => s.answered).map((s: any, i: number) => {
                    const isCorrect = currentQ && s.lastAnswer === currentQ.correctLetter;
                    const timeSeconds = (s.answerTime && roomData?.questionStartTime) ? ((s.answerTime - roomData.questionStartTime) / 1000).toFixed(1) + 's' : '';
                    const pts = pointsEarned[s.id];
                    const team = findTeamForName(s.name);

                    return (
                      <div key={i} style={{
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: `2px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                        background: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 800 }}>{s.name} {isCorrect ? '✅' : '❌'}</span>
                          <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 700 }}>
                            {pts !== undefined && <span style={{ color: pts > 0 ? '#22c55e' : '#ef4444', marginRight: '0.5rem', fontWeight: 900 }}>{pts > 0 ? `+${pts}` : pts} pts</span>}
                            {timeSeconds}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                          Picked: <strong>{s.lastAnswer}</strong>
                          {currentQ.options && s.lastAnswer && <span> — {currentQ.options[s.lastAnswer as keyof typeof currentQ.options]}</span>}
                          {team && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', opacity: 0.5 }}>({team.name})</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={styles.timerWrapper}>
            <div className={styles.timerBarContainer}>
               <div className={styles.timerBar} style={{ width: `${(timeLeft / timerMax) * 100}%` }}></div>
            </div>
            <div className={styles.timerNumber}>{timeLeft}s</div>
          </div>

          <div className={styles.teacherControls} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
             
             {gameState === "PLAYING" ? (
               <button className={styles.btn} onClick={handleReveal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', minWidth: '400px', justifyContent: 'center', background: 'var(--accent)' }}>
                 <Eye size={24} /> Reveal Answer
               </button>
             ) : (
               <button className={styles.btn} onClick={nextQuestion} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', minWidth: '400px', justifyContent: 'center', background: '#2ecc71' }}>
                 <FastForward size={24} /> Next Question
               </button>
             )}

             <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className={`${styles.controlBtn} ${styles.btnSkip}`} onClick={nextQuestion}>
                  <FastForward size={20} /> Skip
                </button>
                <button className={`${styles.controlBtn} ${styles.btnSkip}`} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={triggerTwist}>
                  <Zap size={20} /> Trigger Twist
                </button>
             </div>
          </div>

        </div>
      )}

      {gameState === "FINISHED" && (
        <div className={styles.setupContainer}>
          <h1 style={{ fontSize: "4rem", color: "var(--accent)" }}>Game Over!</h1>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
             <button className={styles.btn} style={{ marginTop: "2rem" }}>Return to Dashboard</button>
          </Link>
        </div>
      )}
    </div>
  );
}
