"use client";

import { useState, useEffect } from "react";
import styles from "./odd.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Lightbulb, ChevronRight, Ban } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";
import GameSettingsDrawer from "../components/GameSettingsDrawer";

type Mode = "Classic" | "Debate" | "Elimination";
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
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimesUp, setShowTimesUp] = useState(false);
  const [timerDuration, setTimerDuration] = useState(20);

  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);

  // Elimination mode state tracks team IDs that are struck out
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());

  // Push the first question when generated (shuffle words, strip answer for students)
  useEffect(() => {
    if (activeRoomCode && questions && currentIndex === 0) {
       const q = questions[0];
       const studentQ = { ...q, words: shuffleArray(q.words), answer: undefined, hint: undefined };
       fetch("/api/room/action", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            code: activeRoomCode,
            action: "set_question",
            payload: { question: studentQ }
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
  }, [roomStudents, showAnswer]);

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
    if (llmProvider === 'gemini' && !geminiKey) return alert("Please set your Gemini API key in Dashboard Settings!");
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
        // Shuffle words on each question so the answer isn't always in the same position
        const shuffled = data.questions.map((q: Question) => ({ ...q, words: shuffleArray(q.words) }));
        setQuestions(shuffled);
        setTimeLeft(timerDuration);
        setTimerActive(true);
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const handleReveal = async () => {
    setTimerActive(false);
    setShowTimesUp(false);
    setShowAnswer(true);

    if (activeRoomCode) {
      await fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
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

  const nextQuestion = () => {
    if (questions && currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedWord(null);
      setShowHint(false);
      setShowAnswer(false);
      setPointsEarned({});
      setTimeLeft(timerDuration);
      setTimerActive(true);
      // Push new words to Redis + clear answers (shuffle & strip answer)
      if (activeRoomCode && questions[currentIndex + 1]) {
        const nextQ = questions[currentIndex + 1];
        const studentQ = { ...nextQ, words: shuffleArray(nextQ.words), answer: undefined, hint: undefined };
        fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
        }).then(() => {
          fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: studentQ } })
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
             <GameSettingsDrawer settings={[
               { label: "Difficulty Level", type: "select", value: levelFilter, onChange: setLevelFilter, options: [
                 { value: "Mixed Level", label: "Mixed Level" },
                 { value: "Low", label: "Low (A1)" },
                 { value: "Mid", label: "Mid (Intermediate)" },
                 { value: "High", label: "High (Advanced)" },
               ]},
               { label: "Timer per Question", type: "select", value: String(timerDuration), onChange: (v: string) => setTimerDuration(Number(v)), options: [
                 { value: "10", label: "10 seconds" },
                 { value: "15", label: "15 seconds" },
                 { value: "20", label: "20 seconds" },
                 { value: "30", label: "30 seconds" },
                 { value: "45", label: "45 seconds" },
                 { value: "60", label: "60 seconds" },
               ]},
               { label: "Penalty for Wrong Answers", type: "checkbox", value: penalizeWrong, onChange: setPenalizeWrong, description: "Teams lose points for incorrect guesses" },
             ]} />
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
            
            {/* Timer Display */}
            {timerActive && (
              <GameTimer timeLeft={timeLeft} totalTime={timerDuration} showTimesUp={showTimesUp} />
            )}
            {!timerActive && showTimesUp && (
              <GameTimer timeLeft={0} totalTime={timerDuration} showTimesUp={true} />
            )}

            {!showAnswer ? (
               <button className={styles.genBtn} onClick={handleReveal} style={{ background: '#2dd4bf', color: '#111' }}>
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
