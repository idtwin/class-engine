"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
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
  const feedbackProcessed = useRef(false);

  // ── Chain Reaction phone state ───────────────────
  const [phoneInput, setPhoneInput] = useState("");

  // ── Picture Reveal: open guess state ─────────────
  const [openGuessInput, setOpenGuessInput] = useState("");
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [openGuessWrong, setOpenGuessWrong] = useState(false);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

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
      feedbackProcessed.current = false;
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

  // Reset open guess state when round resets (tilesRevealed drops to 0)
  useEffect(() => {
    if ((room?.tilesRevealed || 0) === 0) {
      setGuessesUsed(0);
      setOpenGuessInput("");
      setOpenGuessWrong(false);
    }
  }, [room?.tilesRevealed]);

  // Reset phone tile input when active word or active team changes
  const crTeamId  = room?.chainState?.currentTeamId;
  const crWordIdx = room?.chainState?.currentWordIdx;
  useEffect(() => { setPhoneInput(""); }, [crTeamId, crWordIdx]);

  // Auto-focus hidden input when it becomes our turn; blur when it doesn't
  useEffect(() => {
    if (crTeamId === myTeamInfo?.id) {
      setTimeout(() => phoneInputRef.current?.focus(), 100);
    } else {
      phoneInputRef.current?.blur();
    }
  }, [crTeamId, myTeamInfo?.id]);

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

  // Rapid fire: evaluate when answerRevealed flips
  useEffect(() => {
    if (
      room?.gameMode === "rapidfire" &&
      room?.answerRevealed &&
      selectedWord &&
      showFeedback
    ) {
      if (feedbackProcessed.current) return;
      feedbackProcessed.current = true;
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

  // Odd One Out: evaluate when answerRevealed flips
  useEffect(() => {
    if (room?.gameMode !== "oddoneout") return;
    if (!room?.answerRevealed || feedbackCorrect !== null) return;
    if (!selectedWord) return; // student didn't tap — edge case handled in render
    const correct = selectedWord === room.revealedAnswer;
    recordResult(
      correct,
      correct
        ? `Correct! ${room.revealedExplanation || "Well spotted!"}`
        : `The odd one out was "${room.revealedAnswer}". ${room.revealedExplanation || "Keep it up!"}`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.answerRevealed]);

  // ════════════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════════════

  const teamColor = myTeamInfo?.color || "#00c8f0";
  const gameInfo  = GAME_LABELS[room?.gameMode] || { emoji: "🎮", label: "Game", badgeColor: "#00c8f0", badgeBg: "rgba(0,200,240,0.12)" };

  // ── Team strip + game header (shared top chrome) ─
  const renderGameChrome = () => {
    const joinUrl = typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${code}`
      : "";
    const connectedStudents: any[] = room?.students || [];

    return (
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {timerDisplay && (
              <div className={styles.gameTimer}>{timerDisplay}</div>
            )}
            <button
              onClick={() => setShowHostPanel(true)}
              style={{
                padding: "5px 10px", borderRadius: 8,
                background: "rgba(0,200,240,0.1)",
                border: "1px solid rgba(0,200,240,0.3)",
                color: "#00c8f0", fontSize: 10,
                fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer",
              }}
            >
              👤 LIVE
            </button>
          </div>
        </div>

        {/* Host panel overlay */}
        {showHostPanel && (
          <div
            onClick={() => setShowHostPanel(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(7,9,15,0.92)",
              zIndex: 999, display: "flex", flexDirection: "column",
              alignItems: "center", padding: "40px 20px 20px", overflowY: "auto",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#0e1420", border: "1px solid #1c2a40",
                borderRadius: 16, padding: 24, width: "100%", maxWidth: 360,
              }}
            >
              <div style={{
                fontSize: 11, color: "#4a637d", letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                marginBottom: 16, textAlign: "center",
              }}>
                Live Session — Room {code}
              </div>

              {/* QR Code */}
              <div style={{
                background: "#fff", borderRadius: 12, padding: 16,
                display: "flex", justifyContent: "center", marginBottom: 20,
              }}>
                <QRCodeSVG value={joinUrl} size={180} />
              </div>

              {/* Connected students */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, color: "#4a637d", letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                  marginBottom: 10,
                }}>
                  Connected ({connectedStudents.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {connectedStudents.map((s: any, i: number) => (
                    <div key={s.id || i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "#00e87a", flexShrink: 0,
                      }} />
                      <span style={{ color: "#dce8f5", fontSize: 14, fontWeight: 600 }}>
                        {s.name}
                      </span>
                      {s.teamName && (
                        <span style={{ fontSize: 11, color: "#4a637d", marginLeft: "auto" }}>
                          {s.teamName}
                        </span>
                      )}
                    </div>
                  ))}
                  {connectedStudents.length === 0 && (
                    <div style={{ color: "#4a637d", fontSize: 13, textAlign: "center", padding: 12 }}>
                      No students connected yet
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowHostPanel(false)}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#dce8f5", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

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
  const isPassive = room.gameMode === "hotseat" || room.gameMode === "story" || room.gameMode === "chainreaction";

  // Show feedback after submit
  if (showFeedback) {
    return renderFeedback();
  }

  // ── CHAIN REACTION: Phone UI ────────────────────
  if (room.gameMode === "chainreaction") {
    const chainState = room.chainState;
    const isMyTurn = chainState?.currentTeamId === myTeamInfo?.id;
    const isComplete = chainState?.chainComplete;

    if (!chainState) {
      return (
        <div className={styles.screen}>
          {renderGameChrome()}
          <div className={styles.loadingState}>
            <div className={styles.loadingEmoji}>🔗</div>
            <div className={styles.loadingTitle}>Chain Reaction</div>
            <div className={styles.spinner} />
            <div className={styles.loadingMuted}>Waiting for the teacher to start...</div>
          </div>
        </div>
      );
    }

    const crWords: any[] = chainState.words || [];
    const currentIdx = chainState.currentWordIdx ?? 0;
    const activeWord = crWords[currentIdx];
    const prevWord = currentIdx > 0 ? crWords[currentIdx - 1] : null;
    const nextWord = currentIdx < crWords.length - 1 ? crWords[currentIdx + 1] : null;
    const currentTeam = room.teams?.find((t: any) => t.id === chainState.currentTeamId);
    const currentTeamColor = currentTeam?.color || "#00c8f0";

    // Blank positions = indices in active word that are not yet revealed/given
    const blankPositions: number[] = activeWord
      ? activeWord.word.split("").reduce((acc: number[], _: string, i: number) => {
          if (!activeWord.revealed?.[i]) acc.push(i);
          return acc;
        }, [])
      : [];

    // Reconstruct full answer: locked letters + typed chars in blank slots
    const buildFullAnswer = () => {
      if (!activeWord) return "";
      return activeWord.word.split("").map((ch: string, i: number) => {
        const bIdx = blankPositions.indexOf(i);
        return activeWord.revealed?.[i] ? ch : (bIdx >= 0 && bIdx < phoneInput.length ? phoneInput[bIdx] : "");
      }).join("");
    };

    const handleChainSubmit = async () => {
      const answer = buildFullAnswer();
      if (answer.length !== (activeWord?.word?.length || 0)) return;
      if (!myTeamInfo) return;
      await sendAction("submit_chain_answer", {
        answer: answer.toUpperCase(),
        teamId: myTeamInfo.id,
      });
      setPhoneInput("");
    };

    const renderCrTiles = (wordState: any, mini: boolean, showInput = false) => {
      if (!wordState) return null;
      const size = mini ? 28 : 44;
      const fontSize = mini ? 13 : 20;
      return (
        <div style={{ display: "flex", gap: mini ? 4 : 6, flexWrap: "wrap", justifyContent: "center" }}>
          {wordState.word.split("").map((ch: string, i: number) => {
            const isLocked = wordState.revealed?.[i] || wordState.solved || wordState.isGiven;
            const bIdx = blankPositions.indexOf(i);
            const typedChar = showInput && bIdx >= 0 && bIdx < phoneInput.length ? phoneInput[bIdx] : "";
            const isCursor = showInput && bIdx === phoneInput.length && bIdx >= 0;
            return (
              <div
                key={i}
                style={{
                  width: size, height: size, borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize, fontWeight: 700,
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                  background: isLocked
                    ? "rgba(0,200,240,0.18)"
                    : typedChar
                    ? "rgba(220,232,245,0.12)"
                    : "rgba(255,255,255,0.05)",
                  border: isLocked
                    ? `1.5px solid #00c8f0`
                    : isCursor
                    ? `1.5px solid rgba(0,200,240,0.6)`
                    : `1.5px solid rgba(255,255,255,0.1)`,
                  color: isLocked ? "#00c8f0" : typedChar ? "#dce8f5" : "transparent",
                }}
              >
                {isLocked ? ch : typedChar}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.gameBody}>

          {/* Turn banner */}
          <div style={{
            padding: "10px 16px", borderRadius: 10,
            background: `${currentTeamColor}20`,
            border: `1.5px solid ${currentTeamColor}`,
            textAlign: "center", marginBottom: 16,
          }}>
            <div style={{
              fontSize: 11, color: currentTeamColor,
              fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2,
            }}>
              {isMyTurn ? "YOUR TURN" : "NOW PLAYING"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#dce8f5" }}>
              {isMyTurn ? "Type your answer below!" : (currentTeam?.name || "Team")}
            </div>
          </div>

          {/* Chain progress */}
          <div style={{
            fontSize: 11, color: "#4a637d", textAlign: "center", marginBottom: 16,
            fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", letterSpacing: "0.08em",
          }}>
            CHAIN {(chainState.currentChainIdx ?? 0) + 1} OF {chainState.totalChains ?? "?"}
          </div>

          {/* Word board: prev → active → next */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", marginBottom: 24 }}>
            {prevWord && <div style={{ opacity: 0.5 }}>{renderCrTiles(prevWord, true)}</div>}

            {activeWord && (
              <div
                onClick={() => phoneInputRef.current?.focus()}
                style={{
                  padding: "16px 12px", borderRadius: 12,
                  background: "rgba(0,200,240,0.06)",
                  border: "1.5px solid rgba(0,200,240,0.25)",
                  width: "100%", display: "flex", justifyContent: "center",
                  cursor: isMyTurn ? "text" : "default",
                }}
              >
                {renderCrTiles(activeWord, false, isMyTurn && !isComplete)}
              </div>
            )}

            {nextWord && (
              <div style={{ opacity: 0.25 }}>
                {renderCrTiles(
                  { ...nextWord, revealed: nextWord.word.split("").map(() => false), solved: false, isGiven: false },
                  true
                )}
              </div>
            )}
          </div>

          {/* Hidden input + GO button for active team */}
          {isMyTurn && !isComplete && (
            <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
              {/* Hidden input captures physical + virtual keyboard */}
              <input
                ref={phoneInputRef}
                type="text"
                inputMode="text"
                value={phoneInput}
                onChange={(e) => {
                  const raw = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                  setPhoneInput(raw.slice(0, blankPositions.length));
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleChainSubmit(); }}
                style={{
                  position: "fixed", top: -100, left: -100, opacity: 0, width: 1, height: 1,
                  padding: 0, border: "none",
                }}
              />
              <div style={{
                flex: 1, padding: "12px 16px", borderRadius: 10,
                background: "rgba(0,200,240,0.05)",
                border: "1px solid rgba(0,200,240,0.2)",
                color: "#4a637d", fontSize: 12,
                fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                textAlign: "center",
              }}>
                {phoneInput.length === 0
                  ? "Tap tiles above, then type →"
                  : `${phoneInput.length} / ${blankPositions.length} letters`}
              </div>
              <button
                onClick={handleChainSubmit}
                disabled={phoneInput.length !== blankPositions.length}
                style={{
                  padding: "14px 20px", borderRadius: 10,
                  background: phoneInput.length === blankPositions.length ? "#00c8f0" : "rgba(0,200,240,0.15)",
                  border: "none",
                  color: phoneInput.length === blankPositions.length ? "#07090f" : "#4a637d",
                  fontSize: 16, fontWeight: 800,
                  cursor: phoneInput.length === blankPositions.length ? "pointer" : "default",
                  transition: "all 0.2s",
                }}
              >
                GO
              </button>
            </div>
          )}

          {/* Last guess (visible to all teams) */}
          {chainState.lastGuess && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: chainState.lastGuess.correct
                ? "rgba(0,232,122,0.08)" : "rgba(255,68,68,0.08)",
              border: `1px solid ${chainState.lastGuess.correct ? "#00e87a" : "#ff4444"}40`,
              display: "flex", alignItems: "center", gap: 10, fontSize: 13,
            }}>
              <span style={{ fontSize: 16 }}>
                {chainState.lastGuess.correct ? "✓" : "✗"}
              </span>
              <span style={{ color: "#4a637d" }}>{chainState.lastGuess.teamName}:</span>
              <span style={{
                fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                fontWeight: 700, color: "#dce8f5", letterSpacing: "0.08em",
              }}>
                {chainState.lastGuess.answer}
              </span>
            </div>
          )}

          {/* Watching message */}
          {!isMyTurn && !isComplete && (
            <div style={{
              padding: "16px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              textAlign: "center", color: "#4a637d", fontSize: 14,
            }}>
              Watch the projector — you&apos;ll play next!
            </div>
          )}

          {/* Chain complete */}
          {isComplete && (
            <div style={{
              padding: "20px", borderRadius: 12,
              background: "rgba(0,232,122,0.08)",
              border: "1.5px solid #00e87a", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔗✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#00e87a" }}>Chain Complete!</div>
              <div style={{ fontSize: 13, color: "#4a637d", marginTop: 4 }}>Next chain coming up...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PICTURE REVEAL: all phone states handled here ────────────────
  if (room.gameMode === "reveal") {
    // Buzz button for active tile question (highest priority)
    if (room.currentQuestion) {
      return (
        <div className={styles.screen}>
          {renderGameChrome()}
          <div className={styles.buzzBody}>
            {!hasBuzzed ? (
              <>
                <div className={styles.buzzLabel}>Know the answer? Buzz in!</div>
                <button className={styles.buzzBtn} onClick={handleBuzz}>BUZZ</button>
                <div className={styles.buzzTeamScore}>
                  {myTeamInfo?.name} · {(myTeamInfo?.score || 0).toLocaleString()} pts
                </div>
              </>
            ) : (
              <div className={styles.buzzedIn}>
                <div className={styles.buzzedInLabel}>🔔 BUZZED IN!</div>
                <div style={{ fontSize: 14, color: "#4a637d", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
                  Waiting for teacher...
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Win/lose screen when someone cracks the image
    if (room.openGuessWon) {
      const isWinner = room.openGuessWon.teamId === myTeamInfo?.id;
      return (
        <div className={styles.screen}>
          {renderGameChrome()}
          <div className={styles.buzzBody}>
            {isWinner ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                <div style={{
                  fontSize: 22, fontWeight: 900, color: "#00e87a",
                  fontFamily: "'Nunito',sans-serif", textAlign: "center",
                }}>
                  Your team got it!
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 900, color: "#fff",
                  fontFamily: "'Nunito',sans-serif", textAlign: "center", marginTop: 4,
                }}>
                  {room.openGuessWon.guess}
                </div>
                <div style={{
                  marginTop: 12, padding: "10px 24px", borderRadius: 20,
                  background: "rgba(0,232,122,0.12)", border: "1.5px solid #00e87a",
                  fontSize: 18, fontWeight: 800, color: "#00e87a",
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                }}>
                  +{room.openGuessWon.points} pts
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: "#4a637d",
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                  letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center",
                }}>
                  {room.openGuessWon.teamName} cracked it!
                </div>
                <div style={{
                  fontSize: 24, fontWeight: 900, color: "#dce8f5",
                  fontFamily: "'Nunito',sans-serif", textAlign: "center", marginTop: 8,
                }}>
                  {room.openGuessWon.guess}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    // Default: open guess input
    const tilesRevealed = room.tilesRevealed || 0;
    const remaining = tilesRevealed - guessesUsed;
    const canGuess = remaining > 0;

    const handleOpenGuessSubmit = async () => {
      if (!openGuessInput.trim() || !canGuess) return;
      const guess = openGuessInput.trim();
      setOpenGuessInput("");
      setGuessesUsed(prev => prev + 1);
      const result = await sendAction("submit_open_guess", {
        guess,
        teamId: myTeamInfo?.id || studentId,
        teamName: myTeamInfo?.name || studentName,
        studentId,
      });
      if (!result?.room?.openGuessWon) {
        setOpenGuessWrong(true);
        setTimeout(() => setOpenGuessWrong(false), 1500);
      }
    };

    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.buzzBody}>
          <div style={{
            fontSize: 22, fontWeight: 900, color: "#ff7d3b",
            fontFamily: "'Nunito',sans-serif", textAlign: "center", marginBottom: 16,
          }}>
            What&apos;s the image?
          </div>

          {tilesRevealed === 0 ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 13, color: "#4a637d",
                fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                letterSpacing: "0.06em", marginBottom: 8,
              }}>
                Guess slots unlock as tiles are revealed
              </div>
              <div style={{
                fontSize: 11, color: "#2e4a5c", lineHeight: 1.5,
                fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
              }}>
                Each correct tile answer = +1 guess slot for ALL teams
              </div>
            </div>
          ) : canGuess ? (
            <>
              <input
                type="text"
                value={openGuessInput}
                onChange={e => setOpenGuessInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleOpenGuessSubmit()}
                placeholder="Type your guess..."
                autoFocus
                style={{
                  background: openGuessWrong ? "rgba(255,68,68,0.12)" : "rgba(255,125,59,0.08)",
                  border: openGuessWrong
                    ? "2px solid rgba(255,68,68,0.6)"
                    : "2px solid rgba(255,125,59,0.4)",
                  borderRadius: 12, padding: "14px 18px",
                  color: "#dce8f5", fontSize: 18, fontWeight: 700,
                  outline: "none", width: "100%", maxWidth: 300,
                  textAlign: "center", boxSizing: "border-box",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              />
              <button
                onClick={handleOpenGuessSubmit}
                disabled={!openGuessInput.trim()}
                style={{
                  marginTop: 8,
                  background: openGuessInput.trim() ? "#ff7d3b" : "rgba(255,125,59,0.2)",
                  color: openGuessInput.trim() ? "#07090f" : "#4a637d",
                  border: "none", borderRadius: 12, padding: "14px 32px",
                  fontSize: 15, fontWeight: 800,
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                  letterSpacing: "0.08em",
                  cursor: openGuessInput.trim() ? "pointer" : "default",
                  transition: "all 0.2s",
                }}
              >
                Submit Guess
              </button>
              {openGuessWrong && (
                <div style={{
                  fontSize: 12, color: "#ff4444",
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                  letterSpacing: "0.06em", textAlign: "center",
                }}>
                  Not quite — {remaining - 1} guess{remaining - 1 !== 1 ? "es" : ""} left
                </div>
              )}
              <div style={{
                fontSize: 11, color: "#4a637d", marginTop: 8,
                fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                letterSpacing: "0.06em",
              }}>
                {remaining} guess{remaining !== 1 ? "es" : ""} remaining
              </div>
            </>
          ) : (
            <div style={{
              fontSize: 13, color: "#4a637d", textAlign: "center",
              fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
              letterSpacing: "0.06em",
            }}>
              No guesses left this round
            </div>
          )}
        </div>
      </div>
    );
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
    // Room-level mode is authoritative (set by teacher on launch/next);
    // fall back to question-level, then default to Easy
    const fixMode: "Easy" | "Hard" =
      (room.fixitMode as "Easy" | "Hard") ||
      (q.fixit_mode  as "Easy" | "Hard") ||
      "Easy";

    const myAnswer = selectedWord || (hasSubmitted ? textInput : "");
    const answered = !!myAnswer;
    const revealed = !!room.answerRevealed;

    // Split sentence for wrong-word highlight
    const wrongWordRegex = q.wrongWord
      ? new RegExp(`(\\b${q.wrongWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i")
      : null;
    const sentenceParts: string[] = wrongWordRegex && q.sentence
      ? q.sentence.split(wrongWordRegex)
      : [q.sentence || ""];

    // Immediate feedback helpers
    const fixitFeedback = (word: string) => {
      const correct = word.trim().toLowerCase() === (q.correctWord || "").toLowerCase();
      const concept = q.errorType ? ` This is a ${q.errorType} error.` : "";
      recordResult(
        correct,
        correct
          ? `Correct! "${q.correctWord}" is right.${concept}`
          : `Not quite — the correct word is "${q.correctWord}". ${q.hint || "Keep it up!"}`
      );
    };

    const handleEasyTap = async (word: string) => {
      if (answered || teammateBlocked) return;
      const result = await sendAction("student_answer", { studentId, answer: word });
      if (result?.error === "teammate_answered") {
        setTeammateBlocked(result.answeredBy);
        return;
      }
      setSelectedWord(word);
      fixitFeedback(word);
    };

    const handleHardLockIn = async () => {
      if (!textInput.trim() || hasSubmitted || teammateBlocked) return;
      const result = await sendAction("student_answer", { studentId, answer: textInput.trim() });
      if (result?.error === "teammate_answered") {
        setTeammateBlocked(result.answeredBy);
        return;
      }
      setHasSubmitted(true);
      fixitFeedback(textInput.trim());
    };

    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.fixitBody}>

          {/* Prompt label */}
          <div className={styles.fixitPromptLabel}>Find &amp; fix the error</div>

          {/* Sentence card — big, centered, wrong word highlighted */}
          <div className={styles.fixitSentenceCard}>
            {sentenceParts.map((part, i) =>
              wrongWordRegex && wrongWordRegex.test(part)
                ? <span key={i} className={styles.fixitWrongWord}>{part}</span>
                : <span key={i}>{part}</span>
            )}
          </div>

          {/* Error type pill */}
          {q.errorType && (
            <div className={styles.fixitTypePill}>
              {q.errorType}
            </div>
          )}

          {/* Teammate blocked */}
          {renderTeammateBlock()}

          {/* ── EASY: 4 large tap targets ── */}
          {!teammateBlocked && fixMode === "Easy" && q.options && !answered && !revealed && (
            <div className={styles.fixitOptionsGrid}>
              {(q.options as string[]).map((word: string, i: number) => (
                <button
                  key={word}
                  className={styles.fixitOptionBtn}
                  onClick={() => handleEasyTap(word)}
                >
                  <span className={styles.fixitOptionLetter}>
                    {["A","B","C","D"][i]}
                  </span>
                  <span className={styles.fixitOptionWord}>{word}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── HARD: single-word input ── */}
          {!teammateBlocked && fixMode === "Hard" && !answered && !revealed && (
            <div className={styles.fixitHardWrap}>
              {q.hint && (
                <div className={styles.fixitHint}>
                  <span>💡</span>
                  <span>{q.hint}</span>
                </div>
              )}
              <input
                className={styles.fixitSingleInput}
                type="text"
                placeholder="Type the correct word..."
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && textInput.trim() && handleHardLockIn()}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
              <button
                className={styles.fixitLockBtn}
                onClick={handleHardLockIn}
                disabled={!textInput.trim()}
              >
                Lock In ✓
              </button>
            </div>
          )}

          {/* Time's up — didn't answer before reveal */}
          {!answered && revealed && !teammateBlocked && (
            <div className={styles.fixitTimesUp}>
              ⏱ Time's up — watch the projector!
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── BUZZER GAMES: Jeopardy, Rapid Fire (buzz) ──
  if (room.gameMode === "jeopardy" || room.gameMode === "rapidfire") {
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

  // ── ODD ONE OUT ─────────────────────────────────
  if (room.gameMode === "oddoneout" && room.currentQuestion) {
    const q = room.currentQuestion;
    const isRevealed = !!room.answerRevealed;
    const anyPicked  = !!selectedWord;

    // Sub-state 2: tapped but not yet revealed → locked-in screen
    if (anyPicked && !isRevealed && !showFeedback) {
      return (
        <div className={styles.screen}>
          {renderGameChrome()}
          <div className={styles.gameBody}>
            <div className={styles.lockedScreen}>
              <div className={styles.lockedIcon}>🔒</div>
              <div className={styles.lockedTitle}>Locked In!</div>
              <div className={styles.lockedWord}>{selectedWord}</div>
              <div className={styles.lockedWaiting}>
                <div className={styles.waitDots}>
                  <div className={styles.waitDot} />
                  <div className={styles.waitDot} />
                  <div className={styles.waitDot} />
                </div>
                <div className={styles.lockedWaitingText}>Waiting for class...</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Edge case: teacher revealed but student never tapped → show grid with answer highlighted
    if (isRevealed && !anyPicked && !showFeedback) {
      return (
        <div className={styles.screen}>
          {renderGameChrome()}
          <div className={styles.gameBody}>
            <div className={styles.fixitPromptLabel}>Which word doesn't belong?</div>
            <div className={styles.ooGrid}>
              {(q.words as string[]).map((word: string) => {
                const isAnswer = word === room.revealedAnswer;
                return (
                  <div
                    key={word}
                    className={`${styles.ooBtn} ${isAnswer ? styles.ooBtnRevealed : styles.ooBtnDisabled}`}
                  >
                    {word}
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
              The odd one out was{" "}
              <strong style={{ color: "#00e87a" }}>{room.revealedAnswer}</strong>
            </div>
          </div>
        </div>
      );
    }

    // Sub-state 1: word grid (default — nothing tapped yet)
    return (
      <div className={styles.screen}>
        {renderGameChrome()}
        <div className={styles.gameBody}>
          <div className={styles.fixitPromptLabel}>Which word doesn't belong?</div>
          {renderTeammateBlock()}
          {!teammateBlocked && (
            <div className={styles.ooGrid}>
              {(q.words as string[]).map((word: string) => (
                <button
                  key={word}
                  className={styles.ooBtn}
                  onClick={async () => {
                    if (selectedWord || teammateBlocked) return;
                    const result = await sendAction("student_answer", { studentId, answer: word });
                    if (result?.error === "teammate_answered") {
                      setTeammateBlocked(result.answeredBy);
                      return;
                    }
                    setSelectedWord(word);
                  }}
                  disabled={!!selectedWord || !!teammateBlocked}
                >
                  {word}
                </button>
              ))}
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
