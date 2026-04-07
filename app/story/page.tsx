"use client";

import { useState, useEffect } from "react";
import styles from "./story.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

export default function StoryChainMode() {
  const [mounted, setMounted] = useState(false);
  const { triggerTwist, geminiKey, ollamaModel, llmProvider } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [starter, setStarter] = useState("");
  const [rounds, setRounds] = useState<{ words: string[] }[]>([]);
  const [currentRound, setCurrentRound] = useState(-1);
  
  const TURN_SECONDS = 15;
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } 
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  // Spacebar skips to next turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (rounds.length === 0) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleNextRound();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rounds, currentRound]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (llmProvider === 'gemini' && !geminiKey) return alert("Please set your Gemini API key in Dashboard Settings!");
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setRounds([]); 
    setIsPlaying(false);

    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, ollamaModel, provider: llmProvider, llmProvider, topic, level: "Mixed Level" })
      });
      const data = await res.json();
      if (res.ok && data.rounds) {
        setStarter(data.starter);
        setRounds(data.rounds);
        setCurrentRound(0);
        setTimeLeft(TURN_SECONDS);
        setIsPlaying(true);
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const handleNextRound = () => {
    if (currentRound < rounds.length - 1) {
      setCurrentRound(c => c + 1);
      setTimeLeft(TURN_SECONDS);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
          <h1>Story Chain</h1>
          
          <div className={styles.aiControls}>
            <MultiplayerHost gameMode="story" />
            <input 
              placeholder="Topic (e.g. Magic Forest)" 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className={styles.topicInput}
              disabled={isPlaying}
            />
            <button onClick={handleGenerate} disabled={isGenerating || isPlaying} className={styles.genBtn}>
              <Sparkles size={20} /> {isGenerating ? "Drafting..." : "Generate Story Setup"}
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
          <h2>Writing narrative hooks...</h2>
        </div>
      ) : rounds.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Type a topic to generate an improv story format!</p>
        </div>
      ) : (
        <div className={styles.gameArea}>
          
          <div className={styles.starterText}>
            "{starter}"
          </div>

          {currentRound >= rounds.length - 1 && timeLeft === 0 ? (
             <h2 style={{ fontSize: '4rem', color: 'var(--success)' }}>STORY COMPLETE!</h2>
          ) : (
            <>
              <div className={styles.wordsContainer}>
                {rounds[currentRound]?.words.map((word, i) => (
                  <div key={i} className={styles.wordBox}>{word}</div>
                ))}
              </div>

              <div className={`${styles.timerRing} ${timeLeft <= 5 ? styles.timerDanger : ''}`}>
                {timeLeft}
              </div>

              <div className={styles.nextWrap}>
                <button className={styles.nextBtn} onClick={handleNextRound}>
                  Next Student (Space)
                </button>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
