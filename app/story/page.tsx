"use client";

import { useState, useEffect } from "react";
import styles from "./story.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import ScoreboardOverlay from "../components/ScoreboardOverlay";
import GameTimer from "../components/GameTimer";

export default function StoryChainMode() {
  const [mounted, setMounted] = useState(false);
  const { triggerTwist, getActiveApiKey, mistralModel, llmProvider } = useClassroomStore();

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


    if (!topic) return alert("Please enter a topic!");

    setIsGenerating(true);
    setRounds([]);
    setIsPlaying(false);

    try {
      const res = await fetch("/api/generate-story", {
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
    <>
      {(rounds.length === 0 || isGenerating) && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>📖</div>
              <div>
                <div className={styles.setupTitleText}>Story Chain</div>
                <div className={styles.setupTitleSub}>Collaborative Improv Writing</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <MultiplayerHost gameMode="story" />
              </div>
            </div>
            {isGenerating ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Writing story setup...</div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Magic Forest, Space Adventure..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    autoFocus
                  />
                </div>
                <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim()}>
                  <Sparkles size={16} /> Generate Story Setup
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {rounds.length > 0 && !isGenerating && (
        <div className={styles.page}>
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>Story Chain</div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>
              Round <span className={styles.qCounterNum}>{Math.max(currentRound + 1, 1)}</span> / {rounds.length}
            </div>
            <div className={styles.headerSpacer} />
            <div className={styles.timerWrap}>
              <div className={`${styles.timerNum} ${timeLeft <= 5 ? styles.timerNumUrgent : ''}`}>
                {timeLeft}
              </div>
              <div className={styles.timerBar}>
                <div
                  className={`${styles.timerBarFill} ${timeLeft <= 5 ? styles.timerBarFillUrgent : ''}`}
                  style={{ width: `${(timeLeft / TURN_SECONDS) * 100}%` }}
                />
              </div>
            </div>
            <button
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={() => { setRounds([]); setCurrentRound(-1); setStarter(''); setIsPlaying(false); }}
            >
              ← New Story
            </button>
          </div>
          <div className={styles.gameContent}>
            <GameTimer
              timerActive={isPlaying}
              variant="bar"
              onTimeUp={() => setIsPlaying(false)}
              key={currentRound}
            />

            <div className={styles.starterText}>
              &ldquo;{starter}&rdquo;
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

                <div className={styles.nextWrap}>
                  <button className={styles.nextBtn} onClick={handleNextRound}>
                    NEXT TURN (SPACE)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
