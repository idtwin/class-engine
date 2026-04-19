"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./wyr.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

const TEAM_COLORS = ['#00e87a','#00c8f0','#ffc843','#ff4d8f','#b06eff','#ff7d3b','#e2e8f0'];

export default function WouldYouRatherMode() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { getActiveApiKey, mistralModel, llmProvider, activeRoomCode, currentTeams } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useState<{ optionA: string, optionB: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);

  // Poll for votes
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomStudents(data.students || []);
        }
      } catch (e) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  useEffect(() => setMounted(true), []);

  // Skip mechanism using spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (prompts.length === 0) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (currentIndex < prompts.length - 1) setCurrentIndex(c => c + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prompts, currentIndex]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setPrompts([]); 

    try {
      const res = await fetch("/api/generate-wyr", {
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
      if (res.ok && data.prompts) {
        setPrompts(data.prompts);
        setCurrentIndex(0);
        if (activeRoomCode && data.prompts.length > 0) {
          fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
          }).then(() => {
            fetch("/api/room/action", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: data.prompts[0] } })
            });
          }).catch(() => {});
        }
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const currentPrompt = prompts[currentIndex];

  return (
    <>
      {/* Setup overlay */}
      {(prompts.length === 0 || isGenerating) && (
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
            <MultiplayerHost gameMode="wyr" forceShow />
            <button
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}
              onClick={() => setPrompts([])}
            >
              ← New Topic
            </button>
          </div>

          <div className={styles.wyrBody}>
            <div className={styles.wyrStanceLabel}>Choose your stance — defend it</div>

            {/* ── Podiums ── */}
            <div className={styles.wyrPodiums}>
              {/* A */}
              <div className={`${styles.wyrPodium} ${styles.wyrPodiumA}`} key={`a-${currentIndex}`}>
                <div className={styles.wyrPodiumGhost}>A</div>
                <div className={styles.wyrPodiumTag}>Option A</div>
                <div className={styles.wyrPodiumText}>{currentPrompt.optionA}</div>
                {activeRoomCode && (
                  <div className={styles.wyrChips}>
                    {(() => {
                      const voters = roomStudents.filter(s => s.lastAnswer === 'A');
                      return currentTeams.map((team, tIdx) => {
                        const voted = voters.some(s => team.students.some(ts => ts.name === s.name));
                        if (!voted) return null;
                        const col = TEAM_COLORS[tIdx % 7];
                        return (
                          <span key={team.id} className={styles.wyrChip} style={{ background: `${col}18`, border: `1px solid ${col}44`, color: col }}>
                            {team.name}
                          </span>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* VS */}
              <div className={styles.wyrVsCol}>
                <div className={styles.wyrVsLine}>
                  <div className={styles.wyrVsText}>VS</div>
                </div>
              </div>

              {/* B */}
              <div className={`${styles.wyrPodium} ${styles.wyrPodiumB}`} key={`b-${currentIndex}`}>
                <div className={styles.wyrPodiumGhost}>B</div>
                <div className={styles.wyrPodiumTag}>Option B</div>
                <div className={styles.wyrPodiumText}>{currentPrompt.optionB}</div>
                {activeRoomCode && (
                  <div className={styles.wyrChips}>
                    {(() => {
                      const voters = roomStudents.filter(s => s.lastAnswer === 'B');
                      return currentTeams.map((team, tIdx) => {
                        const voted = voters.some(s => team.students.some(ts => ts.name === s.name));
                        if (!voted) return null;
                        const col = TEAM_COLORS[tIdx % 7];
                        return (
                          <span key={team.id} className={styles.wyrChip} style={{ background: `${col}18`, border: `1px solid ${col}44`, color: col }}>
                            {team.name}
                          </span>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* ── Vote bar ── */}
            {activeRoomCode && (() => {
              const vA = roomStudents.filter(s => s.lastAnswer === 'A').length;
              const vB = roomStudents.filter(s => s.lastAnswer === 'B').length;
              const total = vA + vB;
              return total > 0 ? (
                <div className={styles.wyrVoteBar}>
                  <div className={styles.wyrVoteA} style={{ width: `${(vA / total) * 100}%` }}>
                    A · {Math.round((vA / total) * 100)}%
                  </div>
                  <div className={styles.wyrVoteB} style={{ width: `${(vB / total) * 100}%` }}>
                    {Math.round((vB / total) * 100)}% · B
                  </div>
                </div>
              ) : (
                <div className={styles.wyrVoteBar}>
                  <div className={styles.wyrVoteWaiting}>⏳ Waiting for votes...</div>
                </div>
              );
            })()}

            {/* ── Actions ── */}
            <div className={styles.wyrActionsRow}>
              {currentIndex < prompts.length - 1 ? (
                <button className={styles.wyrBtnNext} onClick={() => {
                  const nextIdx = currentIndex + 1;
                  setCurrentIndex(nextIdx);
                  if (activeRoomCode) {
                    fetch("/api/room/action", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
                    }).then(() => {
                      fetch("/api/room/action", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: prompts[nextIdx] } })
                      });
                    }).catch(() => {});
                  }
                }}>→ Next Scenario [Space]</button>
              ) : (
                <button className={styles.wyrBtnNext} onClick={() => setPrompts([])}>✓ Done — New Topic</button>
              )}
              <button className={styles.wyrBtnNew} onClick={() => setPrompts([])}>← New Topic</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
