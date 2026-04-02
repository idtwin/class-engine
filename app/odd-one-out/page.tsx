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
  const { currentTeams, geminiKey, activeRoomCode } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [levelFilter, setLevelFilter] = useState("Mixed Level");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("Classic");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Elimination mode state tracks team IDs that are struct out
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());

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
    setEliminatedTeams(new Set());

    try {
      const res = await fetch("/api/generate-odd-one-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, topic, level: levelFilter })
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
      // Push new words to Redis + clear answers
      if (activeRoomCode && questions[currentIndex + 1]) {
        fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
        }).then(() => {
          fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: { words: questions[currentIndex + 1].words } } })
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
              const isSelected = selectedWord !== null;
              const isCorrectAnswer = w === currentQ.answer;
              const isTargetClicked = selectedWord === w;

              let cardClass = styles.wordCard;
              if (isSelected) {
                if (isCorrectAnswer) cardClass += ` ${styles.wordCorrect}`;
                else if (isTargetClicked) cardClass += ` ${styles.wordWrong}`;
              }

              return (
                <div key={i} className={cardClass} onClick={() => !isSelected && setSelectedWord(w)}>
                  {w}
                </div>
              );
            })}
          </div>

          {showHint && (
             <div className={styles.hintBox}>
                💡 {currentQ?.hint}
             </div>
          )}

          <div className={styles.controlsRow}>
            <button className={styles.genBtn} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }} onClick={() => setShowHint(true)} disabled={showHint || selectedWord !== null}>
              <Lightbulb size={20} /> Expose Hint
            </button>
            
            <button className={styles.genBtn} onClick={nextQuestion} disabled={currentIndex === questions.length - 1} style={{ background: 'white', color: 'black' }}>
              Next Set <ChevronRight size={20} />
            </button>
          </div>

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
