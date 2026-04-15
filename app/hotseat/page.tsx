"use client";

import { useState, useEffect } from "react";
import styles from "./hotseat.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles, Zap } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";
import GameSettingsDrawer from "../components/GameSettingsDrawer";

export default function HotSeatMode() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, triggerTwist, getActiveApiKey, mistralModel, llmProvider } = useClassroomStore();

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

    if (!topic) return alert("Please enter a topic!");

    setIsGenerating(true);
    setWords([]);
    setIsPlaying(false);

    try {
      const res = await fetch("/api/generate-hotseat", {
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
    <>
      {/* Setup / Loading overlay */}
      {(words.length === 0 || isGenerating) && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>🔥</div>
              <div>
                <div className={styles.setupTitleText}>The Hot Seat</div>
                <div className={styles.setupTitleSub}>Taboo Description Game</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <MultiplayerHost gameMode="hotseat" />
              </div>
            </div>

            {isGenerating ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Generating Taboo deck...</div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Winter Holidays, Animals, Jobs..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    autoFocus
                  />
                </div>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Round Timer</div>
                  <select className={styles.setupSelect} value={timerDuration} onChange={e => { setTimerDuration(Number(e.target.value)); setTimeLeft(Number(e.target.value)); }}>
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={90}>90 seconds</option>
                    <option value={120}>120 seconds</option>
                  </select>
                </div>
                <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim()}>
                  <Sparkles size={16} /> Generate Taboo Deck
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Game view */}
      {words.length > 0 && !isGenerating && (
        <div className={styles.page}>
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>The Hot Seat</div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>
              Card <span className={styles.qCounterNum}>{currentIndex + 1}</span> / {words.length}
            </div>
            <div className={styles.headerSpacer} />
            <div className={styles.timerWrap}>
              <div className={`${styles.timerNum} ${timeLeft <= 10 ? styles.timerNumUrgent : ''}`}>
                {timeLeft}
              </div>
              <div className={styles.timerBar}>
                <div
                  className={`${styles.timerBarFill} ${timeLeft <= 10 ? styles.timerBarFillUrgent : ''}`}
                  style={{ width: `${(timeLeft / timerDuration) * 100}%` }}
                />
              </div>
            </div>
            <button
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={() => setWords([])}
            >
              ← New Deck
            </button>
          </div>
          <div className={styles.gameContent} style={{ padding: 0, alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'hidden' }}>

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

          </div>
        </div>
      )}
    </>
  );
}
