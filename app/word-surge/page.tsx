"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./word-surge.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles, RefreshCw, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import PulseTimer from "../components/PulseTimer";
import { playCorrectSound, playBuzzerSound, playVictoryFanfare } from "@/utils/soundEffects";
import { useLiveRoomHost } from "@/app/lib/useLiveRoomHost";
import FloatingReactionsOverlay from "../components/FloatingReactionsOverlay";

interface PromptItem {
  original: string;
  scrambled: string[];
  hint: string;
  translation_id?: string;
}

const DEFAULT_WORD_SURGE_PROMPTS: PromptItem[] = [
  {
    original: "The agile fox jumped over the sleeping dog.",
    scrambled: ["jumped", "The", "dog.", "over", "sleeping", "agile", "fox", "the"],
    hint: "Action with two animals and a preposition"
  },
  {
    original: "Language learning unlocks opportunities around the world.",
    scrambled: ["the", "learning", "unlocks", "around", "world.", "Language", "opportunities"],
    hint: "The global power of communication"
  },
  {
    original: "Consistent practice produces extraordinary tactical results.",
    scrambled: ["practice", "extraordinary", "tactical", "results.", "Consistent", "produces"],
    hint: "How mastery is developed over time"
  },
  {
    original: "Curiosity and courage inspire remarkable discoveries.",
    scrambled: ["discoveries.", "courage", "remarkable", "Curiosity", "and", "inspire"],
    hint: "Two positive virtues leading to breakthroughs"
  },
  {
    original: "Teamwork transforms individual skills into collective triumph.",
    scrambled: ["into", "triumph.", "individual", "skills", "collective", "Teamwork", "transforms"],
    hint: "Collaboration leading to victory"
  }
];

