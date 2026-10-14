"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./hotseat.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles, SlidersHorizontal, ArrowLeft } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import FloatingReactionsOverlay from "../components/FloatingReactionsOverlay";
// @ts-ignore
import { Textfit } from "react-textfit";
import { useLiveRoomHost } from "@/app/lib/useLiveRoomHost";
import { playSFX } from "../lib/audio";

const STARTER_HOTSEAT_WORDS = [
  { word: "Smartphone", forbidden: ["Screen", "Call", "Apple", "Device"] },
  { word: "Pizza", forbidden: ["Cheese", "Italy", "Pepperoni", "Slice"] },
  { word: "Teacher", forbidden: ["School", "Class", "Student", "Homework"] },
  { word: "Airplane", forbidden: ["Fly", "Sky", "Airport", "Pilot"] },
  { word: "Cinema", forbidden: ["Movie", "Popcorn", "Film", "Watch"] },
  { word: "Elephant", forbidden: ["Animal", "Trunk", "Africa", "Zoo"] },
  { word: "Doctor", forbidden: ["Hospital", "Sick", "Medicine", "Nurse"] },
  { word: "Guitar", forbidden: ["Music", "Strings", "Instrument", "Rock"] },
  { word: "Coffee", forbidden: ["Drink", "Starbucks", "Morning", "Hot"] },
  { word: "Backpack", forbidden: ["Bag", "School", "Books", "Carry"] },
];

