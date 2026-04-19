"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./odd.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { Sparkles, Lightbulb, ChevronRight } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import GameTimer from "../components/GameTimer";
import BoardLibrary from "../components/BoardLibrary";
import { SavedBoard } from "../store/useClassroomStore";

type Phase = "SETUP" | "GENERATING" | "READY" | "PLAYING";
type Question = { level: string, words: string[], answer: string, hint: string };

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function OddOneOut() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, getActiveApiKey, getActiveModel, llmProvider, activeRoomCode, saveBoard } = useClassroomStore();
  
  const handleLoadBoard = (saved: SavedBoard) => {
    setQuestions(saved.content);
    setTopic(saved.topic);
    setCurrentIndex(0);
    setTimerActive(true);
  };
  
  const [topic, setTopic] = useState("");
  const [levelFilter, setLevelFilter] = useState("Mixed Level");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [phase, setPhase] = useState<Phase>("SETUP");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [penalizeWrong, setPenalizeWrong] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimesUp, setShowTimesUp] = useState(false);
  const [timerDuration, setTimerDuration] = useState(20);

  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);

  const currentQ = questions?.[currentIndex];

  const scoreStudents = useCallback((students: any[], data: any) => {
    const answeredStudents = students.filter((s: any) => s.answered && s.lastAnswer);
    const correctAnswers: any[] = [];
    const wrongAnswers: any[] = [];

    answeredStudents.forEach((s: any) => {
      const isCorrect = currentQ && s.lastAnswer === currentQ.answer;
      if (isCorrect) correctAnswers.push(s);
      else wrongAnswers.push(s);
    });

    correctAnswers.sort((a: any, b: any) => (a.answerTime || 0) - (b.answerTime || 0));

    const newPointsEarned: Record<string, number> = {};

    correctAnswers.forEach((s: any, idx: number) => {
      let pts = 100;
      if (idx === 0) pts = 500;
      else if (idx === 1) pts = 400;
      else if (idx === 2) pts = 300;
      else if (idx === 3) pts = 200;

      newPointsEarned[s.id] = pts;
      const team = currentTeams.find(t => t.name === s.name || t.students.some(ts => ts.name === s.name));
      if (team) updateTeamScore(team.id, pts);
    });

    if (penalizeWrong) {
      wrongAnswers.forEach((s: any) => {
        newPointsEarned[s.id] = -100;
        const team = currentTeams.find(t => t.name === s.name || t.students.some(ts => ts.name === s.name));
        if (team) updateTeamScore(team.id, -100);
      });
    }

    setPointsEarned(newPointsEarned);
  }, [currentQ, currentTeams, updateTeamScore, penalizeWrong]);

  const handleReveal = useCallback(async () => {
    setTimerActive(false);
    setShowTimesUp(false);
    setShowAnswer(true);

    if (activeRoomCode) {
      await fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: { answer: currentQ?.answer, explanation: currentQ?.hint } })
      }).catch(() => {});

      // Fetch fresh data for accurate scoring
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const freshData = await res.json();
          const freshStudents = freshData.students || [];
          setRoomStudents(freshStudents);
          setRoomData(freshData);
          scoreStudents(freshStudents, freshData);
        }
      } catch (e) {
        console.error("Failed to fetch fresh data for scoring", e);
        scoreStudents(roomStudents, roomData);
      }
    } else {
      scoreStudents(roomStudents, roomData);
    }
  }, [activeRoomCode, currentQ, roomStudents, roomData, scoreStudents]);

  // Poll for student responses
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomData(data);
          setRoomStudents(data.students || []);
        }
      } catch (e) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  // Auto-reveal when all teams have answered
  useEffect(() => {
    if (!activeRoomCode || !currentQ || showAnswer) return;
    if (roomStudents.length === 0) return;
    
    // Get unique team IDs from connected students
    const teamIds = new Set(roomStudents.map((s: any) => s.teamId).filter(Boolean));
    if (teamIds.size === 0) return;
    
    // Check if every team has at least one answered student
    const allTeamsAnswered = [...teamIds].every(teamId => 
      roomStudents.some((s: any) => s.teamId === teamId && s.answered)
    );
    
    if (allTeamsAnswered) {
      handleReveal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomStudents, showAnswer, handleReveal]);

  // Timer countdown — show TIME'S UP but do NOT auto-reveal
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setShowTimesUp(true);
      setTimeout(() => setShowTimesUp(false), 3000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const handleGenerate = async () => {
    
    
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setPhase("GENERATING");
    setQuestions(null);
    setCurrentIndex(0);
    setSelectedWord(null);
    setShowHint(false);
    setShowAnswer(false);
    setPointsEarned({});

    try {
      if (activeRoomCode) {
        await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
        });
      }

      const res = await fetch("/api/generate-odd-one-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          mistralModel: getActiveModel(),
          provider: llmProvider,
          topic,
          level: levelFilter
        })
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        const shuffled = data.questions.map((q: Question) => ({ ...q, words: shuffleArray(q.words) }));
        setQuestions(shuffled);
        setCurrentIndex(0);
        setPhase("READY");
      } else {
        setPhase("SETUP");
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      setPhase("SETUP");
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const handleLaunch = async () => {
    if (activeRoomCode) {
      try {
        const r1 = await fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "set_game_mode", payload: { gameMode: "oddoneout" } })
        });
        if (r1.ok) {
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "update_status", payload: { status: "playing" } })
          }).catch(() => {});
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
          }).catch(() => {});
          if (questions && questions[0]) {
            const firstQ = questions[0];
            const studentQ = { ...firstQ, words: shuffleArray(firstQ.words), answer: undefined, hint: undefined };
            await fetch("/api/room/action", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: studentQ } })
            }).catch(() => {});
          }
        }
      } catch {
        // Network error — proceed without student sync
      }
    }
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setPhase("PLAYING");
  };

  const nextQuestion = async () => {
    if (questions && currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      
      // Reset local state first
      setShowAnswer(false);
      setSelectedWord(null);
      setShowHint(false);
      setPointsEarned({});
      setRoomStudents(prev => prev.map(s => ({ ...s, answered: false, lastAnswer: null })));

      // Push new words to Redis + clear answers (shuffle & strip answer)
      if (activeRoomCode && questions[nextIdx]) {
        try {
          const nextQ = questions[nextIdx];
          const studentQ = { ...nextQ, words: shuffleArray(nextQ.words), answer: undefined, hint: undefined };
          
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
          });
          
          await fetch("/api/room/action", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: studentQ } })
          });
        } catch (e) {
          console.error("Sync Error", e);
        }
      }

      // Finally move the index to trigger the host UI update
      setCurrentIndex(nextIdx);
      setTimeLeft(timerDuration);
      setTimerActive(true);
    }
  };

  const timerDur = timerDuration;
  const timerPct = timerDur > 0 ? (timeLeft / timerDur) * 100 : 100;
  const timerUrgent = timeLeft <= 5 && timerDur > 0 && timerActive;
  const TIMER_CIRC = 125.66; // 2π × r(20)
  const dashOffset = timerDur > 0 ? TIMER_CIRC * (1 - timeLeft / timerDur) : 0;
  const timerMid = timeLeft <= 20 && timeLeft > 10 && timerDur > 0;
  const timerUrgentRing = timeLeft <= 10 && timerDur > 0;

  return (
    <>
      {/* Setup overlay — shown when no questions yet */}
      {(phase === "SETUP" || phase === "GENERATING" || phase === "READY") && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>🔮</div>
              <div>
                <div className={styles.setupTitleText}>Odd One Out</div>
                <div className={styles.setupTitleSub}>Word Pattern Recognition</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <MultiplayerHost gameMode="oddoneout" />
              </div>
            </div>

            {phase === "GENERATING" ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>Generating word sets...</div>
              </div>
            ) : phase === "READY" ? (
              <div className={styles.lobbyState}>
                <div className={styles.lobbyReadyBadge}>
                  <span className={styles.lobbyReadyDot} />
                  <span>{questions?.length} questions ready</span>
                </div>
                <div className={styles.lobbySection}>
                  <div className={styles.setupLabel}>
                    Students joined
                    <span className={styles.lobbyJoinCount}>{roomStudents.length}</span>
                  </div>
                  {roomStudents.length === 0 ? (
                    <div className={styles.lobbyEmpty}>Waiting for students to connect...</div>
                  ) : (
                    <div className={styles.lobbyStudentGrid}>
                      {roomStudents.map(s => {
                        const team = currentTeams.find(t => t.students.some((ts: any) => ts.name === s.name));
                        return (
                          <div key={s.id || s.name} className={styles.lobbyStudent}>
                            <span className={styles.lobbyStudentName}>{s.name}</span>
                            {team && <span className={styles.lobbyStudentTeam}>{team.name}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className={styles.lobbyActions}>
                  <button className={styles.btnLaunch} onClick={handleLaunch}>
                    Launch Game →
                  </button>
                  <button className={styles.btnBackSetup} onClick={() => setPhase("SETUP")}>
                    ← Back
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Planets, Animals, Sports..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isGenerating && handleGenerate()}
                    autoFocus
                  />
                </div>
                <div className={styles.setupRow}>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Difficulty</div>
                    <select className={styles.setupSelect} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                      <option value="Mixed Level">Mixed Level</option>
                      <option value="Low">Low (A1)</option>
                      <option value="Mid">Mid (A2)</option>
                      <option value="High">High (B1)</option>
                    </select>
                  </div>
                </div>
                <div className={styles.setupRow}>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Timer per Question</div>
                    <select className={styles.setupSelect} value={timerDuration} onChange={e => setTimerDuration(Number(e.target.value))}>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                      <option value={20}>20 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                    </select>
                  </div>
                  <div className={styles.setupField}>
                    <div className={styles.setupLabel}>Penalty for Wrong</div>
                    <select className={styles.setupSelect} value={String(penalizeWrong)} onChange={e => setPenalizeWrong(e.target.value === 'true')}>
                      <option value="false">No penalty</option>
                      <option value="true">Deduct points</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button className={styles.btnGenerate} onClick={handleGenerate} disabled={!topic.trim()}>
                    <Sparkles size={16} /> Generate Sets
                  </button>
                  <BoardLibrary currentGameType="oddoneout" onLoadBoard={handleLoadBoard} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PLAYING view ── */}
      {phase === "PLAYING" && questions && (
        <div className={styles.pageNew}>

          {/* Header */}
          <div className={styles.gameHeader}>
            <span className={styles.gameTitle}>ODD ONE OUT</span>
            <div className={styles.headerDivider} />
            <span className={styles.seqText}>SEQUENCE_0{currentIndex + 1}</span>
            <span className={styles.levelBadge}>{currentQ?.level.toUpperCase()}</span>
            {timerDur > 0 && (
              <div className={styles.timerCircleWrap}>
                <svg className={styles.timerSvg} viewBox="0 0 48 48">
                  <defs>
                    <linearGradient id="timerGradOoo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#b06eff" />
                      <stop offset="100%" stopColor="#ffc843" />
                    </linearGradient>
                  </defs>
                  <circle className={styles.timerTrack} cx="24" cy="24" r="20" />
                  <circle
                    className={`${styles.timerRing}${timerUrgentRing ? ` ${styles.timerRingUrgent}` : ''}`}
                    cx="24" cy="24" r="20"
                    stroke={timerUrgentRing ? '#ff4444' : timerMid ? '#ffc843' : 'url(#timerGradOoo)'}
                    style={{ strokeDashoffset: dashOffset }}
                  />
                </svg>
                <div className={`${styles.timerCircleNum}${timerUrgentRing ? ` ${styles.timerCircleNumUrgent}` : timerMid ? ` ${styles.timerCircleNumMid}` : ''}`}>
                  {timeLeft}
                </div>
              </div>
            )}
            <div style={{ flex: 1 }} />
            <MultiplayerHost gameMode="oddoneout" forceShow />
          </div>

          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill}${timerUrgentRing ? ` ${styles.progressFillUrgent}` : timerMid ? ` ${styles.progressFillMid}` : ''}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>

          {/* Body — single centered column */}
          <div className={styles.gameBody}>

            {/* Prompt */}
            <div className={`${styles.promptLabel}${showAnswer ? ` ${styles.promptRevealed}` : ''}`}>
              {showAnswer ? 'ANSWER REVEALED' : "PICK THE WORD THAT DOESN'T BELONG"}
            </div>

            {/* Word tiles */}
            <div className={styles.wordGrid}>
              {currentQ?.words.map((w, i) => {
                const isCorrect = w === currentQ.answer;
                const tileClass = showAnswer
                  ? isCorrect
                    ? `${styles.wordTile} ${styles.wordTileCorrect}`
                    : `${styles.wordTile} ${styles.wordTileDimmed}`
                  : styles.wordTile;
                return (
                  <div
                    key={i}
                    className={tileClass}
                    onClick={() => {
                      if (showAnswer) return;
                      setSelectedWord(w);
                      if (w === currentQ.answer) handleReveal();
                    }}
                  >
                    {w}{showAnswer && isCorrect ? ' ◆' : ''}
                  </div>
                );
              })}
            </div>

            {/* Hint card — shown before reveal when hint deployed */}
            {showHint && !showAnswer && currentQ?.hint && (
              <div className={`${styles.explainCard} ${styles.explainHint}`}>
                💡 {currentQ.hint}
              </div>
            )}

            {/* Explanation card — shown after reveal */}
            {showAnswer && currentQ && (
              <div className={styles.explainCard}>
                <strong className={styles.explainAnswer}>{currentQ.answer}</strong>
                {currentQ.hint ? ` — ${currentQ.hint}` : ''}
              </div>
            )}

            {/* Team status chips — only when a room is active and students are connected */}
            {currentTeams.length > 0 && roomStudents.length > 0 && (
              <div className={styles.teamsRow}>
                {currentTeams.map((team, idx) => {
                  const TEAM_COLORS = ['#00e87a','#00c8f0','#ffc843','#ff4d8f','#b06eff','#ff7d3b','#e2e8f0'];
                  const teamColor = TEAM_COLORS[idx % 7];
                  const members = roomStudents.filter(s =>
                    team.students.some((ts: any) => ts.name === s.name)
                  );
                  if (members.length === 0) return null;

                  const locked = !showAnswer && members.some(s => s.answered);
                  const anyCorrect = showAnswer && members.some(s => currentQ && s.lastAnswer === currentQ.answer);
                  const anyWrong = showAnswer && members.some(s => s.answered) && !anyCorrect;

                  const teamPts = showAnswer
                    ? Object.entries(pointsEarned)
                        .filter(([id]) => members.some(s => s.id === id))
                        .reduce((sum, [, p]) => sum + (p as number), 0)
                    : 0;

                  const chipClass = [
                    styles.teamChip,
                    anyCorrect ? styles.teamChipCorrect : '',
                    anyWrong   ? styles.teamChipWrong   : '',
                  ].filter(Boolean).join(' ');

                  const chipStyle = locked
                    ? { borderColor: teamColor, color: teamColor, backgroundColor: teamColor + '15' }
                    : {};

                  const prefix = anyCorrect ? '✓ ' : anyWrong ? '✗ ' : (showAnswer && !members.some(s => s.answered)) ? '— ' : locked ? '🔒 ' : '· ';

                  return (
                    <div key={team.id} className={chipClass} style={chipStyle}>
                      {prefix}{team.name.toUpperCase()}
                      {showAnswer && teamPts > 0 && <span className={styles.scorePop}> +{teamPts}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            <div className={styles.actionsRow}>
              {!showAnswer ? (
                <>
                  <button className={styles.btnReveal} onClick={handleReveal}>
                    ✦ INITIATE REVEAL
                  </button>
                  <button
                    className={styles.btnHint}
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                  >
                    💡 DEPLOY HINT
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={styles.btnNextSeq}
                    onClick={nextQuestion}
                    disabled={currentIndex === questions.length - 1}
                  >
                    NEXT SEQUENCE →
                  </button>
                  <button
                    className={styles.btnNewGame}
                    onClick={() => {
                      setPhase("SETUP");
                      setQuestions(null);
                      setCurrentIndex(0);
                      setShowAnswer(false);
                      setSelectedWord(null);
                      setShowHint(false);
                      setPointsEarned({});
                    }}
                  >
                    ← NEW GAME
                  </button>
                </>
              )}
            </div>

          </div>{/* /gameBody */}
        </div>
      )}
    </>
  );
}
