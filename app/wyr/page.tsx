"use client";

import { useState, useEffect } from "react";
import styles from "./wyr.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import ScoreboardOverlay from "../components/ScoreboardOverlay";

export default function WouldYouRatherMode() {
  const [mounted, setMounted] = useState(false);
  const { triggerTwist, geminiKey, mistralKey, mistralModel, llmProvider, activeRoomCode } = useClassroomStore();
  
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
    if (!topic.trim()) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setPrompts([]); 

    try {
      const res = await fetch("/api/generate-wyr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: llmProvider === 'gemini' ? geminiKey : mistralKey, 
          mistralModel, 
          provider: llmProvider, 
          topic, 
          level: "Mixed Level" 
        })
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
          <Sparkles size={100} className={styles.spinIcon} style={{ color: 'var(--accent)' }} />
          <h2 className="glow-text">WEAVING DILEMMAS...</h2>
        </div>
      ) : prompts.length === 0 ? (
        <div className={styles.emptyState}>
          <p className="label-caps">System Idle</p>
          <p style={{ opacity: 0.5 }}>Enter a topic to generate AI debate scenarios.</p>
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


          {/* Next Scenario Control */}

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