export default function HotSeatMode() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { setQuestion, reactions, roomState } = useLiveRoomHost("hotseat");
  const { 
    currentTeams, 
    activeTeamIndex,
    updateTeamScore, 
    getActiveApiKey, 
    mistralModel, 
    llmProvider,
    showTranslations,
    setShowTranslations
  } = useClassroomStore();

  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [words, setWords] = useState<any[]>(STARTER_HOTSEAT_WORDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [level, setLevel] = useState("A1-A2");
  const [usedWords, setUsedWords] = useState<string[]>([]);

  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(true);
  const [score, setScore] = useState(0);
  const [timerDuration, setTimerDuration] = useState(60);
  const [showTimesUp, setShowTimesUp] = useState(false);

  useEffect(() => setMounted(true), []);

  // Broadcast current word to connected mobile phones
  useEffect(() => {
    if (words[currentIndex]) {
      setQuestion({
        word: words[currentIndex].word,
        forbidden: words[currentIndex].forbidden,
        currentIndex: currentIndex + 1,
        totalWords: words.length
      });
    }
  }, [currentIndex, words, setQuestion]);

  // Handle phone actions (Score, Pass, Taboo) in real-time
  const lastEventTs = useRef<number>(0);
  useEffect(() => {
    const evt = roomState?.latestHotseatEvent;
    if (evt && evt.ts > lastEventTs.current) {
      lastEventTs.current = evt.ts;
      if (evt.type === "score") {
        handleScore(true);
      } else if (evt.type === "pass") {
        handleScore(false);
      } else if (evt.type === "taboo") {
        playSFX("wrong");
        setScore((s) => Math.max(0, s - 1));
      }
    }
  }, [roomState?.latestHotseatEvent]);

  // Round Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setShowTimesUp(true);
      setTimeout(() => setShowTimesUp(false), 3000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  // Global spacebar for quick scoring
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
  
  const parseWord = (text: string) => {
    if (!text) return { main: "", sub: "" };
    const match = text.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) return { main: match[1], sub: `(${match[2]})` };
    return { main: text, sub: "" };
  };

  const handleScore = (success: boolean) => {
    if (!isPlaying) return;

    if (success) {
      playSFX("correct");
      setScore((s) => s + 1);
      if (currentTeams.length > 0) {
        const activeTeam = currentTeams[activeTeamIndex % currentTeams.length];
        if (activeTeam) updateTeamScore(activeTeam.id, 100);
      }
    } else {
      playSFX("tick");
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex((c) => c + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-hotseat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          mistralModel,
          provider: llmProvider,
          topic,
          level,
          showTranslations,
          seed: Math.random().toString(36).substring(7),
          exclude: usedWords
        })
      });
      const data = await res.json();
      if (res.ok && data.words && data.words.length > 0) {
        setWords(data.words);
        const newWords = data.words.map((w: any) => parseWord(w.word).main);
        setUsedWords((prev) => [...prev, ...newWords].slice(-100));
        setCurrentIndex(0);
        setScore(0);
        setTimeLeft(timerDuration);
        setIsPlaying(true);
        setShowTimesUp(false);
        setShowConfigModal(false);
      } else {
        alert("Generation issue: " + (data.error || "Please try again"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  if (!mounted) return null;

  const currentWord = words[currentIndex];
  const { main, sub } = parseWord(currentWord?.word);

  const HS_CIRC = 125.66;
  const hsDashOffset = HS_CIRC - (timeLeft / timerDuration) * HS_CIRC;
  const hsTimerUrgent = timeLeft <= 10 && timerDuration > 0 && isPlaying;

  return (
    <>
      <FloatingReactionsOverlay reactions={reactions} />

      {/* AI Deck Generator Modal */}
      {(showConfigModal || isGenerating) && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>🔥</div>
              <div>
                <div className={styles.setupTitleText}>Hot Seat Generator</div>
                <div className={styles.setupTitleSub}>Taboo Description Arena</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <MultiplayerHost gameMode="hotseat" />
              </div>
            </div>

            {isGenerating ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Generating Taboo deck with AI...</div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Winter Holidays, Travel, Animals, Jobs..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    autoFocus
                  />
                </div>

                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Round Timer</div>
                  <select
                    className={styles.setupSelect}
                    value={timerDuration}
                    onChange={(e) => {
                      setTimerDuration(Number(e.target.value));
                      setTimeLeft(Number(e.target.value));
                    }}
                  >
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={90}>90 seconds</option>
                    <option value={120}>120 seconds</option>
                  </select>
                </div>

                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Target Level</div>
                  <select 
                    className={styles.setupSelect}
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="A1-A2">A1 - A2 (Beginner)</option>
                    <option value="B1-B2">B1 - B2 (Intermediate)</option>
                    <option value="C1-C2">C1 - C2 (Advanced)</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim()}>
                    <Sparkles size={16} /> Generate Taboo Deck
                  </button>
                  <button
                    style={{ background: "transparent", border: "1px solid var(--border2)", borderRadius: 10, padding: "14px 20px", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer" }}
                    onClick={() => setShowConfigModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Game Screen */}
      <div className={styles.page}>
        <div className={styles.gameHeader}>
          <div className={styles.gameTitle}>The Hot Seat</div>
          <div className={styles.headerDivider} />
          <div className={styles.qCounter}>
            Card <span className={styles.qCounterNum}>{currentIndex + 1}</span> / {words.length}
          </div>
          <div className={styles.headerSpacer} />

          {/* Timer Display */}
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
                className={`${styles.hsTimerRing}${hsTimerUrgent ? ` ${styles.hsTimerRingUrgent}` : ""}`}
                cx="22" cy="22" r="20"
                stroke={hsTimerUrgent ? "#ff4444" : "url(#hsGrad)"}
                strokeDashoffset={hsDashOffset}
              />
            </svg>
            <div className={`${styles.hsTimerNum}${hsTimerUrgent ? ` ${styles.hsTimerNumUrgent}` : ""}`}>
              {timeLeft}
            </div>
          </div>

          <button
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 14px", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" }}
            onClick={() => setShowConfigModal(true)}
          >
            <SlidersHorizontal size={13} /> Custom AI Deck
          </button>

          <MultiplayerHost gameMode="hotseat" />
        </div>

        <div className={styles.hsBody} style={{ position: "relative" }}>
          {/* Active Card */}
          {currentIndex < words.length && timeLeft > 0 && (
            <div key={currentIndex} className={styles.hsCard}>
              <div className={styles.hsTargetWord}>
                <Textfit 
                  mode="single" 
                  max={500} 
                  className={styles.hsMainWordFit}
                >
                  {main}
                </Textfit>
                {sub && <div className={styles.hsTranslation}>{sub}</div>}
              </div>

              <div className={styles.hsForbiddenRow}>
                {currentWord?.forbidden.map((f: string, i: number) => {
                  const parsed = parseWord(f);
                  return (
                    <span key={i} className={styles.hsForbiddenChip}>
                      <div className={styles.hsForbiddenMain}>❌ {parsed.main}</div>
                      {parsed.sub && <div className={styles.hsForbiddenSub}>{parsed.sub}</div>}
                    </span>
                  );
                })}
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

          {/* Finished Screen */}
          {(currentIndex >= words.length || timeLeft === 0) && (
            <div className={styles.hsFinished}>
              <div className={styles.hsFinishedLabel}>
                {timeLeft === 0 ? "⏱ TIME'S UP" : "✓ DECK CLEAR"}
              </div>
              <div className={styles.hsScore}>
                {score} <span className={styles.hsScoreLabel}>scored</span>
              </div>
              <div className={styles.hsAwardRow}>
                {currentTeams.map((t, idx) => {
                  const teamClass = styles[`hsAwardBtnT${idx + 1}`] || "";
                  return (
                    <button
                      key={t.id}
                      className={`${styles.hsAwardBtn} ${teamClass}`}
                      onClick={() => {
                        updateTeamScore(t.id, score * 100);
                        setCurrentIndex(0);
                        setTimeLeft(timerDuration);
                        setIsPlaying(true);
                      }}
                    >
                      +{score * 100} → {t.name}
                    </button>
                  );
                })}
                <button
                  className={styles.hsBtnNewDeck}
                  onClick={() => {
                    setCurrentIndex(0);
                    setTimeLeft(timerDuration);
                    setIsPlaying(true);
                  }}
                >
                  Replay Deck ↺
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
