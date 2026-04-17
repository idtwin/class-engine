"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./hotseat.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

export default function HotSeatMode() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, getActiveApiKey, mistralModel, llmProvider } = useClassroomStore();

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
  const HS_CIRC = 125.66;
  const hsDashOffset = HS_CIRC - (timeLeft / timerDuration) * HS_CIRC;
  const hsTimerUrgent = timeLeft <= 10 && timerDuration > 0 && isPlaying;

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
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim()}>
                    <Sparkles size={16} /> Generate Taboo Deck
                  </button>
                  <button
                    style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 10, padding: '14px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}
                    onClick={() => router.push('/arcade')}
                  >
                    ← Back to Arcade
                  </button>
                </div>
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
            <div className={styles.hsTimerWrap}>
              <svg className={styles.hsTimerSvg} viewBox="0 0 44 44">
                <defs>
                  <linearGradient id="hsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff7d3b" />
                    <stop offset="100%" stopColor="#ffc843" />
                  </linearGradient>
                </defs>
                <circle className={styles.hsTimerTrack} cx="22" cy="22" r="20" />
                <circle
                  className={`${styles.hsTimerRing}${hsTimerUrgent ? ` ${styles.hsTimerRingUrgent}` : ''}`}
                  cx="22" cy="22" r="20"
                  stroke={hsTimerUrgent ? "#ff4444" : "url(#hsGrad)"}
                  strokeDashoffset={hsDashOffset}
                />
              </svg>
              <div className={`${styles.hsTimerNum}${hsTimerUrgent ? ` ${styles.hsTimerNumUrgent}` : ''}`}>
                {timeLeft}
              </div>
            </div>
            <button
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={() => setWords([])}
            >
              ← New Deck
            </button>
          </div>
          <div className={styles.hsBody}>

            {/* ── PLAYING ── */}
            {currentIndex < words.length && timeLeft > 0 && (
              <div key={currentIndex} className={styles.hsCard}>
                <div className={styles.hsTargetWord}>{currentWord?.word}</div>
                <div className={styles.hsForbiddenRow}>
                  {currentWord?.forbidden.map((f: string, i: number) => (
                    <span key={i} className={styles.hsForbiddenChip}>❌ {f}</span>
                  ))}
                </div>
                <div className={styles.hsActionsRow}>
                  <button className={styles.hsBtnGotIt} onClick={() => handleScore(true)}>
                    ✓ GOT IT <span className={styles.hsKeyHint}>[SPACE]</span>
                  </button>
                  <button className={styles.hsBtnSkip} onClick={() => handleScore(false)}>
                    ↷ SKIP
                  </button>
                </div>
              </div>
            )}

            {/* ── FINISHED ── */}
            {(currentIndex >= words.length || timeLeft === 0) && (
              <div className={styles.hsFinished}>
                <div className={styles.hsFinishedLabel}>
                  {timeLeft === 0 ? "⏱ TIME'S UP" : "✓ DECK CLEAR"}
                </div>
                <div className={styles.hsScore}>
                  {score} <span className={styles.hsScoreLabel}>scored</span>
                </div>
                <div className={styles.hsAwardRow}>
                  {currentTeams.map(t => (
                    <button
                      key={t.id}
                      className={styles.hsAwardBtn}
                      onClick={() => { updateTeamScore(t.id, score * 100); setWords([]); }}
                    >
                      +{score * 100} → {t.name}
                    </button>
                  ))}
                  <button className={styles.hsBtnNewDeck} onClick={() => setWords([])}>
                    New Deck
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
