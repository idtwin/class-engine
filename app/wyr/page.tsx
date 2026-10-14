"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import styles from "./wyr.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import PulseTimer from "../components/PulseTimer";
import FloatingReactionsOverlay from "../components/FloatingReactionsOverlay";
import { useLiveRoomHost } from "@/app/lib/useLiveRoomHost";

const TEAM_COLORS = ['#00e87a','#00c8f0','#ffc843','#ff4d8f','#b06eff','#ff7d3b','#e2e8f0'];

const STARTER_WYR_PROMPTS = [
  {
    optionA: "Have the ability to fly at 20 km/h",
    optionB: "Have the ability to teleport once per day",
    optionA_id: "Bisa terbang dengan kecepatan 20 km/jam",
    optionB_id: "Bisa teleportasi sekali setiap hari",
  },
  {
    optionA: "Never have to sleep again with full energy",
    optionB: "Never have to eat again but stay fully healthy",
    optionA_id: "Tidak perlu tidur lagi dan tetap penuh energi",
    optionB_id: "Tidak perlu makan lagi dan tetap sehat bugar",
  },
  {
    optionA: "Speak every human language fluently",
    optionB: "Be able to talk to and understand all animals",
    optionA_id: "Bisa berbicara semua bahasa manusia dengan lancar",
    optionB_id: "Bisa berbicara dan mengerti semua hewan",
  },
  {
    optionA: "Travel 100 years into the future",
    optionB: "Travel 100 years into the past",
    optionA_id: "Pergi 100 tahun ke masa depan",
    optionB_id: "Pergi 100 tahun ke masa lalu",
  },
  {
    optionA: "Always speak in rhymes",
    optionB: "Only be able to whisper for the rest of your life",
    optionA_id: "Selalu berbicara dengan rima berirama",
    optionB_id: "Hanya bisa berbisik seumur hidup",
  },
  {
    optionA: "Explore the deepest uncharted ocean",
    optionB: "Explore a newly discovered alien planet",
    optionA_id: "Menjelajahi samudra terdalam yang belum terpetakan",
    optionB_id: "Menjelajahi planet asing yang baru ditemukan",
  },
];

