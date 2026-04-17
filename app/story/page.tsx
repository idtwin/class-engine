"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./story.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

const TEAM_COLORS = ['#00e87a','#00c8f0','#ffc843','#ff4d8f','#b06eff','#ff7d3b','#e2e8f0'];
const PTS_PER_TURN = 50;
const SC_CIRC = 125.66;

export default function StoryChainMode() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, getActiveApiKey, mistralModel, llmProvider } = useClassroomStore();

  const [topic, setTopic]             = useState("");
  const [level, setLevel]             = useState("Mixed Level");
  const [timerDuration, setTimerDuration] = useState(20);
  const [isGenerating, setIsGenerating]   = useState(false);

  const [starter, setStarter]           = useState("");
  const [rounds, setRounds]             = useState<{ words: string[] }[]>([]);
  const [currentRound, setCurrentRound] = useState(-1);
  const [story, setStory]               = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [timeLeft, setTimeLeft]         = useState(20);
  const [timerActive, setTimerActive]   = useState(false);
  const [finished, setFinished]         = useState(false);

  const storyEndRef = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Timer countdown (skipped when timerDuration === 0)
  useEffect(() => {
    if (!timerActive || timerDuration === 0 || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timeLeft, timerDuration]);

  useEffect(() => {
    if (timeLeft === 0 && timerActive && timerDuration > 0) setTimerActive(false);
  }, [timeLeft, timerActive, timerDuration]);

  // Spacebar = GOT IT (when not focused on input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (rounds.length === 0 || finished) return;
      if (e.code === "Space" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        advance(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Auto-scroll story
  useEffect(() => {
    storyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [story]);

  if (!mounted) return null;

  const currentTeam  = currentTeams.length > 0 && currentRound >= 0
    ? currentTeams[currentRound % currentTeams.length]
    : null;
  const teamIdx      = currentTeam ? currentTeams.indexOf(currentTeam) : 0;
  const teamColor    = TEAM_COLORS[teamIdx % 7];
  const scUrgent     = timeLeft <= 5 && timerActive;
  const scDashOffset = SC_CIRC - (Math.max(timeLeft, 0) / timerDuration) * SC_CIRC;

  const handleGenerate = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    setIsGenerating(true);
    setRounds([]); setStory([]); setFinished(false); setCurrentInput("");
    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: getActiveApiKey(), mistralModel, provider: llmProvider, topic, level }),
      });
      const data = await res.json();
      if (res.ok && data.rounds) {
        setStarter(data.starter);
        setRounds(data.rounds);
        setCurrentRound(0);
        setTimeLeft(timerDuration);
        setTimerActive(timerDuration > 0);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (e: any) { alert("Failed: " + e.message); }
    setIsGenerating(false);
  };

  const advance = (awardPts: boolean) => {
    if (awardPts && currentTeam) updateTeamScore(currentTeam.id, PTS_PER_TURN);
    const sentence = currentInput.trim();
    if (sentence) setStory(prev => [...prev, sentence]);
    setCurrentInput("");
    if (currentRound >= rounds.length - 1) {
      setFinished(true);
      setTimerActive(false);
    } else {
      setCurrentRound(r => r + 1);
      setTimeLeft(timerDuration);
      setTimerActive(timerDuration > 0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const reset = () => {
    setRounds([]); setStory([]); setCurrentRound(-1); setStarter("");
    setCurrentInput(""); setFinished(false); setTimerActive(false);
  };

  return (
    <>
      {/* ── Setup modal ── */}
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
                <div className={styles.setupRow}>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Student Level</div>
                    <select className={styles.setupSelect} value={level} onChange={e => setLevel(e.target.value)}>
                      <option value="Low (A1)">Low (A1)</option>
                      <option value="Low-Mid (A1-A2)">Low-Mid (A1–A2)</option>
                      <option value="Mid (A2)">Mid (A2)</option>
                      <option value="Mid-High (A2-B1)">Mid-High (A2–B1)</option>
                      <option value="High (B1)">High (B1)</option>
                      <option value="Mixed Level">Mixed Level</option>
                    </select>
                  </div>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Timer per Turn</div>
                    <select className={styles.setupSelect} value={timerDuration} onChange={e => setTimerDuration(Number(e.target.value))}>
                      <option value={0}>No Timer</option>
                      <option value={15}>15 seconds</option>
                      <option value={20}>20 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds</option>
                      <option value={90}>90 seconds</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim()}>
                    <Sparkles size={16} /> Generate Story Setup
                  </button>
                  <button
                    style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 10, padding: '14px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}
                    onClick={() => router.push('/games')}
                  >
                    ← Back to Arcade
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Game view ── */}
      {rounds.length > 0 && !isGenerating && (
        <div className={styles.page}>

          {/* Header */}
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>Story Chain</div>
            <div className={styles.headerDivider} />
            {!finished ? (
              <div className={styles.qCounter}>
                Round <span className={styles.qCounterNum}>{currentRound + 1}</span> / {rounds.length}
              </div>
            ) : (
              <div className={styles.qCounter} style={{ color: '#00e87a' }}>Complete ✓</div>
            )}
            <div className={styles.headerSpacer} />

            {/* Current team badge */}
            {currentTeam && !finished && (
              <div
                className={styles.scTeamBadge}
                style={{ borderColor: `${teamColor}55`, background: `${teamColor}12`, color: teamColor }}
              >
                {currentTeam.name}&apos;s turn
              </div>
            )}

            {/* Circular timer */}
            {!finished && timerDuration > 0 && (
              <div className={styles.scTimerWrap}>
                <svg className={styles.scTimerSvg} viewBox="0 0 44 44">
                  <defs>
                    <linearGradient id="scGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00e87a" />
                      <stop offset="100%" stopColor="#00c8f0" />
                    </linearGradient>
                  </defs>
                  <circle className={styles.scTimerTrack} cx="22" cy="22" r="20" />
                  <circle
                    className={`${styles.scTimerRing}${scUrgent ? ` ${styles.scTimerRingUrgent}` : ''}`}
                    cx="22" cy="22" r="20"
                    stroke={scUrgent ? "#ff4444" : "url(#scGrad)"}
                    strokeDashoffset={scDashOffset}
                  />
                </svg>
                <div className={`${styles.scTimerNum}${scUrgent ? ` ${styles.scTimerNumUrgent}` : ''}`}>
                  {timeLeft}
                </div>
              </div>
            )}

            <button
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={reset}
            >
              ← New Story
            </button>
          </div>

          {/* Body */}
          <div className={styles.scBody}>

            {/* Story accumulator */}
            <div className={styles.scStoryBox}>
              <div className={styles.scStoryStarter}>&ldquo;{starter}&rdquo;</div>
              {story.map((line, i) => {
                const team = currentTeams.length > 0 ? currentTeams[i % currentTeams.length] : null;
                const col  = team ? TEAM_COLORS[currentTeams.indexOf(team) % 7] : '#4a637d';
                return (
                  <div key={i} className={styles.scStoryLine}>
                    {team && <span className={styles.scStoryDot} style={{ background: col }} />}
                    <span>{line}</span>
                  </div>
                );
              })}
              <div ref={storyEndRef} />
            </div>

            {/* Active turn */}
            {!finished ? (
              <div className={styles.scTurnCard}>
                <div className={styles.scWordsRow}>
                  {rounds[currentRound]?.words.map((w, i) => (
                    <div key={i} className={styles.scWordChip}>{w}</div>
                  ))}
                </div>
                <input
                  ref={inputRef}
                  className={styles.scInput}
                  placeholder="Type student's sentence (optional)..."
                  value={currentInput}
                  onChange={e => setCurrentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); advance(true); } }}
                />
                <div className={styles.scActionsRow}>
                  <button className={styles.scBtnGotIt} onClick={() => advance(true)}>
                    ✓ GOT IT
                    <span className={styles.scKeyHint}>[+{PTS_PER_TURN}pts · Space]</span>
                  </button>
                  <button className={styles.scBtnSkip} onClick={() => advance(false)}>
                    ↷ SKIP
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.scFinished}>
                <div className={styles.scFinishedLabel}>
                  {story.length} turn{story.length !== 1 ? 's' : ''} contributed to the story
                </div>
                <button className={styles.scBtnNew} onClick={reset}>← New Story</button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