export default function WordSurgePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { setQuestion, reactions, roomState, sendRoomAction } = useLiveRoomHost("wordsurge");
  const { getActiveApiKey, mistralModel, llmProvider, activeRoomCode, soundEnabled, recordTeamAnswer, currentTeams, activeTeamIndex, updateTeamScore, nextTurn, language } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [prompts, setPrompts] = useState<PromptItem[]>(DEFAULT_WORD_SURGE_PROMPTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (prompts.length > 0 && prompts[currentIndex]) {
      setAvailableWords([...prompts[currentIndex].scrambled]);
      setSelectedWords([]);
      setFeedback(null);
      setQuestion({
        original: prompts[currentIndex].original,
        scrambled: prompts[currentIndex].scrambled,
        hint: prompts[currentIndex].hint,
        currentIndex: currentIndex + 1,
        totalPrompts: prompts.length
      });
    }
  }, [prompts, currentIndex, setQuestion]);

  // Listen for mobile word surge submissions
  useEffect(() => {
    if (roomState?.surgeSubmit && prompts[currentIndex]) {
      const submitted = roomState.surgeSubmit.sentence?.trim().toLowerCase();
      const target = prompts[currentIndex].original.trim().toLowerCase();
      if (submitted === target) {
        setFeedback("correct");
        if (soundEnabled) playCorrectSound();
        if (roomState.surgeSubmit.teamId) {
          updateTeamScore(roomState.surgeSubmit.teamId, 100);
          recordTeamAnswer(roomState.surgeSubmit.teamId, true);
        }
      }
    }
  }, [roomState?.surgeSubmit, currentIndex, prompts, soundEnabled, updateTeamScore, recordTeamAnswer]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) return alert("Please enter a topic or select a preset!");
    setIsGenerating(true);
    setPrompts([]); 
    try {
      const res = await fetch("/api/generate-word-surge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: getActiveApiKey(), provider: llmProvider, topic, level: "Grade 11" })
      });
      const data = await res.json();
      if (res.ok && data.prompts) {
        setPrompts(data.prompts);
        setCurrentIndex(0);
        setShowSetupModal(false);
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) { alert("Failed to generate: " + e.message); }
    setIsGenerating(false);
  };

  const handleTileClick = (word: string, indexInAvailable: number) => {
    setSelectedWords(prev => [...prev, word]);
    setAvailableWords(prev => prev.filter((_, idx) => idx !== indexInAvailable));
  };

  const handleRemoveSelectedTile = (word: string, indexInSelected: number) => {
    setSelectedWords(prev => prev.filter((_, idx) => idx !== indexInSelected));
    setAvailableWords(prev => [...prev, word]);
  };

  const handleCheckAnswer = () => {
    const currentPrompt = prompts[currentIndex];
    const constructed = selectedWords.join(" ").trim().toLowerCase();
    const target = currentPrompt.original.trim().toLowerCase();

    const activeTeam = currentTeams.length > 0 ? currentTeams[activeTeamIndex % currentTeams.length] : null;

    if (constructed === target) {
      setFeedback("correct");
      if (soundEnabled) playCorrectSound();

      // Record team streak & score for winning active team
      if (activeTeam) {
        updateTeamScore(activeTeam.id, 100);
        recordTeamAnswer(activeTeam.id, true);
      }
    } else {
      setFeedback("wrong");
      if (soundEnabled) playBuzzerSound();
      if (activeTeam) {
        recordTeamAnswer(activeTeam.id, false);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(prev => prev + 1);
      if (currentTeams.length > 0) nextTurn();
    } else {
      if (soundEnabled) playVictoryFanfare();
      setPrompts([]);
    }
  };

  const currentPrompt = prompts[currentIndex];

  return (
    <>
      <PulseTimer duration={30} startTime={null} active={prompts.length > 0 && !isGenerating} />
      
      {/* Setup Overlay */}
      {(showSetupModal || isGenerating || prompts.length === 0) && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              {prompts.length > 0 && !isGenerating && (
                <button
                  onClick={() => setShowSetupModal(false)}
                  style={{
                    background: "transparent", border: "1px solid var(--border)",
                    borderRadius: 4, padding: "6px 12px", cursor: "pointer",
                    fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)",
                  }}
                >
                  ✕ Close
                </button>
              )}
              <div className={styles.setupTitleIcon}>⚡</div>
              <div>
                <div className={styles.setupTitleText}>Word Surge</div>
                <div className={styles.setupTitleSub}>Fast-Paced Sentence Unscramble</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <MultiplayerHost gameMode="word-surge" />
              </div>
            </div>

            {isGenerating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32 }}>
                <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--command-orange)' }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>
                  Scrambling sentence structures...
                </div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Environmental Reports, Recount Text..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim() || isGenerating}>
                    <Sparkles size={16} /> Generate Word Surge
                  </button>
                  <button
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '14px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}
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

      {/* Main Game Arena */}
      {prompts.length > 0 && !isGenerating && (
        <div className={styles.page}>
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>⚡ Word Surge</div>
            <div className={styles.headerDivider} />
            <div className={styles.qCounter}>
              Sentence <span className={styles.qCounterNum}>{currentIndex + 1}</span> / {prompts.length}
            </div>
            <div className={styles.headerSpacer} />
            <button
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={() => setShowSetupModal(true)}
            >
              ✨ AI Surge Deck
            </button>
            <button
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', marginLeft: 8 }}
              onClick={() => {
                setPrompts(DEFAULT_WORD_SURGE_PROMPTS);
                setCurrentIndex(0);
              }}
            >
              Reset Starter
            </button>
            <div style={{ marginLeft: 8 }}>
              <MultiplayerHost gameMode="word-surge" />
            </div>
          </div>

          <div className={styles.surgeBody}>
            {/* Hint Badge */}
            <div className={styles.hintBadge}>
              <Lightbulb size={16} />
              <span>{language === "ID" && currentPrompt.translation_id ? currentPrompt.translation_id : currentPrompt.hint}</span>
            </div>

            {/* Answer Slots */}
            <div className={styles.answerSlots}>
              {selectedWords.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>
                  Tap scrambled word tiles below to assemble the sentence...
                </div>
              ) : (
                selectedWords.map((word, idx) => (
                  <div
                    key={`selected-${idx}`}
                    className={`${styles.wordTile} ${styles.wordTileSelected}`}
                    onClick={() => handleRemoveSelectedTile(word, idx)}
                  >
                    {word}
                  </div>
                ))
              )}
            </div>

            {/* Scrambled Word Pool */}
            <div className={styles.tilesContainer}>
              {availableWords.map((word, idx) => (
                <div
                  key={`available-${idx}`}
                  className={styles.wordTile}
                  onClick={() => handleTileClick(word, idx)}
                >
                  {word}
                </div>
              ))}
            </div>

            {/* Feedback / Action Controls */}
            {feedback === "correct" && (
              <div className={styles.feedbackCorrect}>
                <CheckCircle2 size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Target Acquired! Sentence Unscrambled (+100 PTS)
              </div>
            )}

            {feedback === "wrong" && (
              <div className={styles.feedbackWrong}>
                <XCircle size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Structure Mismatch! Check the syntax and try again.
              </div>
            )}

            <div className={styles.actionRow}>
              {feedback === "correct" ? (
                <button className={styles.checkBtn} onClick={handleNext}>
                  {currentIndex < prompts.length - 1 ? "Next Sentence →" : "✓ Complete Surge"}
                </button>
              ) : (
                <button className={styles.checkBtn} onClick={handleCheckAnswer} disabled={selectedWords.length === 0}>
                  Verify Syntax
                </button>
              )}
              <button
                className={styles.resetBtn}
                onClick={() => {
                  setAvailableWords([...prompts[currentIndex].scrambled]);
                  setSelectedWords([]);
                  setFeedback(null);
                }}
              >
                Reset Tiles
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Real-time audience reactions overlay */}
      <FloatingReactionsOverlay reactions={reactions} />
    </>
  );
}
