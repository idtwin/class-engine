"use client";

import { useState, useEffect } from "react";
import styles from "./wyr.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import ScoreboardOverlay from "../components/ScoreboardOverlay";

export default function WouldYouRatherMode() {
  const [mounted, setMounted] = useState(false);
  const { getActiveApiKey, mistralModel, llmProvider, activeRoomCode } = useClassroomStore();
  
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
          apiKey: getActiveApiKey(), 
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
    <>
      {/* Setup overlay */}
      {(prompts.length === 0 || isGenerating) && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>💬</div>
              <div>
                <div className={styles.setupTitleText}>Would You Rather?</div>
                <div className={styles.setupTitleSub}>Forced Choice Debate Game</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <MultiplayerHost gameMode="wyr" />
              </div>
            </div>

            {isGenerating ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Weaving dilemmas...</div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Aliens vs Future, School Life..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    autoFocus
                  />
                </div>
                <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim() || isGenerating}>
                  <Sparkles size={16} /> Generate Scenarios
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game view */}
      {prompts.length > 0 && !isGenerating && (
        <div className={styles.page}>
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>Would You Rather?</div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>
              Scenario <span className={styles.qCounterNum}>{currentIndex + 1}</span> / {prompts.length}
            </div>
            <div className={styles.headerSpacer} />
            <div className={styles.qCounter} style={{ color: 'var(--muted)', fontSize: 11 }}>
              SPACE to advance
            </div>
            <button
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={() => setPrompts([])}
            >
              ← New Topic
            </button>
          </div>
          <div className={styles.gameContent} style={{ padding: 0, overflow: 'hidden' }}>
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
          </div>
        </div>
      )}
    </>
  );
}
