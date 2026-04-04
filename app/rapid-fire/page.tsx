"use client";

import { useState, useEffect } from "react";
import { useClassroomStore, Level } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Play, Zap, FastForward, Loader2, Eye } from "lucide-react";
import styles from "./rapid-fire.module.css";
import MultiplayerHost from "../components/MultiplayerHost";

interface RapidFireQuestion {
  text: string;
  answer: string;
  level: Level;
  type: string;
}

type GameState = "SETUP" | "LOADING" | "READY" | "PLAYING" | "REVEALED" | "FINISHED";

export default function RapidFire() {
  const { currentTeams, geminiKey, ollamaModel, triggerTwist, activeRoomCode } = useClassroomStore();
  const [mounted, setMounted] = useState(false);
  const [roomBuzzes, setRoomBuzzes] = useState<any[]>([]);
  
  const [gameState, setGameState] = useState<GameState>("SETUP");
  const [topic, setTopic] = useState("");
  const [targetLevel, setTargetLevel] = useState<Level>("Mid");
  const [questions, setQuestions] = useState<RapidFireQuestion[]>([]);
  const [cursor, setCursor] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(false);

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
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Poll for buzzes
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomBuzzes(data.buzzes || []);
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
        body: JSON.stringify({ apiKey: geminiKey, ollamaModel, topic, level: targetLevel })
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
    setTimeLeft(15);
    setTimerActive(true);
  };

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
      // Push next question + clear buzzes
      if (activeRoomCode) {
        fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_buzzes", payload: {} })
        }).then(() => {
          fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: questions[nextIdx] } })
          });
        }).catch(() => {});
      }
    }
  };

  const handleReveal = () => {
    setTimerActive(false);
    setGameState("REVEALED");
  };

  const currentQ = questions[cursor];

  return (
    <div className={styles.container} style={{ paddingBottom: '100px' }}>
      <header className={styles.header}>
        <Link href="/games" className={styles.homeBtn}><ArrowLeft size={20} /> Exit Game</Link>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", textTransform: "uppercase" }}>Game</div>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>Rapid Fire</div>
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
            <button className={styles.btn} onClick={generateGame} disabled={!geminiKey}>
              {geminiKey ? "Generate Questions" : "API Key Missing (View Dashboard Settings)"}
            </button>
          </div>
        </div>
      )}

      {gameState === "LOADING" && (
        <div className={styles.setupContainer}>
          <Loader2 size={64} className={styles.spin} style={{ color: "var(--accent)" }} />
          <h2>Generating High-Speed Questions...</h2>
        </div>
      )}

      {gameState === "READY" && (
        <div className={styles.setupContainer}>
          <h1 style={{ fontSize: "3rem" }}>{questions.length} Questions Generated!</h1>
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
            
            {gameState === "REVEALED" ? (
              <div className={styles.answerText}>
                ANSWER: {currentQ.answer}
              </div>
            ) : (
              <div style={{ height: "2.5rem" }}></div> /* spacer to prevent layout shift */
            )}

            {/* Buzz-in Banner */}
            {activeRoomCode && roomBuzzes.length > 0 && (
              <div style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(45,212,191,0.15)', border: '2px solid var(--accent)', marginTop: '1rem' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem' }}>🔔 Buzz Order:</div>
                {roomBuzzes.sort((a: any, b: any) => a.time - b.time).map((b: any, i: number) => (
                  <div key={i} style={{ fontSize: '1.1rem', fontWeight: i === 0 ? 900 : 400, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                    {i + 1}. {b.name} {i === 0 && '🏆'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.timerWrapper}>
            <div className={styles.timerBarContainer}>
               <div className={styles.timerBar} style={{ width: `${(timeLeft / 15) * 100}%` }}></div>
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
