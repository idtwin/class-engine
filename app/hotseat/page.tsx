"use client";

import { useState, useEffect } from "react";
import styles from "./hotseat.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";
import GameSettingsDrawer from "../components/GameSettingsDrawer";

export default function HotSeatMode() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, triggerTwist, geminiKey, mistralKey, mistralModel, llmProvider } = useClassroomStore();
  
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
        body: JSON.stringify({ 
          apiKey: llmProvider === 'gemini' ? geminiKey : mistralKey, 
          mistralModel, 
          provider: llmProvider, 
          topic, 
          level: "Mixed Level" 
        })
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
          <Link href="/games" style={{ textDecoration: 'none' }}>
            <button className={styles.iconBtn}>
              <ArrowLeft color="#ff4500" size={24} />
            </button>
          </Link>
          <h1 style={{ margin: 0, color: '#ff4500', letterSpacing: '0.1em', fontFamily: 'monospace' }}>HOT_SEAT_PROTOCOL</h1>
          
          <div className={styles.aiControls} style={{ marginLeft: '1rem' }}>
            <MultiplayerHost gameMode="hotseat" />
            <input 
              placeholder="Lexicon Topic (e.g. Winter Holidays)" 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className={styles.topicInput}
              disabled={isPlaying}
            />
            <button onClick={handleGenerate} disabled={isGenerating || isPlaying} className={styles.genBtn}>
              <Sparkles size={18} /> {isGenerating ? "SYNTHESIZING..." : "GENERATE TABOO DECK"}
            </button>
            <GameSettingsDrawer settings={[
              { label: "Round Timer", type: "select", value: String(timerDuration), onChange: (v: string) => { setTimerDuration(Number(v)); if (!isPlaying) setTimeLeft(Number(v)); }, options: [
                { value: "30", label: "30 seconds" },
                { value: "45", label: "45 seconds" },
                { value: "60", label: "60 seconds" },
                { value: "90", label: "90 seconds" },
                { value: "120", label: "120 seconds" },
              ]},
            ]} />
          </div>
        </div>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={80} className={styles.spinIcon} />
          <h2 style={{ letterSpacing: '0.1em' }}>SYNTHESIZING TABOO DECK...</h2>
        </div>
      ) : words.length === 0 ? (
        <div className={styles.emptyState}>
          <p>AWAITING LEXICON TOPIC INPUT TO GENERATE DECK_</p>
        </div>
      ) : (
        <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
          
          {/* Main Cinematic Left Canvas */}
          <div className={styles.canvasLeft}>
            <div className={styles.seqLabel}>
               TABOO_CARD_0{currentIndex + 1} // CAUTION: FORBIDDEN LEXICON ALIVE
            </div>

            {timeLeft === 0 ? (
              <div style={{ animation: 'slideIn 0.3s ease' }}>
                <div className={styles.targetWord}>TIME'S UP!</div>
                <p style={{ fontSize: '2rem', fontFamily: 'monospace', color: '#ff4500' }}>Final Score: {score} Stars</p>
                {renderAwardButtons()}
              </div>
            ) : currentIndex >= words.length ? (
              <div style={{ animation: 'slideIn 0.3s ease' }}>
                <div className={styles.targetWord} style={{ color: 'var(--success)' }}>DECK CLEAR!</div>
                <p style={{ fontSize: '2rem', fontFamily: 'monospace', color: '#ff4500' }}>Final Score: {score} Stars</p>
                {renderAwardButtons()}
              </div>
            ) : (
              <div key={currentIndex} style={{ animation: 'slideIn 0.3s ease' }}>
                <div className={styles.targetWord}>{currentWord?.word}</div>
                <div className={styles.forbiddenContainer}>
                  {currentWord?.forbidden.map((f: string, i: number) => (
                    <span key={i} className={styles.forbiddenWord}>{f}</span>
                  ))}
                </div>
                
                <div className={styles.controls}>
                  <button onClick={() => handleScore(true)} className={styles.scoreBtn}>ACCESS GRANTED [SPACE]</button>
                  <button onClick={() => handleScore(false)} className={styles.skipBtn}>SKIP PROTOCOL</button>
                </div>
              </div>
            )}
          </div>

          {/* System Log on Right */}
          <div className={styles.systemLog}>
            <div className={styles.logHeader}>SYSTEM_LOG // STATUS</div>
            <div className={styles.scoreOverlay}>
              {score} XP
            </div>
            {currentTeams.length === 0 && <span style={{ opacity: 0.5 }}>No Teams Synchronized.</span>}
            {currentTeams.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{t.name}</span>
                <span style={{ color: '#ff4500', fontWeight: 800 }}>{t.score}</span>
              </div>
            ))}
            {words.length > 0 && isPlaying && (
              <div style={{ marginTop: '2rem' }}>
                <GameTimer variant="circle" label="HACK TIME" timeLeft={timeLeft} totalTime={timerDuration} showTimesUp={showTimesUp} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
