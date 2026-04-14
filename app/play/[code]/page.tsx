"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styles from "../play.module.css";
import { useParams } from "next/navigation";

// Team colour tokens matching design system
const TEAM_COLORS = [
  "#00e87a", "#00c8f0", "#ffc843",
  "#ff4d8f", "#b06eff", "#ff7d3b", "#e2e8f0",
];

const GAME_LABELS: Record<string, { emoji: string; label: string; badgeColor: string; badgeBg: string }> = {
  fixit:      { emoji: "🟡", label: "Fix It",        badgeColor: "#ffc843", badgeBg: "rgba(255,200,67,0.12)" },
  oddoneout:  { emoji: "🔮", label: "Odd One Out",   badgeColor: "#b06eff", badgeBg: "rgba(176,110,255,0.12)" },
  rapidfire:  { emoji: "⚡", label: "Rapid Fire",    badgeColor: "#ff4d8f", badgeBg: "rgba(255,77,143,0.12)" },
  jeopardy:   { emoji: "⊞",  label: "Jeopardy",      badgeColor: "#00c8f0", badgeBg: "rgba(0,200,240,0.12)" },
  reveal:     { emoji: "🖼️", label: "Pic Reveal",    badgeColor: "#ff7d3b", badgeBg: "rgba(255,125,59,0.12)" },
  wyr:        { emoji: "💬", label: "Would U Rather", badgeColor: "#00e87a", badgeBg: "rgba(0,232,122,0.12)" },
  hotseat:    { emoji: "🔥", label: "Hot Seat",      badgeColor: "#ff7d3b", badgeBg: "rgba(255,125,59,0.12)" },
  story:      { emoji: "📖", label: "Story Chain",   badgeColor: "#00e87a", badgeBg: "rgba(0,232,122,0.12)" },
  chainreaction:{ emoji:"🔗", label:"Chain Reaction", badgeColor: "#b06eff", badgeBg: "rgba(176,110,255,0.12)" },
};

