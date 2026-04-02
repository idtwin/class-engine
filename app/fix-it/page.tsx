"use client";

import { useState, useEffect } from "react";
import styles from "./fix.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Lightbulb, ChevronRight, Eye, RefreshCw } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

type Mode = "Race" | "Auction" | "Spot & Swap";
type Question = { level: string, errorType: string, brokenSentence: string, correctedSentence: string, hint: string };

export default function FixIt() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, geminiKey, activeRoomCode } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [levelFilter, setLevelFilter] = useState("Mixed Level");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("Race");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showErrorFlag, setShowErrorFlag] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Auction mode local betting state mapping TeamID -> bet amount
  const [teamBets, setTeamBets] = useState<Record<string, string>>({});

  // Live student responses from Redis polling
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomBuzzes, setRoomBuzzes] = useState<any[]>([]);

  // Push the first question when generated
  useEffect(() => {
    if (activeRoomCode && questions && currentIndex === 0) {
       fetch("/api/room/action", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            code: activeRoomCode,
            action: "set_question",
            payload: { question: questions[0] }
         })
       }).catch((e) => console.error("Sync Error", e));
    }
  }, [questions, activeRoomCode]);

  // Poll for student responses
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomStudents(data.students || []);
          setRoomBuzzes(data.buzzes || []);
        }
      } catch (e) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (!geminiKey) return alert("Please set your Gemini API key in Dashboard Settings!");
    if (!topic) return alert("Please enter a theme/topic!");
    
    setIsGenerating(true);
    setQuestions(null);
    setCurrentIndex(0);
    setShowHint(false);
    setShowErrorFlag(false);
    setShowAnswer(false);

    try {
      const res = await fetch("/api/generate-fix-it", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, topic, level: levelFilter })
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        setQuestions(data.questions);
        
        // initialize default 1 pt bets
        const initialBets: Record<string, string> = {};
        currentTeams.forEach(t => initialBets[t.id] = "1");
        setTeamBets(initialBets);

      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const nextQuestion = () => {
    if (questions && currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setShowHint(false);
      setShowErrorFlag(false);
      setShowAnswer(false);
      
      // Clear all phone buzzers/inputs and push new question sequentially
      if (activeRoomCode) {
        fetch("/api/room/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
        }).then(() => {
          fetch("/api/room/action", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
                code: activeRoomCode,
                action: "set_question",
                payload: { question: questions[nextIdx] }
             })
          });
        }).catch(()=>{});
      }
    }
  };

  const currentQ = questions?.[currentIndex];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, justifyContent: "space-between" }}>
           <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
             <Link href="/games"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
             <h1>Fix It</h1>
           </div>
           
           <div className={styles.aiControls} style={{ marginLeft: '1rem' }}>
             <MultiplayerHost gameMode="fixit" />
             <select 
               value={levelFilter} 
               onChange={e => setLevelFilter(e.target.value)}
               className={styles.topicInput}
               style={{ minWidth: '120px' }}
             >
               <option value="Mixed Level">Mixed Level</option>
               <option value="Low">Low</option>
               <option value="Mid">Mid</option>
               <option value="High">High</option>
             </select>
             <input 
               placeholder="Theme (e.g. Travel)" 
               value={topic}
               onChange={e => setTopic(e.target.value)}
               className={styles.topicInput}
               onKeyDown={e => e.key === "Enter" && !isGenerating && handleGenerate()}
             />
             <button onClick={handleGenerate} disabled={isGenerating} className={styles.genBtn}>
               <Sparkles size={20} /> Generate Grammar Map
             </button>
           </div>
        </div>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={100} className={styles.spinIcon} />
          <h2>Analyzing language errors...</h2>
        </div>
      ) : !questions ? (
        <div className={styles.emptyState}>
          <p>Type a theme above to generate 10 lightning-fast grammar corrections!</p>
        </div>
      ) : (
        <div className={styles.gameBoard}>
          
          <div className={styles.modeTabs}>
            {(["Race", "Auction", "Spot & Swap"] as Mode[]).map(m => (
              <button 
                key={m} 
                className={`${styles.tabBtn} ${activeMode === m ? styles.active : ''}`}
                onClick={() => setActiveMode(m)}
              >
                {m}
              </button>
            ))}
          </div>

          <div className={styles.questionMeta}>
             Set {currentIndex + 1} of {questions.length} • {currentQ?.level} Level
             
             {/* The hidden spot logic overlay flag */}
             {(activeMode === "Spot & Swap" || showAnswer || showErrorFlag) && (
               <span className={styles.errorTypeBadge} style={{ filter: (showErrorFlag || showAnswer) ? 'none' : 'blur(4px)' }}>
                 {(showErrorFlag || showAnswer) ? currentQ?.errorType : "Hidden System Constraint"}
               </span>
             )}
          </div>
          
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '2rem', textAlign: 'center' }}>
             {activeMode === "Race" && "Race Mode: Be the first to yell out the perfectly corrected sentence!"}
             {activeMode === "Auction" && "Auction Mode: Secretly bet 1-5 points on your answer!"}
             {activeMode === "Spot & Swap" && "Spot & Swap: Physically name the exact error type BEFORE giving the fix!"}
          </h2>

          <div className={`${styles.questionCard} ${showAnswer ? styles.questionCardSuccess : ''}`}>
             {!showAnswer ? currentQ?.brokenSentence : (
               <span className={styles.answerText}>{currentQ?.correctedSentence}</span>
             )}
          </div>

          {showHint && !showAnswer && (
             <div className={styles.hintBox}>
                💡 {currentQ?.hint}
             </div>
          )}

          <div className={styles.controlsRow}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className={styles.genBtn} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }} onClick={() => setShowHint(true)} disabled={showHint || showAnswer}>
                <Lightbulb size={20} /> Deploy Hint
              </button>
              
              {activeMode === "Spot & Swap" && !showErrorFlag && !showAnswer && (
                <button className={styles.genBtn} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => setShowErrorFlag(true)}>
                  <Eye size={20} /> Expose Error Target
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
               {!showAnswer ? (
                  <button className={styles.genBtn} onClick={() => setShowAnswer(true)} style={{ background: '#2dd4bf', color: '#111' }}>
                    <RefreshCw size={20} /> Reveal Correction 
                  </button>
               ) : (
                  <button className={styles.genBtn} onClick={nextQuestion} disabled={currentIndex === questions.length - 1} style={{ background: 'white', color: 'black' }}>
                    Next Sentence <ChevronRight size={20} />
                  </button>
               )}
            </div>
          </div>

          {activeMode === "Auction" && currentTeams.length > 0 && (
            <div className={styles.teamScoreList}>
              {currentTeams.map(t => (
                <div key={t.id} className={styles.teamCard}>
                  <div className={styles.teamHeaderRow}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t.name}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{t.score} pts</span>
                  </div>
                  <div className={styles.bettingControls}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: 800 }}>BET:</span>
                    <input 
                      type="number" 
                      min="1" max="5" 
                      className={styles.betInput}
                      value={teamBets[t.id] || "1"}
                      onChange={e => setTeamBets(prev => ({ ...prev, [t.id]: e.target.value }))}
                    />
                    <div className={styles.scoreControl}>
                      <button 
                        className={`${styles.scoreBtn} ${styles.scoreBtnLose}`} 
                        onClick={() => updateTeamScore(t.id, -parseInt(teamBets[t.id] || "1", 10))}
                      >-</button>
                      <button 
                        className={`${styles.scoreBtn} ${styles.scoreBtnWin}`} 
                        onClick={() => updateTeamScore(t.id, parseInt(teamBets[t.id] || "1", 10))}
                      >+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pre-reveal visually show who has locked in */}
          {!showAnswer && activeRoomCode && roomStudents.length > 0 && (
            <div style={{ marginTop: '2rem', width: '100%', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>🔒 Locked In: {roomStudents.filter((s:any) => s.answered).length} / {roomStudents.length}</h3>
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

          {/* Live Student Responses Panel */}
          {showAnswer && activeRoomCode && roomStudents.filter((s: any) => s.answered).length > 0 && (
            <div style={{ marginTop: '2rem', width: '100%', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--accent)' }}>📱 Student Responses</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                {roomStudents.filter((s: any) => s.answered).map((s: any, i: number) => {
                  const isCorrect = currentQ && s.lastAnswer?.toLowerCase().trim() === currentQ.correctedSentence.toLowerCase().trim();
                  return (
                    <div key={i} style={{
                      padding: '0.8rem 1rem',
                      borderRadius: '10px',
                      border: `2px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                      background: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    }}>
                      <div style={{ fontWeight: 800, marginBottom: '0.3rem' }}>{s.name} {isCorrect ? '✅' : '❌'}</div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>"{s.lastAnswer}"</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
