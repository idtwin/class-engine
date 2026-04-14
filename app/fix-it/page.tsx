"use client";

import { useState, useEffect } from "react";
import styles from "./fix.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Lightbulb, ChevronRight, Eye, RefreshCw, Zap } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";
import ScoreboardOverlay from "../components/ScoreboardOverlay";
import { stopAllSFX } from "../lib/audio";
import CommandShell from "../components/CommandShell";

type Mode = "Race" | "Auction" | "Spot & Swap";
type Question = { level: string, errorType: string, brokenSentence: string, correctedSentence: string, hint: string };

export default function FixIt() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, getActiveApiKey, mistralModel, llmProvider, activeRoomCode } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [levelFilter, setLevelFilter] = useState("Mixed Level");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("Race");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showErrorFlag, setShowErrorFlag] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  
  const [penalizeWrong, setPenalizeWrong] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<Record<string, number>>({});

  // Auction mode local betting state mapping TeamID -> bet amount
  const [teamBets, setTeamBets] = useState<Record<string, string>>({});

  // Live student responses from Redis polling
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomBuzzes, setRoomBuzzes] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);

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
          setRoomBuzzes(data.buzzes || []);
        }
      } catch (e) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  useEffect(() => {
    setMounted(true);
    return () => stopAllSFX();
  }, []);

  if (!mounted) return null;

  const handleGenerate = async () => {
    
    
    if (!topic) return alert("Please enter a theme/topic!");
    
    setIsGenerating(true);
    setQuestions(null);
    setCurrentIndex(0);
    setShowHint(false);
    setShowErrorFlag(false);
    setShowAnswer(false);
    setPointsEarned({});

    try {
      const res = await fetch("/api/generate-fix-it", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: getActiveApiKey(), 
          mistralModel, 
          provider: llmProvider, 
          topic, 
          level: levelFilter 
        })
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
      setPointsEarned({});
      
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
      <div className={styles.leftDecor}>
        LAT: 40.7128° N<br/>
        LNG: 74.0060° W<br/>
        STREAM: ENCRYPTED
      </div>

      {/* Hidden Control Panel for Teacher (Kept for functionality) */}
      {!questions && (
        <header className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
             <h1 style={{ margin: 0, color: 'var(--accent-cyan)' }}>Fix It Generator</h1>
          </div>
          
          <div className={styles.aiControls}>
            <MultiplayerHost gameMode="fixit" />
            <select 
              value={levelFilter} 
              onChange={e => setLevelFilter(e.target.value)}
              className={styles.topicInput}
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
              <Sparkles size={18} /> GENERATE
            </button>
          </div>
        </header>
      )}

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={100} className={styles.spinIcon} style={{ color: 'var(--accent)' }} />
          <h2 className="glow-text">NEURAL ERROR ANALYSIS...</h2>
        </div>
      ) : !questions ? (
        <div className={styles.emptyState}>
          <p className="label-caps">System Idle</p>
          <p style={{ opacity: 0.5 }}>Enter a language module topic to generate grammar corrections.</p>
        </div>
      ) : (
        <div className={styles.canvasLeft}>
           <div className={styles.gameSplit}>
             {/* Left Column: Primary Sentence Area */}
             <div className={styles.leftCol}>
               <div className={styles.cyanLine} />
               <div className={styles.seqLabel}>CORRECTION_REQUIRED // SEQUENCE_{String(currentIndex+1).padStart(2,'0')}</div>
               
               <h1 className={styles.mainSentence}>
                  {!showAnswer ? currentQ?.brokenSentence : currentQ?.correctedSentence}
               </h1>

               <div className={styles.techControls}>
                 <button 
                    className={styles.btnSolidCyan} 
                    onClick={() => setShowHint(true)} 
                    disabled={showHint || showAnswer}
                 >
                    <Zap size={20} /> DEPLOY HINT
                 </button>
                 
                 {!showAnswer ? (
                   <button 
                      className={styles.btnOutlineCyan} 
                      onClick={() => {
                          setShowAnswer(true);
                          if (activeRoomCode) {
                            fetch("/api/room/action", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
                            }).catch(() => {});
                          }

                          // Automated Tiered Scoring System
                          const answeredStudents = roomStudents.filter((s: any) => s.answered && s.lastAnswer);
                          const correctAnswers: any[] = [];
                          const wrongAnswers: any[] = [];
                          
                          answeredStudents.forEach((s: any) => {
                             const isCorrect = currentQ && s.lastAnswer?.toLowerCase().trim() === currentQ.correctedSentence.toLowerCase().trim();
                             if (isCorrect) correctAnswers.push(s);
                             else wrongAnswers.push(s);
                          });
                          
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
                      }}
                   >
                      <Eye size={20} /> REVEAL CORRECTION
                   </button>
                 ) : (
                   <button 
                      className={styles.btnOutlineCyan} 
                      onClick={nextQuestion} 
                      disabled={currentIndex === questions.length - 1} 
                      style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
                   >
                      NEXT SEQUENCE <ChevronRight size={20} />
                   </button>
                 )}
               </div>
             </div>

             {/* Right Column: System Logs & Network Status */}
             <div className={styles.rightCol}>
               <div className={styles.systemLog}>
                  <div className={styles.logHeader}>SYSTEM_LOG_v4.2</div>
                  <div className={styles.logBody}>
                    <span style={{ color: 'var(--accent-green)' }}>[INIT]</span> Target sequence localized.<br/>
                    {">"} Error classification: "{currentQ?.errorType}" anomaly detected...<br/>
                    {showHint && <><span style={{color: 'white'}}>{">"} SYSTEM_HINT: {currentQ?.hint}</span><br/></>}
                    
                    {roomStudents.filter((s:any) => s.answered).map((s:any, idx:number) => (
                       <div key={idx} style={{ color: 'var(--accent-cyan)' }}>
                         {">"} [SIGNAL LOCKED] {s.name} has transmitted correction.
                       </div>
                    ))}

                    {showAnswer && <><span style={{color: 'var(--accent-green)'}}>{">"} [RESOLVED] Syntax matrix stabilized.</span><br/></>}

                    {showAnswer && Object.entries(pointsEarned).map(([studentId, pts]) => {
                       const studentName = roomStudents.find((s:any) => s.id === studentId)?.name || 'Unknown Node';
                       return (
                         <div key={studentId} style={{ color: pts > 0 ? 'var(--accent-green)' : '#ef4444' }}>
                            {">"} [SCORE] {studentName} {pts > 0 ? `+${pts}` : pts} pts.
                         </div>
                       );
                    })}
                    <br/>
                    <span style={{ opacity: 0.5 }}>{">"} AWAITING_NEXT_SEQUENCE_</span>
                  </div>
               </div>

               {/* Pre-reveal Status Cards */}
               {!showAnswer && activeRoomCode && roomStudents.length > 0 && (
                 <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                   <h3 style={{ marginBottom: '1rem', color: 'var(--accent-cyan)', fontFamily: 'monospace', fontSize: '0.7rem' }}>// NETWORK_STATUS: {roomStudents.filter((s:any) => s.answered).length} LOCKED</h3>
                   <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                     {roomStudents.map((s: any, i: number) => (
                       <div key={i} style={{
                         padding: '0.3rem 0.6rem',
                         borderRadius: '4px',
                         fontSize: '0.75rem',
                         background: s.answered ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.02)',
                         border: `1px solid ${s.answered ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)'}`,
                         opacity: s.answered ? 1 : 0.4,
                         color: s.answered ? 'var(--accent-cyan)' : 'white'
                       }}>
                         {s.name}
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* Post-reveal UI for student analytics */}
               {showAnswer && activeRoomCode && roomStudents.filter((s: any) => s.answered).length > 0 && (
                 <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                   <h3 style={{ marginBottom: '1rem', color: 'var(--accent-green)', fontFamily: 'monospace', fontSize: '0.7rem' }}>// NETWORK_RESPONSES</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     {roomStudents.filter((s: any) => s.answered).map((s: any, i: number) => {
                       const isCorrect = currentQ && s.lastAnswer?.toLowerCase().trim() === currentQ.correctedSentence.toLowerCase().trim();
                       return (
                         <div key={i} style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${isCorrect ? 'var(--accent-green)' : 'rgba(255,0,0,0.3)'}`, borderRadius: '4px' }}>
                           <div style={{ fontWeight: 800, color: isCorrect ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{s.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', wordBreak: 'break-word' }}>{s.lastAnswer}</div>
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
  );
}