export default function WouldYouRatherMode() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { getActiveApiKey, mistralModel, llmProvider, activeRoomCode, currentTeams, language, showTranslations, setShowTranslations } = useClassroomStore();
  const { setQuestion, reactions, roomState } = useLiveRoomHost("wyr");
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [prompts, setPrompts] = useState<{ optionA: string, optionB: string, optionA_id?: string, optionB_id?: string }[]>(STARTER_WYR_PROMPTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);

  // Supabase Realtime for Votes & Students
  useEffect(() => {
    if (roomState?.students) {
      setRoomStudents(roomState.students);
    }
  }, [roomState?.students]);

  useEffect(() => setMounted(true), []);

  // Broadcast current dilemma to phones immediately
  useEffect(() => {
    if (prompts[currentIndex]) {
      setQuestion(prompts[currentIndex]);
    }
  }, [currentIndex, prompts, setQuestion]);

  const handleNext = async () => {
    if (currentIndex < prompts.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (activeRoomCode) {
        await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
        });
        await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: prompts[nextIdx] } })
        });
      }
    } else {
      setPrompts([]);
    }
  };

  // Skip mechanism
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (prompts.length === 0) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prompts, currentIndex, handleNext]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    setIsGenerating(true);
    setPrompts([]); 
    try {
      const res = await fetch("/api/generate-wyr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: getActiveApiKey(), mistralModel, provider: llmProvider, topic, level: "Mixed Level", showTranslations })
      });
      const data = await res.json();
      if (res.ok && data.prompts) {
        setPrompts(data.prompts);
        setCurrentIndex(0);
        // Sync first prompt to phones
        if (activeRoomCode) {
          fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: data.prompts[0] } })
          });
        }
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) { alert("Failed to generate: " + e.message); }
    setIsGenerating(false);
  };

  const currentPrompt = prompts[currentIndex];

  return (
    <>
      <FloatingReactionsOverlay reactions={reactions} />
      <PulseTimer duration={30} startTime={roomState?.questionStartTime} active={prompts.length > 0 && !isGenerating} />
      
      {/* Setup overlay */}
      {(showConfigModal || isGenerating) && (
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
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim() || isGenerating}>
                    <Sparkles size={16} /> Generate Scenarios
                  </button>
                  <label className={styles.translationToggle}>
                    <input 
                      type="checkbox" 
                      checked={showTranslations} 
                      onChange={(e) => setShowTranslations(e.target.checked)}
                    />
                    <span>INDONESIA (ID)</span>
                  </label>
                  <button
                    style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 10, padding: '14px 20px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}
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
            {activeRoomCode && (
              <div className={styles.qCounter}>
                {roomStudents.filter(s => s.lastAnswer).length} / {roomStudents.length} voted
              </div>
            )}
            <button
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 14px", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" }}
              onClick={() => setShowConfigModal(true)}
            >
              <SlidersHorizontal size={13} /> Custom AI Dilemmas
            </button>
            <MultiplayerHost gameMode="wyr" />
          </div>

          <div className={styles.wyrBody}>
            <div className={styles.wyrStanceLabel}>Choose your stance — defend it</div>

            <div className={styles.wyrPodiums}>
              {/* Option A */}
              <div className={`${styles.wyrPodium} ${styles.wyrPodiumA}`} key={`a-${currentIndex}`}>
                <div className={styles.wyrPodiumGhost}>A</div>
                <div className={styles.wyrPodiumTag}>Option A</div>
                <div className={styles.wyrPodiumText}>
                  {language === "ID" && currentPrompt.optionA_id ? currentPrompt.optionA_id : currentPrompt.optionA}
                </div>
                {activeRoomCode && (
                  <div className={styles.wyrChips}>
                    {currentTeams.map((team, tIdx) => {
                      const voted = roomStudents.some(s => s.lastAnswer === 'A' && team.students.some(ts => ts.id === s.id));
                      if (!voted) return null;
                      const col = TEAM_COLORS[tIdx % 7];
                      return (
                        <span key={team.id} className={styles.wyrChip} style={{ background: `${col}18`, border: `1px solid ${col}44`, color: col }}>
                          {team.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={styles.wyrVsCol}>
                <div className={styles.wyrVsLine}><div className={styles.wyrVsText}>VS</div></div>
              </div>

              {/* Option B */}
              <div className={`${styles.wyrPodium} ${styles.wyrPodiumB}`} key={`b-${currentIndex}`}>
                <div className={styles.wyrPodiumGhost}>B</div>
                <div className={styles.wyrPodiumTag}>Option B</div>
                <div className={styles.wyrPodiumText}>
                  {language === "ID" && currentPrompt.optionB_id ? currentPrompt.optionB_id : currentPrompt.optionB}
                </div>
                {activeRoomCode && (
                  <div className={styles.wyrChips}>
                    {currentTeams.map((team, tIdx) => {
                      const voted = roomStudents.some(s => s.lastAnswer === 'B' && team.students.some(ts => ts.id === s.id));
                      if (!voted) return null;
                      const col = TEAM_COLORS[tIdx % 7];
                      return (
                        <span key={team.id} className={styles.wyrChip} style={{ background: `${col}18`, border: `1px solid ${col}44`, color: col }}>
                          {team.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Vote bar */}
            {activeRoomCode && (() => {
              const vA = roomStudents.filter(s => s.lastAnswer === 'A').length;
              const vB = roomStudents.filter(s => s.lastAnswer === 'B').length;
              const total = vA + vB;
              return total > 0 ? (
                <div className={styles.wyrVoteBar}>
                  <div className={styles.wyrVoteA} style={{ width: `${(vA / total) * 100}%` }}>A · {Math.round((vA / total) * 100)}%</div>
                  <div className={styles.wyrVoteB} style={{ width: `${(vB / total) * 100}%` }}>{Math.round((vB / total) * 100)}% · B</div>
                </div>
              ) : (
                <div className={styles.wyrVoteBar}><div className={styles.wyrVoteWaiting}>⏳ Waiting for votes...</div></div>
              );
            })()}

            <div className={styles.wyrActionsRow}>
              <button className={styles.wyrBtnNext} onClick={handleNext}>
                {currentIndex < prompts.length - 1 ? "→ Next Scenario [Space]" : "✓ Done — New Topic"}
              </button>
              <button className={styles.wyrBtnNew} onClick={() => setPrompts([])}>← New Topic</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