export default function PlayPage() {
  const params = useParams();
  const code = params.code as string;

  // ── Core room state ──────────────────────────────
  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [myTeamInfo, setMyTeamInfo] = useState<{
    id: string; name: string; color: string; score: number
  } | null>(null);

  // ── Per-question interaction state ───────────────
  const [textInput, setTextInput]   = useState("");
  const [hasBuzzed, setHasBuzzed]   = useState(false);
  const [hasVoted, setHasVoted]     = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lastQuestionId, setLastQuestionId] = useState("");
  const [teammateBlocked, setTeammateBlocked] = useState<string | null>(null);

  // ── Personal stats (tracked locally) ────────────
  const [streak, setStreak]               = useState(0);
  const [personalScore, setPersonalScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctAnswered, setCorrectAnswered] = useState(0);

  // ── Post-submit feedback ─────────────────────────
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null); // null = locked/unknown
  const [feedbackText, setFeedbackText] = useState("");

  // ── Timer display ────────────────────────────────
  const [timerDisplay, setTimerDisplay] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Initialise from localStorage + start polling ─
  useEffect(() => {
    const stored = localStorage.getItem(`studentId_${code}`);
    const storedName = localStorage.getItem(`studentName_${code}`);
    if (!stored) {
      window.location.href = `/join?code=${code}`;
      return;
    }
    setStudentId(stored);
    setStudentName(storedName || "Player");

    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${code}`);
        if (res.ok) {
          const data = await res.json();
          setRoom(data);
        } else {
          const err = await res.json();
          setError(err.error || "Room not found");
        }
      } catch {
        // silent polling error — keep trying
      }
    };

    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [code]);

  // ── Derive team info ─────────────────────────────
  useEffect(() => {
    if (!room?.teams || !studentName) return;
    const team = room.teams.find((t: any) =>
      t.name === studentName ||
      t.students?.some((s: any) => s.name === studentName)
    );
    if (team) {
      const tIdx = room.teams.indexOf(team);
      setMyTeamInfo({
        id: team.id,
        name: team.name,
        color: team.color || TEAM_COLORS[tIdx % TEAM_COLORS.length],
        score: team.score || 0,
      });
    }
  }, [room, studentName]);

  // ── Reset per-question state when question changes
  useEffect(() => {
    if (!room?.currentQuestion) return;
    const qId =
      room.currentQuestion.sentence ||
      room.currentQuestion.brokenSentence ||
      room.currentQuestion.text ||
      room.currentQuestion.optionA ||
      JSON.stringify(room.currentQuestion);

    if (qId !== lastQuestionId) {
      setLastQuestionId(qId);
      setHasBuzzed(false);
      setHasVoted(false);
      setHasSubmitted(false);
      setSelectedWord(null);
      setTextInput("");
      setTeammateBlocked(null);
      setShowFeedback(false);
      setFeedbackCorrect(null);
      setFeedbackText("");
    }
  }, [room?.currentQuestion, lastQuestionId]);

  // ── Countdown timer from room.questionStartTime ──
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!room?.questionStartTime || !room?.questionDuration) {
      setTimerDisplay("");
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - room.questionStartTime) / 1000;
      const remaining = Math.max(0, room.questionDuration - elapsed);
      setTimerDisplay(remaining > 0 ? Math.ceil(remaining).toString() : "0");
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [room?.questionStartTime, room?.questionDuration]);

  // ── Action helper ────────────────────────────────
  const sendAction = useCallback(async (action: string, payload: any) => {
    try {
      const res = await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action, payload }),
      });
      return await res.json();
    } catch {
      return null;
    }
  }, [code]);

  // ── Record a result locally ──────────────────────
  const recordResult = useCallback((correct: boolean, feedbackMsg: string) => {
    const newStreak = correct ? streak + 1 : 0;
    const points    = correct ? 100 + streak * 10 : 0;
    setStreak(newStreak);
    setPersonalScore(prev => prev + points);
    setTotalAnswered(prev => prev + 1);
    if (correct) setCorrectAnswered(prev => prev + 1);
    setFeedbackCorrect(correct);
    setFeedbackText(feedbackMsg);
    setShowFeedback(true);
  }, [streak]);

  // ── Handlers (game logic unchanged) ─────────────
  const handleBuzz = async () => {
    if (hasBuzzed) return;
    if (room?.buzzes && myTeamInfo) {
      const myStudent = room.students?.find((s: any) => s.id === studentId);
      if (myStudent?.teamId) {
        const teamBuzz = room.buzzes.find((b: any) => b.teamId === myStudent.teamId);
        if (teamBuzz) { setTeammateBlocked(teamBuzz.name); return; }
      }
    }
    setHasBuzzed(true);
    sendAction("buzz_in", { studentId, name: studentName });
  };

  const handleVote = (vote: string) => {
    if (hasVoted) return;
    setHasVoted(true);
    sendAction("student_vote", { studentId, vote });
  };

  const handleSubmitAnswer = async () => {
    if (!textInput.trim() || hasSubmitted) return;
    const result = await sendAction("student_answer", { studentId, answer: textInput.trim() });
    if (result?.error === "teammate_answered") {
      setTeammateBlocked(result.answeredBy);
      return;
    }
    setHasSubmitted(true);
    // All games wait for teacher reveal
    setShowFeedback(true);
    setFeedbackCorrect(null);
    setFeedbackText("Locked in! Waiting for the teacher to reveal the answer...");
  };

  const handleTapWord = async (word: string) => {
    if (selectedWord) return;
    const result = await sendAction("student_answer", { studentId, answer: word });
    if (result?.error === "teammate_answered") {
      setTeammateBlocked(result.answeredBy);
      return;
    }
    setSelectedWord(word);
    setShowFeedback(true);
    setFeedbackCorrect(null);
    setFeedbackText("Answer locked! Waiting for the teacher...");
  };

  // Rapid fire: evaluate when answerRevealed flips
  useEffect(() => {
    if (
      room?.gameMode === "rapidfire" &&
      room?.answerRevealed &&
      selectedWord &&
      showFeedback &&
      feedbackCorrect === null
    ) {
      const correct = selectedWord === room.currentQuestion?.correctLetter;
      const explanation = correct
        ? "Correct choice! Well done."
        : `The correct answer was ${room.currentQuestion?.correctLetter}. ${room.currentQuestion?.options?.[room.currentQuestion.correctLetter] || ""}`;
      setFeedbackCorrect(correct);
      setFeedbackText(explanation);
      setStreak(prev => correct ? prev + 1 : 0);
      setPersonalScore(prev => prev + (correct ? 100 + streak * 10 : 0));
      setTotalAnswered(prev => prev + 1);
      if (correct) setCorrectAnswered(prev => prev + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.answerRevealed]);

  // Fix It: evaluate when answerRevealed flips (both Easy and Hard modes)
  useEffect(() => {
    if (
      room?.gameMode !== "fixit" ||
      !room?.answerRevealed ||
      feedbackCorrect !== null
    ) return;
    const myAnswer = (selectedWord || textInput).trim().toLowerCase();
    if (!myAnswer) return;
    const correctWord = (room.currentQuestion?.correctWord || "").toLowerCase();
    const correct = myAnswer === correctWord;
    const errorType = room.currentQuestion?.errorType || "";
    const hint = room.currentQuestion?.hint || "";
    recordResult(
      correct,
      correct
        ? `Correct! "${room.currentQuestion?.correctWord}" is right.${errorType ? ` This is a ${errorType} error.` : ""}`
        : `The correct word was "${room.currentQuestion?.correctWord}". ${hint}`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.answerRevealed]);

  // ════════════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════════════

  const teamColor = myTeamInfo?.color || "#00c8f0";
  const gameInfo  = GAME_LABELS[room?.gameMode] || { emoji: "🎮", label: "Game", badgeColor: "#00c8f0", badgeBg: "rgba(0,200,240,0.12)" };

  // ── Team strip + game header (shared top chrome) ─
  const renderGameChrome = () => (
    <>
      <div className={styles.teamStrip} style={{ background: teamColor }} />
      <div className={styles.gameHeader}>
        <div
          className={styles.gameBadge}
          style={{ color: gameInfo.badgeColor, background: gameInfo.badgeBg }}
        >
          <div className={styles.gameBadgeDot} style={{ background: gameInfo.badgeColor }} />
          {gameInfo.label}
        </div>
        {timerDisplay && (
          <div className={styles.gameTimer}>{timerDisplay}</div>
        )}
      </div>
    </>
  );

  // ── Teammate blocked notice ───────────────────────
  const renderTeammateBlock = () =>
    teammateBlocked ? (
      <div className={styles.teammateBlock}>
        <div className={styles.teammateBlockTitle}>🤝 Teammate Already Answered</div>
        <div className={styles.teammateBlockSub}>{teammateBlocked} locked in for your team</div>
      </div>
    ) : null;

  // ── Post-submit feedback screen ───────────────────
  const renderFeedback = () => {
    const isCorrect = feedbackCorrect === true;
    const isWrong   = feedbackCorrect === false;
    const isLocked  = feedbackCorrect === null;
    const pts = isCorrect ? 100 + (streak > 0 ? (streak - 1) * 10 : 0) : 0;

    return (
      <div className={styles.feedbackScreen}>
        {/* Background glow */}
        <div
          className={`${styles.feedbackBg} ${
            isCorrect ? styles.feedbackBgCorrect :
            isWrong   ? styles.feedbackBgWrong   : ""
          }`}
        />

        <div className={styles.feedbackContent}>
          {/* Icon */}
          <div
            className={`${styles.feedbackIcon} ${
              isCorrect ? styles.feedbackIconCorrect :
              isWrong   ? styles.feedbackIconWrong   :
              styles.feedbackIconLocked
            }`}
          >
            {isCorrect ? "✓" : isWrong ? "✗" : "🔒"}
          </div>

          {/* Result headline */}
          <div
            className={`${styles.feedbackResult} ${
              isCorrect ? styles.feedbackResultCorrect :
              isWrong   ? styles.feedbackResultWrong   :
              styles.feedbackResultLocked
            }`}
          >
            {isCorrect ? "Correct!" : isWrong ? "Not Quite" : "Locked In"}
          </div>

          {/* AI Feedback card */}
          {feedbackText && (
            <div className={styles.feedbackAiCard}>
              <div className={styles.feedbackAiLabel}>
                ⚡ AI FEEDBACK
              </div>
              <div className={styles.feedbackAiText}>{feedbackText}</div>
            </div>
          )}

          {/* Score row */}
          {(isCorrect || isWrong) && (
            <div className={styles.feedbackScoreRow}>
              <div className={styles.feedbackScoreCard}>
                <div
                  className={styles.feedbackScoreVal}
                  style={{ color: isCorrect ? "#00e87a" : "#4a637d" }}
                >
                  {isCorrect ? `+${pts}` : "+0"}
                </div>
                <div className={styles.feedbackScoreLabel}>This Round</div>
              </div>
              <div className={styles.feedbackScoreCard}>
                <div className={styles.feedbackScoreVal} style={{ color: "#00e87a" }}>
                  {personalScore}
                </div>
                <div className={styles.feedbackScoreLabel}>My Total</div>
              </div>
              <div className={styles.feedbackScoreCard}>
                <div className={styles.feedbackScoreVal} style={{ color: "#b06eff" }}>
                  {totalAnswered > 0
                    ? `${Math.round((correctAnswered / totalAnswered) * 100)}%`
                    : "—"}
                </div>
                <div className={styles.feedbackScoreLabel}>Accuracy</div>
              </div>
            </div>
          )}

          {/* Streak badge */}
          {isCorrect && streak >= 2 && (
            <div className={styles.streakBadge}>
              🔥 {streak} in a row!
            </div>
          )}
          {isWrong && streak === 0 && totalAnswered > 1 && (
            <div className={styles.streakBadge} style={{
              background: "rgba(255,68,68,0.08)",
              borderColor: "rgba(255,68,68,0.2)",
              color: "#ff6060"
            }}>
              💔 Streak lost
            </div>
          )}

          {/* Waiting indicator */}
          <div className={styles.feedbackWaiting}>
            <div className={styles.waitDots}>
              <div className={styles.waitDot} />
              <div className={styles.waitDot} />
              <div className={styles.waitDot} />
            </div>
            <div className={styles.feedbackWaitingText}>Waiting for class...</div>
          </div>
        </div>
      </div>
    );
  };

  // ── Lobby screen ──────────────────────────────────
  const renderLobby = () => {
    const teams: any[] = room?.teams || [];
    const accuracy = totalAnswered > 0
      ? Math.round((correctAnswered / totalAnswered) * 100)
      : 0;

    return (
      <div className={styles.lobbyScreen}>
        {/* Team banner */}
        {myTeamInfo && (
          <div
            className={styles.lobbyBanner}
            style={{
              background: `${myTeamInfo.color}12`,
              border: `1.5px solid ${myTeamInfo.color}30`,
            }}
          >
            <div
              className={styles.lobbyBannerGlow}
              style={{ background: myTeamInfo.color }}
            />
            <div className={styles.lobbyGreeting}>Welcome back,</div>
            <div className={styles.lobbyName}>{studentName} 👋</div>
            <div
              className={styles.lobbyTeamPill}
              style={{ color: myTeamInfo.color }}
            >
              <div
                className={styles.lobbyTeamPillDot}
                style={{ background: myTeamInfo.color }}
              />
              {myTeamInfo.name.toUpperCase()}
            </div>
          </div>
        )}

        {/* Personal stats */}
        <div className={styles.lobbyStats}>
          <div className={styles.lobbyStat}>
            <div className={styles.lobbyStatVal} style={{ color: "#ffc843" }}>
              {streak}
            </div>
            <div className={styles.lobbyStatLabel}>Streak</div>
          </div>
          <div className={styles.lobbyStat}>
            <div className={styles.lobbyStatVal} style={{ color: "#00e87a" }}>
              {personalScore}
            </div>
            <div className={styles.lobbyStatLabel}>My Score</div>
          </div>
          <div className={styles.lobbyStat}>
            <div className={styles.lobbyStatVal} style={{ color: "#b06eff" }}>
              {totalAnswered > 0 ? `${accuracy}%` : "—"}
            </div>
            <div className={styles.lobbyStatLabel}>Accuracy</div>
          </div>
        </div>

        {/* Team standings */}
        {teams.length > 0 && (
          <>
            <div className={styles.lobbyStandingsTitle}>// Team Standings</div>
            {[...teams]
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((team, i) => {
                const tIdx = room.teams.indexOf(team);
                const color = team.color || TEAM_COLORS[tIdx % TEAM_COLORS.length];
                const isMe  = myTeamInfo?.id === team.id;
                return (
                  <div
                    key={team.id}
                    className={`${styles.lobbyScoreRow} ${isMe ? styles.lobbyScoreRowMe : ""}`}
                  >
                    <div
                      className={styles.lobbyScoreDot}
                      style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
                    />
                    <div className={styles.lobbyScoreName}>
                      {i === 0 ? "👑 " : ""}{team.name}
                    </div>
                    {isMe && (
                      <div className={styles.lobbyScoreYou}>← YOU</div>
                    )}
                    <div className={styles.lobbyScorePts} style={{ color }}>
                      {(team.score || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })}
          </>
        )}

        {/* Waiting indicator */}
        <div className={styles.lobbyWaiting}>
          <div className={styles.waitDots}>
            <div className={styles.waitDot} />
            <div className={styles.waitDot} />
            <div className={styles.waitDot} />
          </div>
          <div className={styles.waitText}>Waiting for teacher to start...</div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════
  // STATE ROUTING
  // ════════════════════════════════════════════════

  // Loading
  if (!room && !error) {
    return (
      <div className={styles.endScreen}>
        <div className={styles.spinner} />
        <div className={styles.endSub}>Connecting to session...</div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={styles.endScreen}>
        <div style={{ fontSize: 48 }}>📡</div>
        <div className={styles.endTitle}>Disconnected</div>
        <div className={styles.endSub}>{error}</div>
      </div>
    );
  }

  // Session ended
  if (room.status === "ended") {
    return (
      <div className={styles.endScreen}>
        <div style={{ fontSize: 56 }}>🏁</div>
        <div className={styles.endTitle}>Session Over!</div>
        <div className={styles.endSub}>Final score: {personalScore} pts · {totalAnswered > 0 ? `${Math.round((correctAnswered / totalAnswered) * 100)}%` : "0%"} accuracy</div>
        <div className={styles.endSub} style={{ marginTop: 4, fontSize: 13 }}>The host has closed this session.</div>
      </div>
    );
  }

  // Lobby (waiting)
  if (room.status === "waiting") {
    return renderLobby();
  }

  // ── Active game ──────────────────────────────────
  const me = room.students?.find((s: any) => s.id === studentId);
  const isPassive = room.gameMode === "hotseat" || room.gameMode === "story";

  // Show feedback after submit
  if (showFeedback) {
    return renderFeedback();
  }

  // Waiting for question to load
  if (!room.currentQuestion && !isPassive) {
    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.loadingState}>
          <div className={styles.loadingEmoji}>{gameInfo.emoji}</div>
          <div className={styles.loadingTitle}>{gameInfo.label}</div>
          <div className={styles.spinner} />
          <div className={styles.loadingMuted}>Waiting for the teacher to load the next question...</div>
          <div className={styles.loadingSmall}>Stay on this screen!</div>
        </div>
      </div>
    );
  }

  // Passive games (hot seat, story)
  if (isPassive) {
    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.loadingState}>
          <div className={styles.loadingEmoji}>{gameInfo.emoji}</div>
          <div className={styles.loadingTitle}>Watch the Projector!</div>
          <div className={styles.loadingMuted}>
            This game is played live in the classroom. Follow along on the big screen!
          </div>
        </div>
      </div>
    );
  }

  // ── RAPID FIRE: Multiple Choice ──────────────────
  if (room.gameMode === "rapidfire" && room.currentQuestion?.options) {
    const isRevealed  = room.answerRevealed;
    const sInfo       = room.students?.find((s: any) => s.id === studentId);
    const myPick      = sInfo?.lastAnswer || selectedWord;
    const correctLetter = room.currentQuestion.correctLetter;

    if (isRevealed && myPick && !showFeedback) {
      // Trigger feedback evaluation (handled by useEffect above)
    }

    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.gameBody}>
          {/* Question */}
          <div className={styles.questionCard}>
            <div style={{ fontSize: 11, color: "#4a637d", marginBottom: 6, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {room.currentQuestion.type}
            </div>
            {room.currentQuestion.text}
          </div>

          {!isRevealed ? (
            <div className={styles.optionsGrid}>
              {(["A", "B", "C", "D"] as const).map((letter) => {
                const picked   = myPick === letter;
                const anyPicked= !!myPick;
                return (
                  <button
                    key={letter}
                    className={`${styles.optionBtn} ${picked ? styles.optionSelected : ""} ${anyPicked && !picked ? styles.optionDisabled : ""}`}
                    onClick={async () => {
                      if (myPick || teammateBlocked) return;
                      const result = await sendAction("student_answer", { studentId, answer: letter });
                      if (result?.error === "teammate_answered") {
                        setTeammateBlocked(result.answeredBy);
                        return;
                      }
                      setSelectedWord(letter);
                    }}
                    disabled={!!myPick || !!teammateBlocked}
                  >
                    <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 22, fontWeight: 700, opacity: 0.8, marginBottom: 4 }}>{letter}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{room.currentQuestion.options[letter]}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{
                padding: "20px",
                borderRadius: 18,
                border: `2px solid ${myPick === correctLetter ? "rgba(0,232,122,0.4)" : "rgba(255,68,68,0.35)"}`,
                background: myPick === correctLetter ? "rgba(0,232,122,0.08)" : "rgba(255,68,68,0.08)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: 28, marginBottom: 6, fontWeight: 900 }}>
                  {myPick === correctLetter ? "✓ Correct!" : "✗ Incorrect"}
                </div>
                {myPick && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>You picked: <strong>{myPick}</strong></div>}
              </div>
              <div style={{ background: "#0e1520", padding: "16px", borderRadius: 16, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#4a637d", marginBottom: 4, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Correct Answer</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#00e87a" }}>
                  {correctLetter}. {room.currentQuestion.options[correctLetter]}
                </div>
              </div>
            </div>
          )}

          {myPick && !isRevealed && (
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#00c8f0" }}>
              Answer locked ✓ · Waiting for reveal...
            </div>
          )}
          {renderTeammateBlock()}
        </div>
      </div>
    );
  }

  // ── FIX IT ───────────────────────────────────────
  if (room.gameMode === "fixit" && room.currentQuestion) {
    const q = room.currentQuestion;
    const fixMode = q.fixit_mode || "Easy";
    const isRevealed = room.answerRevealed;
    const myAnswer = selectedWord || (hasSubmitted ? textInput : "");

    // Split sentence around wrong word for display
    const sentenceParts = q.wrongWord
      ? q.sentence?.split(new RegExp(`(\\b${q.wrongWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i")) || [q.sentence]
      : [q.sentence];

    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.gameBody}>

          {/* Sentence with wrong word underlined */}
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#dce8f5",
            lineHeight: 1.5,
            textAlign: "center",
            padding: "0 8px",
            fontFamily: "var(--font-nunito, Nunito, sans-serif)",
          }}>
            {sentenceParts.map((part, i) =>
              sentenceParts.length > 1 && i === 1
                ? <span key={i} style={{
                    color: "#ffc843",
                    textDecoration: "underline",
                    textUnderlineOffset: "4px",
                    textDecorationColor: "rgba(255,200,67,0.5)",
                  }}>{part}</span>
                : part
            )}
          </div>

          {!isRevealed ? (
            <>
              {/* Easy mode: word option buttons */}
              {fixMode === "Easy" && q.options && (
                <div className={styles.optionsGrid}>
                  {(q.options as string[]).map((word: string, i: number) => {
                    const letters = ["A", "B", "C", "D"];
                    const picked = myAnswer === word;
                    const anyPicked = !!myAnswer;
                    return (
                      <button
                        key={word}
                        className={`${styles.optionBtn} ${picked ? styles.optionSelected : ""} ${anyPicked && !picked ? styles.optionDisabled : ""}`}
                        onClick={async () => {
                          if (myAnswer || teammateBlocked) return;
                          const result = await sendAction("student_answer", { studentId, answer: word });
                          if (result?.error === "teammate_answered") {
                            setTeammateBlocked(result.answeredBy);
                            return;
                          }
                          setSelectedWord(word);
                        }}
                        disabled={!!myAnswer || !!teammateBlocked}
                      >
                        <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 16, fontWeight: 700, opacity: 0.6, marginBottom: 4 }}>{letters[i]}</div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{word}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Hard mode: single word text input */}
              {fixMode === "Hard" && !hasSubmitted && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                  <input
                    className={styles.fixitInput}
                    type="text"
                    placeholder="Type the correct word..."
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && textInput.trim() && handleSubmitAnswer()}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <button
                    className={styles.fixitSubmit}
                    onClick={handleSubmitAnswer}
                    disabled={!textInput.trim()}
                  >
                    Lock In ✓
                  </button>
                </div>
              )}

              {(myAnswer || hasSubmitted) && (
                <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#00c8f0" }}>
                  Answer locked ✓ · Waiting for reveal...
                </div>
              )}
            </>
          ) : (
            /* Revealed — show result inline (useEffect handles feedback screen) */
            <div style={{ textAlign: "center", fontSize: 15, color: "#4a637d" }}>
              Answer revealed — checking your result...
            </div>
          )}

          {renderTeammateBlock()}
        </div>
      </div>
    );
  }

  // ── BUZZER GAMES: Jeopardy, Rapid Fire (buzz), Picture Reveal ──
  if (room.gameMode === "jeopardy" || room.gameMode === "rapidfire" || room.gameMode === "reveal") {
    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.buzzBody}>
          {room.currentQuestion && (
            <div style={{ textAlign: "center", maxWidth: 280 }}>
              {room.currentQuestion.category && (
                <div style={{ fontSize: 11, color: "#4a637d", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  {room.currentQuestion.category}{room.currentQuestion.points ? ` · ${room.currentQuestion.points} pts` : ""}
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f6ff" }}>
                {room.currentQuestion.text}
              </div>
            </div>
          )}

          {teammateBlocked ? (
            renderTeammateBlock()
          ) : !hasBuzzed ? (
            <>
              <div className={styles.buzzLabel}>Know the answer?</div>
              <button className={styles.buzzBtn} onClick={handleBuzz}>
                BUZZ
              </button>
              <div className={styles.buzzTeamScore}>
                {myTeamInfo?.name} · {(myTeamInfo?.score || 0).toLocaleString()} pts
              </div>
            </>
          ) : (
            <div className={styles.buzzedIn}>
              <div className={styles.buzzedInLabel}>🔔 BUZZED IN!</div>
              {room.gameMode === "jeopardy" && !hasSubmitted && (
                <>
                  <textarea
                    className={styles.buzzAnswer}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    placeholder="Type your answer..."
                  />
                  <button
                    className={styles.buzzSubmit}
                    onClick={() => {
                      if (!textInput.trim()) return;
                      setHasSubmitted(true);
                      sendAction("student_answer", { studentId, answer: textInput.trim() });
                      setShowFeedback(true);
                      setFeedbackCorrect(null);
                      setFeedbackText("Answer locked! The teacher will judge your response.");
                    }}
                    disabled={!textInput.trim()}
                  >
                    Lock In Answer 🔒
                  </button>
                </>
              )}
              {(hasSubmitted || room.gameMode !== "jeopardy") && !hasSubmitted && (
                <div style={{ fontSize: 14, fontWeight: 600, color: "#4a637d" }}>Waiting for teacher...</div>
              )}
              {hasSubmitted && room.gameMode === "jeopardy" && (
                <div style={{ fontSize: 14, fontWeight: 700, color: "#00c8f0" }}>Locked in ✓</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ODD ONE OUT ──────────────────────────────────
  if (room.gameMode === "oddoneout") {
    const words: string[] = room.currentQuestion?.words || ["...", "...", "...", "..."];
    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.gameBody}>
          <div className={styles.questionCard}>
            Tap the word that doesn&apos;t belong
          </div>
          <div className={styles.optionsGrid}>
            {words.map((w: string, idx: number) => (
              <button
                key={idx}
                className={`${styles.optionBtn} ${selectedWord === w ? styles.optionSelected : ""} ${selectedWord && selectedWord !== w ? styles.optionDisabled : ""}`}
                onClick={() => handleTapWord(w)}
                disabled={!!selectedWord || !!teammateBlocked}
              >
                {w}
              </button>
            ))}
          </div>
          {selectedWord && (
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#00c8f0" }}>
              &ldquo;{selectedWord}&rdquo; locked ✓
            </div>
          )}
          {renderTeammateBlock()}
        </div>
      </div>
    );
  }

  // ── FIX IT ───────────────────────────────────────
  if (room.gameMode === "fixit") {
    const isRevealed  = room.answerRevealed;
    const sInfo       = room.students?.find((s: any) => s.id === studentId);
    const myAnswer    = sInfo?.lastAnswer || textInput;
    const correctAnswer = room.currentQuestion?.correctedSentence;
    const isCorrect   = myAnswer && correctAnswer &&
      myAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    const timeMs      = sInfo?.answerTime && room.questionStartTime
      ? ((sInfo.answerTime - room.questionStartTime) / 1000).toFixed(1) + "s"
      : "";

    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.gameBody}>
          <div className={styles.fixitPromptLabel}>Find &amp; fix the error</div>

          {/* Sentence */}
          {room.currentQuestion?.brokenSentence && !isRevealed && (
            <div className={styles.fixitSentence}>
              &ldquo;{room.currentQuestion.brokenSentence}&rdquo;
            </div>
          )}

          {/* Hint */}
          {room.currentQuestion?.hint && !isRevealed && !hasSubmitted && (
            <div className={styles.fixitHint}>
              💡 <span>{room.currentQuestion.hint}</span>
            </div>
          )}

          {!isRevealed ? (
            <>
              {teammateBlocked ? renderTeammateBlock() : (
                <>
                  <textarea
                    className={styles.fixitInput}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    disabled={hasSubmitted}
                    placeholder="Type the corrected sentence..."
                  />
                  <button
                    className={styles.fixitSubmit}
                    onClick={handleSubmitAnswer}
                    disabled={hasSubmitted || !textInput.trim()}
                  >
                    {hasSubmitted ? "Locked In ✓" : <>Submit Answer ✓</>}
                  </button>
                </>
              )}
            </>
          ) : (
            /* Answer revealed by teacher */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{
                padding: 20,
                borderRadius: 18,
                border: `2px solid ${isCorrect ? "rgba(0,232,122,0.4)" : "rgba(255,68,68,0.35)"}`,
                background: isCorrect ? "rgba(0,232,122,0.08)" : "rgba(255,68,68,0.08)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>
                  {isCorrect ? "✓ You got it!" : "✗ Incorrect"}
                </div>
                {timeMs && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Locked in at {timeMs}</div>
                )}
              </div>
              <div style={{ background: "#0e1520", padding: 16, borderRadius: 16 }}>
                <div style={{ fontSize: 11, color: "#4a637d", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Your Answer</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isCorrect ? "#00e87a" : "#ff6060" }}>&ldquo;{myAnswer}&rdquo;</div>
              </div>
              {!isCorrect && (
                <div style={{ background: "#0e1520", padding: 16, borderRadius: 16 }}>
                  <div style={{ fontSize: 11, color: "#4a637d", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Correct Answer</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#00c8f0" }}>&ldquo;{correctAnswer}&rdquo;</div>
                </div>
              )}
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#4a637d" }}>
                Waiting for next round...
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── WOULD YOU RATHER ─────────────────────────────
  if (room.gameMode === "wyr") {
    const votedStudents = room.students?.filter((s: any) => s.answered) || [];
    const votersA = votedStudents.filter((s: any) => s.lastAnswer === "A");
    const votersB = votedStudents.filter((s: any) => s.lastAnswer === "B");
    const total   = votersA.length + votersB.length;
    const pctA    = total > 0 ? Math.round((votersA.length / total) * 100) : 0;
    const pctB    = total > 0 ? Math.round((votersB.length / total) * 100) : 0;

    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.gameBody}>
          {room.currentQuestion ? (
            <>
              <div className={styles.questionCard} style={{ fontSize: 14 }}>
                Would you rather...?
              </div>
              <div className={styles.wyrGrid}>
                <button
                  className={`${styles.wyrOption} ${styles.wyrOptionA}`}
                  onClick={() => handleVote("A")}
                  disabled={hasVoted}
                  style={hasVoted && me?.lastAnswer === "A" ? { outline: "3px solid rgba(255,255,255,0.4)" } : {}}
                >
                  {room.currentQuestion.optionA}
                </button>
                <div className={styles.wyrVsLabel}>VS</div>
                <button
                  className={`${styles.wyrOption} ${styles.wyrOptionB}`}
                  onClick={() => handleVote("B")}
                  disabled={hasVoted}
                  style={hasVoted && me?.lastAnswer === "B" ? { outline: "3px solid rgba(255,255,255,0.4)" } : {}}
                >
                  {room.currentQuestion.optionB}
                </button>
              </div>

              {/* Vote bar */}
              <div className={styles.wyrBar}>
                <div className={styles.wyrBarHeader}>
                  <span className={styles.wyrBarPctA}>{pctA}%</span>
                  <span className={styles.wyrBarCount}>{total} vote{total !== 1 ? "s" : ""}</span>
                  <span className={styles.wyrBarPctB}>{pctB}%</span>
                </div>
                <div className={styles.wyrBarTrack}>
                  <div className={styles.wyrBarFillA} style={{ width: `${pctA}%` }} />
                  <div className={styles.wyrBarFillB} style={{ width: `${pctB}%` }} />
                </div>
                {hasVoted && <div className={styles.wyrVotedLabel}>VOTE RECORDED ✓</div>}
              </div>
            </>
          ) : (
            <div className={styles.loadingState}>
              <div className={styles.loadingEmoji}>💬</div>
              <div className={styles.loadingMuted}>Waiting for next scenario...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FALLBACK ─────────────────────────────────────
  return (
    <div className={styles.endScreen}>
      <div className={styles.loadingEmoji} style={{ fontSize: 48 }}>🎮</div>
      <div className={styles.endSub}>Waiting for game to begin...</div>
    </div>
  );
}
