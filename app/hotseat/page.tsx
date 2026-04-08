"use client";

import { useState, useEffect } from "react";
import styles from "./hotseat.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";

export default function HotSeatMode() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, triggerTwist, geminiKey, ollamaModel, llmProvider } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [timerDuration, setTimerDuration] = useState(60);
  const [showTimesUp, setShowTimesUp] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setShowTimesUp(true);
      setTimeout(() => setShowTimesUp(false), 3000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  // Handle global spacebar for quickly skipping/scoring in live class
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || timeLeft === 0) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleScore(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, timeLeft, currentIndex]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (llmProvider === 'gemini' && !geminiKey) return alert("Please set your Gemini API key in Dashboard Settings!");
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setWords([]); 
    setIsPlaying(false);

    try {
      const res = await fetch("/api/generate-hotseat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, ollamaModel, provider: llmProvider, llmProvider, topic, level: "Mixed Level" })
      });
      const data = await res.json();
      if (res.ok && data.words) {
        setWords(data.words);
        setCurrentIndex(0);
        setScore(0);
        setTimeLeft(timerDuration);
        setIsPlaying(true);
        setShowTimesUp(false);
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const handleScore = (success: boolean) => {
    if (!isPlaying) return;

    if (success) setScore(s => s + 1);
    
    setCurrentIndex(c => c + 1);

    if (currentIndex >= words.length - 1) {
      setIsPlaying(false);
    }
  };

  const currentWord = words[currentIndex];

  const renderAwardButtons = () => (
    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {currentTeams.map(t => (
        <button 
          key={t.id} 
          className={styles.scoreBtn} 
          style={{ fontSize: '1.2rem', padding: '0.8rem 1.5rem', background: 'var(--panel)', color: 'white', border: '1px solid var(--accent)' }}
          onClick={() => {
            updateTeamScore(t.id, score * 100);
            setWords([]);
          }}
        >
          +{score * 100} {t.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
          <h1>The Hot Seat</h1>
          
          <div className={styles.aiControls}>
            <MultiplayerHost gameMode="hotseat" />
            <input 
              placeholder="Topic (e.g. Winter Holidays)" 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className={styles.topicInput}
              disabled={isPlaying}
            />
            <button onClick={handleGenerate} disabled={isGenerating || isPlaying} className={styles.genBtn}>
              <Sparkles size={20} /> {isGenerating ? "Generating..." : "Generate AI Words"}
            </button>
            <select 
              value={timerDuration} 
              onChange={e => { setTimerDuration(Number(e.target.value)); if (!isPlaying) setTimeLeft(Number(e.target.value)); }}
              disabled={isPlaying}
              style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <option value={30}>⏱ 30s</option>
              <option value={45}>⏱ 45s</option>
              <option value={60}>⏱ 60s</option>
              <option value={90}>⏱ 90s</option>
              <option value={120}>⏱ 120s</option>
            </select>
          </div>
        </div>
        
        <button className={styles.iconBtn} onClick={triggerTwist} style={{ width: 'auto', padding: '0.8rem 1.5rem', borderRadius: '12px' }}>
          <Zap size={20} style={{ marginRight: '0.5rem' }}/> Trigger Twist
        </button>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={80} className={styles.spinIcon} />
          <h2>AI is crafting your Taboo deck...</h2>
        </div>
      ) : words.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Type a topic above to instantly generate 10 taboo words!</p>
        </div>
      ) : (
        <div className={styles.gameArea}>
          <div className={styles.scoreOverlay}>
            ⭐ {score}
          </div>

          {timeLeft === 0 ? (
            <div className={styles.wordCard}>
              <div className={styles.targetWord} style={{ color: 'var(--accent)' }}>TIME'S UP!</div>
              <p style={{ fontSize: '2rem' }}>Final Score: {score} Stars</p>
              {renderAwardButtons()}
            </div>
          ) : currentIndex >= words.length ? (
            <div className={styles.wordCard}>
              <div className={styles.targetWord} style={{ color: 'var(--success)' }}>DECK CLEAR!</div>
              <p style={{ fontSize: '2rem' }}>Final Score: {score} Stars</p>
              {renderAwardButtons()}
            </div>
          ) : (
            <div className={styles.wordCard} key={currentIndex}>
              <div className={styles.targetWord}>{currentWord?.word}</div>
              <div className={styles.forbiddenList}>
                {currentWord?.forbidden.map((f: string, i: number) => (
                  <span key={i} className={styles.forbiddenWord}>{f}</span>
                ))}
              </div>
              
              <div className={styles.controls}>
                <button onClick={() => handleScore(true)} className={styles.scoreBtn}>Got It (Space)</button>
                <button onClick={() => handleScore(false)} className={styles.skipBtn}>Skip Word</button>
              </div>
            </div>
          )}
        </div>
      )}

      {words.length > 0 && isPlaying && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <GameTimer timeLeft={timeLeft} totalTime={timerDuration} showTimesUp={showTimesUp} />
        </div>
      )}
    </div>
  );
}
