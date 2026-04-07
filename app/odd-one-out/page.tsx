"use client";

import { useState, useEffect } from "react";
import styles from "./odd.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Lightbulb, ChevronRight, Ban } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

type Mode = "Classic" | "Debate" | "Elimination";
type Question = { level: string, words: string[], answer: string, hint: string };

export default function OddOneOut() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, geminiKey, ollamaModel, llmProvider, activeRoomCode } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [levelFilter, setLevelFilter] = useState("Mixed Level");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("Classic");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [penalizeWrong, setPenalizeWrong] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<Record<string, number>>({});

  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);

  // Elimination mode state tracks team IDs that are struck out
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());

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
          setRoomData(data);
          setRoomStudents(data.students || []);
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
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setQuestions(null);
    setCurrentIndex(0);
    setSelectedWord(null);
    setShowHint(false);
    setShowAnswer(false);
    setPointsEarned({});
    setEliminatedTeams(new Set());

    try {
      const res = await fetch("/api/generate-odd-one-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, ollamaModel, provider: llmProvider, llmProvider, topic, level: levelFilter })
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        setQuestions(data.questions);
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
      setCurrentIndex(c => c + 1);
      setSelectedWord(null);
      setShowHint(false);
      setShowAnswer(false);
      setPointsEarned({});
      // Push new words to Redis + clear answers
      if (activeRoomCode && questions[currentIndex + 1]) {
        fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
        }).then(() => {
          fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: questions[currentIndex + 1] } })
          });
        }).catch(() => {});
      }
    }
  };

  const toggleElimination = (teamId: string) => {
    setEliminatedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const currentQ = questions?.[currentIndex];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, justifyContent: "space-between" }}>
           <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
             <Link href="/games"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
             <h1>Odd One Out</h1>
           </div>
           
           <div className={styles.aiControls} style={{ marginLeft: '1rem' }}>
             <MultiplayerHost gameMode="oddoneout" />
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
               placeholder="Topic (e.g. Planets)" 
               value={topic}
               onChange={e => setTopic(e.target.value)}
               className={styles.topicInput}
               onKeyDown={e => e.key === "Enter" && !isGenerating && handleGenerate()}
             />
             <button onClick={handleGenerate} disabled={isGenerating} className={styles.genBtn}>
               <Sparkles size={20} /> Generate Sets
             </button>
           </div>
        </div>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={100} className={styles.spinIcon} />
          <h2>Writing mind-bending word sets...</h2>
        </div>
      ) : !questions ? (
        <div className={styles.emptyState}>
          <p>Type a topic above to generate rapid-fire Odd One Out puzzles!</p>
        </div>
      ) : (
        <div className={styles.gameBoard}>
          
          <div className={styles.modeTabs}>
            {(["Classic", "Debate", "Elimination"] as Mode[]).map(m => (
              <button 
                key={m} 
                className={`${styles.tabBtn} ${activeMode === m ? styles.active : ''}`}
                onClick={() => {
                  setActiveMode(m);
                  if (m !== "Elimination") setEliminatedTeams(new Set()); 
                }}
              >
                {m}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
              <input type="checkbox" id="penaltyModeOOO" checked={penalizeWrong} onChange={e => setPenalizeWrong(e.target.checked)} />
              <label htmlFor="penaltyModeOOO" style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>Penalty for Wrong Answers</label>
            </div>
          </div>

          <div className={styles.questionMeta}>
             Set {currentIndex + 1} of {questions.length} • {currentQ?.level} Level
          </div>
          
          <h2 className={styles.questionPrompt}>
             {activeMode === "Classic" && "Which word doesn't belong?"}
             {activeMode === "Debate" && "Debate Mode: Argue your case. Why doesn't it belong?"}
             {activeMode === "Elimination" && "Elimination: Choose carefully! Incorrect hits strike you out!"}
          </h2>

          <div className={styles.wordsGrid}>
            {currentQ?.words.map((w, i) => {
              const isSelected = selectedWord === w || (showAnswer && w === currentQ.answer);
              const isCorrectAnswer = w === currentQ.answer;

              let cardClass = styles.wordCard;
              if (isSelected) {
                if (isCorrectAnswer) cardClass += ` ${styles.wordCorrect}`;
                else cardClass += ` ${styles.wordWrong}`;
              } else if (showAnswer && !isCorrectAnswer) {
                // Dim the non-answers on reveal
                cardClass += ` opacity-50`;
              }

              return (
                <div key={i} className={cardClass} style={showAnswer && !isCorrectAnswer ? { opacity: 0.3 } : {}} onClick={() => !showAnswer && setSelectedWord(w)}>
                  {w}
                </div>
              );
            })}
          </div>

          {(showHint || showAnswer) && (
             <div className={styles.hintBox}>
                💡 <strong>Explanation:</strong> {currentQ?.hint}
             </div>
          )}

          <div className={styles.controlsRow}>
            <button className={styles.genBtn} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }} onClick={() => setShowHint(true)} disabled={showHint || showAnswer}>
              <Lightbulb size={20} /> Expose Hint
            </button>
            
            {!showAnswer ? (
               <button className={styles.genBtn} onClick={() => {
                   setShowAnswer(true);
                   if (activeRoomCode) {
                     fetch("/api/room/action", {
                       method: "POST", headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
                     }).catch(() => {});
                   }

                   // Scoring logic
                   const answeredStudents = roomStudents.filter((s: any) => s.answered && s.lastAnswer);
                   const correctAnswers: any[] = [];
                   const wrongAnswers: any[] = [];
                   
                   answeredStudents.forEach((s: any) => {
                      const isCorrect = currentQ && s.lastAnswer === currentQ.answer;
                      if (isCorrect) correctAnswers.push(s);
                      else wrongAnswers.push(s);
                   });
                   
                   // Sort correct answers by speed
                   correctAnswers.sort((a, b) => (a.answerTime || 0) - (b.answerTime || 0));
                   
                   const newPointsEarned: Record<string, number> = {};
                   
                   correctAnswers.forEach((s, idx) => {
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
                      wrongAnswers.forEach(s => {
                          newPointsEarned[s.id] = -100;
                          const team = currentTeams.find(t => t.name === s.name || t.students.some(ts => ts.name === s.name));
                          if (team) updateTeamScore(team.id, -100);
                      });
                   }
                   
                   setPointsEarned(newPointsEarned);
               }} style={{ background: '#2dd4bf', color: '#111' }}>
                 Reveal Answer
               </button>
            ) : (
               <button className={styles.genBtn} onClick={nextQuestion} disabled={currentIndex === questions.length - 1} style={{ background: 'white', color: 'black' }}>
                 Next Set <ChevronRight size={20} />
               </button>
            )}
          </div>

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

          {showAnswer && activeRoomCode && roomStudents.filter((s: any) => s.answered).length > 0 && (
            <div style={{ marginTop: '2rem', width: '100%', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--accent)' }}>📱 Student Responses</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                {roomStudents.filter((s: any) => s.answered).map((s: any, i: number) => {
                  const isCorrect = currentQ && s.lastAnswer === currentQ.answer;
                  const timeSeconds = (s.answerTime && roomData?.questionStartTime) ? ((s.answerTime - roomData.questionStartTime) / 1000).toFixed(1) + 's' : '';
                  const pts = pointsEarned[s.id];

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
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>&ldquo;{s.lastAnswer}&rdquo;</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeMode === "Elimination" && currentTeams.length > 0 && (
            <div style={{ marginTop: '3rem', width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '2px' }}>Elimination Tracker</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {currentTeams.map(t => {
                  const eliminated = eliminatedTeams.has(t.id);
                  return (
                    <button 
                      key={t.id} 
                      onClick={() => toggleElimination(t.id)}
                      style={{ 
                        padding: '1rem', 
                        borderRadius: '12px', 
                        border: '2px solid',
                        borderColor: eliminated ? 'var(--danger)' : 'rgba(255,255,255,0.1)',
                        background: eliminated ? 'rgba(239, 68, 68, 0.1)' : 'var(--panel)',
                        color: eliminated ? 'var(--danger)' : 'white',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {eliminated && <Ban size={18} />} {t.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
