"use client";

import { useState, useEffect } from "react";
import styles from "./wyr.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

export default function WouldYouRatherMode() {
  const [mounted, setMounted] = useState(false);
  const { triggerTwist, geminiKey, ollamaModel, llmProvider, activeRoomCode } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useState<{ optionA: string, optionB: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);

  // Poll for votes
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomStudents(data.students || []);
        }
      } catch (e) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  useEffect(() => setMounted(true), []);

  // Skip mechanism using spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (prompts.length === 0) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (currentIndex < prompts.length - 1) setCurrentIndex(c => c + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prompts, currentIndex]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (llmProvider === 'gemini' && !geminiKey) return alert("Please set your Gemini API key from Dashboard Settings!");
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setPrompts([]); 

    try {
      const res = await fetch("/api/generate-wyr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, ollamaModel, provider: llmProvider, llmProvider, topic, level: "Mixed Level" })
      });
      const data = await res.json();
      if (res.ok && data.prompts) {
        setPrompts(data.prompts);
        setCurrentIndex(0);
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const currentPrompt = prompts[currentIndex];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
          
          <div className={styles.aiControls}>
             <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginRight: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Would You Rather?</span>
             <MultiplayerHost gameMode="wyr" />
            <input 
              placeholder="Topic (e.g. Aliens vs Future)" 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className={styles.topicInput}
            />
            <button onClick={handleGenerate} disabled={isGenerating} className={styles.genBtn}>
              <Sparkles size={20} /> {isGenerating ? "Generating..." : "Generate AI Scenarios"}
            </button>
          </div>
        </div>
        
        <button className={styles.twistBtn} onClick={triggerTwist}>
          <Zap size={20} /> Trigger Twist
        </button>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={80} className={styles.spinIcon} />
          <h2>Generating weird dilemmas...</h2>
        </div>
      ) : prompts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Type a topic above to generate a massive VS debate board!</p>
        </div>
      ) : (
        <div className={styles.splitScreen}>
          <div className={`${styles.choicePanel} ${styles.red}`}>
            <p className={styles.promptText}>{currentPrompt.optionA}</p>
          </div>
          
          <div className={styles.vsCircle}>VS</div>
          
          <div className={`${styles.choicePanel} ${styles.blue}`}>
            <p className={styles.promptText}>{currentPrompt.optionB}</p>
          </div>

          {/* Live Vote Breakdown */}
          {activeRoomCode && (() => {
            const votedStudents = roomStudents.filter((s: any) => s.answered);
            const votersA = votedStudents.filter((s: any) => s.lastAnswer === 'A');
            const votersB = votedStudents.filter((s: any) => s.lastAnswer === 'B');
            const total = votersA.length + votersB.length;
            const pctA = total > 0 ? Math.round((votersA.length / total) * 100) : 0;
            const pctB = total > 0 ? Math.round((votersB.length / total) * 100) : 0;
            const waiting = roomStudents.filter((s: any) => !s.answered).length;

            return (
              <div style={{
                position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.9)', borderRadius: '20px', padding: '1.2rem 2rem',
                zIndex: 10, minWidth: '500px', maxWidth: '90vw', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)'
              }}>
                {/* Header: percentages + count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: total > 0 ? '0.8rem' : 0 }}>
                  <span style={{ color: '#ff4d4d', fontWeight: 900, fontSize: '1.8rem' }}>{pctA}%</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    {total} vote{total !== 1 ? 's' : ''}{waiting > 0 ? ` • ${waiting} waiting` : ''}
                  </span>
                  <span style={{ color: '#4d9fff', fontWeight: 900, fontSize: '1.8rem' }}>{pctB}%</span>
                </div>

                {/* Vote bar */}
                {total > 0 && (
                  <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.8rem' }}>
                    <div style={{ width: `${pctA}%`, background: '#ff4d4d', transition: 'width 0.3s' }} />
                    <div style={{ width: `${pctB}%`, background: '#4d9fff', transition: 'width 0.3s' }} />
                  </div>
                )}

                {/* Names grid */}
                {total > 0 && (
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    {/* Option A voters */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#ff4d4d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
                        Option A ({votersA.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {votersA.map((s: any, i: number) => (
                          <span key={i} style={{
                            background: 'rgba(255,77,77,0.2)', border: '1px solid rgba(255,77,77,0.4)',
                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem',
                            color: '#ff9999', fontWeight: 600
                          }}>
                            {s.name}
                          </span>
                        ))}
                        {votersA.length === 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No votes yet</span>}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)' }} />

                    {/* Option B voters */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#4d9fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
                        Option B ({votersB.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {votersB.map((s: any, i: number) => (
                          <span key={i} style={{
                            background: 'rgba(77,159,255,0.2)', border: '1px solid rgba(77,159,255,0.4)',
                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem',
                            color: '#99c8ff', fontWeight: 600
                          }}>
                            {s.name}
                          </span>
                        ))}
                        {votersB.length === 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No votes yet</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {currentIndex < prompts.length - 1 ? (
             <button className={styles.nextBtn} onClick={() => {
               const nextIdx = currentIndex + 1;
               setCurrentIndex(nextIdx);
               // Push next scenario + clear votes
               if (activeRoomCode) {
                 fetch("/api/room/action", {
                   method: "POST", headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
                 }).then(() => {
                   fetch("/api/room/action", {
                     method: "POST", headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: prompts[nextIdx] } })
                   });
                 }).catch(() => {});
               }
             }}>
               Next Scenario (Space)
             </button>
          ) : (
             <button className={styles.nextBtn} onClick={() => setPrompts([])}>
               Finished! Give me a new topic.
             </button>
          )}
        </div>
      )}
    </div>
  );
}
