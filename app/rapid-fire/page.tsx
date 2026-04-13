"use client";

import { useState, useEffect } from "react";
import { useClassroomStore, SavedBoard } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Play, Zap, FastForward, Loader2, Eye, ChevronRight, Sparkles } from "lucide-react";
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
  const { currentTeams, updateTeamScore, geminiKey, mistralKey, mistralModel, llmProvider, triggerTwist, activeRoomCode, saveBoard } = useClassroomStore();
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
    if (!topic) return alert("Please enter a topic!");
    if (llmProvider === 'gemini' && !geminiKey) return alert("Missing Gemini API Key (set in Dashboard).");
    if (llmProvider === 'mistral' && !mistralKey) return alert("Missing Mistral API Key (set in Dashboard).");
    
    setIsGenerating(true);
    setGameState("LOADING");
    
    try {
      const response = await fetch("/api/generate-rapid-fire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: llmProvider === 'gemini' ? geminiKey : mistralKey, 
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
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games" style={{ textDecoration: 'none' }}>
             <button className={styles.homeBtn} style={{ background: 'transparent', border: '1px solid rgba(255, 51, 102, 0.4)', padding: '0.5rem', color: '#ff3366' }}>
               <ArrowLeft />
             </button>
          </Link>
          <h1 style={{ margin: 0, color: '#ff3366', letterSpacing: '0.1em' }}>Rapid Fire Protocol</h1>
        </div>
        
        <div className={styles.aiControls} style={{ marginLeft: '1rem' }}>
           <MultiplayerHost gameMode="rapidfire" />

        </div>
      </header>

      {gameState === "SETUP" && (
        <div className={styles.canvasLeft}>
          <div className={styles.leftDecor}>
            SYS: RAPID_FIRE_GEN<br/>PORT: 8080<br/>AWAITING PARAMS
          </div>
          <div className={styles.accentLine} />
          
          <h2 className={styles.mainSentence} style={{ fontSize: '2rem', marginBottom: '2rem' }}>INITIALIZE FIREWALL PARAMETERS.</h2>
          
          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '600px', marginBottom: '2rem' }}>
            <button
              onClick={() => setRfMode("buzzer")}
              className={rfMode === "buzzer" ? styles.btnSolid : styles.btnOutline}
              style={{ flex: 1, padding: '1rem' }}
            >
              🔔 AUDIO BUZZ
            </button>
            <button
              onClick={() => setRfMode("mc")}
              className={rfMode === "mc" ? styles.btnSolid : styles.btnOutline}
              style={{ flex: 1, padding: '1rem' }}
            >
              📝 MULTIPLE CHOICE
            </button>
          </div>
          <span style={{ opacity: 0.5, fontFamily: 'monospace', marginBottom: '2rem' }}>
            {">"} {rfMode === "buzzer" ? "AUDIO PROTOCOL: Host verbal confirmation required." : "MC PROTOCOL: Nodes autolock A-D arrays."}
          </span>
            
          <div style={{ width: "100%", maxWidth: "600px" }}>
            <span style={{ display: "block", marginBottom: "0.5rem", color: '#ff3366', fontFamily: 'monospace' }}>TARGET.LEXICON</span>
            <input 
              className={styles.topicInput} 
              style={{ width: '100%', marginBottom: '2rem' }}
              value={topic} 
              onChange={(e) => setTopic(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && !isGenerating && generateGame()}
              placeholder="e.g. Irregular Verbs..." 
            />
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                onClick={generateGame} 
                disabled={isGenerating || (llmProvider === 'gemini' && !geminiKey)} 
                className={styles.btnSolid} 
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Sparkles size={20} /> SYNTHESIZE
              </button>
              <BoardLibrary currentGameType="rapid-fire" onLoadBoard={handleLoadBoard} />
              <GameSettingsDrawer settings={[
                { label: "Class Level", type: "select", value: targetLevel, onChange: setTargetLevel, options: [
                  { value: "Low", label: "Low (Beginner)" },
                  { value: "Mid", label: "Mid (Intermediate)" },
                  { value: "High", label: "High (Advanced)" }
                ]},
                { label: "Timer per Question", type: "select", value: String(timerDuration), onChange: (v: string) => setTimerDuration(Number(v)), options: [
                  { value: "10", label: "10 seconds" },
                  { value: "15", label: "15 seconds" },
                  { value: "20", label: "20 seconds" },
                  { value: "30", label: "30 seconds" },
                  { value: "45", label: "45 seconds" },
                  { value: "60", label: "60 seconds" }
                ]},
                ...(rfMode === "mc" ? [{
                  label: "Penalty for Wrong Answers",
                  type: "checkbox" as const,
                  value: penalizeWrong,
                  onChange: setPenalizeWrong,
                  description: "Teams lose 100 points for incorrect guesses"
                }] : [])
              ]} />
            </div>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ color: "var(--accent)", margin: 0 }}>Review Questions</h2>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                onClick={() => {
                  const title = prompt("Name this question set:", topic);
                  if (title) {
                    saveBoard({ title, topic, gameType: 'rapid-fire', content: questions });
                    alert("Set saved!");
                  }
                }}
                className={styles.btn} 
                style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.05)', color: 'white' }}
              >
                💾 Save Set
              </button>
              <button onClick={startGame} className={styles.btn}>
                Approve & Start Game
              </button>
            </div>
          </div>
          <div style={{ width: '100%', maxWidth: '800px' }}>
            {questions.map((q, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <strong>{i + 1}. {q.text}</strong>
                <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Answer: {q.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(gameState === "PLAYING" || gameState === "REVEALED") && currentQ && (
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
