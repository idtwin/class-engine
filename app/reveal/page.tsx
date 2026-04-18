"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./reveal.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { ImageOff, Loader, Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import ScoreboardOverlay from "../components/ScoreboardOverlay";

const TEAM_COLORS = [
  "#00e87a", "#00c8f0", "#ffc843",
  "#ff4d8f", "#b06eff", "#ff7d3b", "#e2e8f0",
];

const TOTAL_ROUNDS = 3;
const QUESTION_TIME = 30;

function buildImageUrl(answer: string, prompt: string) {
  const seed = Math.floor(Math.random() * 1000000);
  const sanitizedPrompt = prompt.replace(/['"()]/g, "");
  const combined = `${answer}, ${sanitizedPrompt}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(combined)}?width=768&height=768&nologo=true&seed=${seed}`;
}

type GuessMode = "offering" | "waiting" | "teacher_only" | null;

export default function PictureRevealMode() {
  const [mounted, setMounted] = useState(false);
  const {
    getActiveApiKey, mistralModel, llmProvider,
    setActiveAwardAmount, updateTeamScore,
    currentTeams, activeRoomCode,
  } = useClassroomStore();

  // ── Setup / generate ──────────────────────────────
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [gameData, setGameData] = useState<{
    imagePrompt: string;
    imageAnswer: string;
    questions: { q: string; a: string }[];
  } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  // ── Board state ───────────────────────────────────
  const [revealedTiles, setRevealedTiles] = useState<boolean[]>(Array(16).fill(false));
  const [boardRevealed, setBoardRevealed] = useState(false);
  const [pressingTile, setPressingTile] = useState<number | null>(null);

  // ── Question modal ────────────────────────────────
  const [activeQuestion, setActiveQuestion] = useState<{
    q: string; a: string; index: number;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // ── Turn / Round ──────────────────────────────────
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);

  // ── Image guess ───────────────────────────────────
  const [imageGuessMode, setImageGuessMode] = useState<GuessMode>(null);
  const [submittedGuess, setSubmittedGuess] = useState<{
    guess: string; name: string; teamId: string;
  } | null>(null);

  // ── Round end ─────────────────────────────────────
  const [roundEndAnswer, setRoundEndAnswer] = useState<string | null>(null);

  // ── Image loading ─────────────────────────────────
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [debouncedAnswer, setDebouncedAnswer] = useState("");

  // ── Room data (buzz panel + submitted guess) ──────
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => setMounted(true), []);

  // Debounce answer for review image preview
  useEffect(() => {
    const t = setTimeout(() => {
      if (gameData?.imageAnswer) setDebouncedAnswer(gameData.imageAnswer);
    }, 1200);
    return () => clearTimeout(t);
  }, [gameData?.imageAnswer]);

  useEffect(() => {
    if (debouncedAnswer && gameData?.imagePrompt) {
      setImageLoading(true);
      setImageError(false);
      setImageUrl(buildImageUrl(debouncedAnswer, gameData.imagePrompt));
    }
  }, [debouncedAnswer, gameData?.imagePrompt]);

  // Poll room when modal open or waiting for guess
  const shouldPoll = activeQuestion !== null || imageGuessMode === "waiting";
  useEffect(() => {
    if (!activeRoomCode || !shouldPoll) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) setRoomData(await res.json());
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode, shouldPoll]);

  // Sync submitted guess from room polling
  useEffect(() => {
    if (imageGuessMode === "waiting" && roomData?.imageGuess) {
      setSubmittedGuess(roomData.imageGuess);
    }
  }, [roomData?.imageGuess, imageGuessMode]);

  // Timer for question modal
  useEffect(() => {
    if (!activeQuestion) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      return;
    }
    setTimeLeft(QUESTION_TIME);
    timerInterval.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerInterval.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [activeQuestion?.index]);

  if (!mounted) return null;

  // ── Helpers ───────────────────────────────────────

  const advanceTurn = () => {
    if (currentTeams.length > 0) {
      setCurrentTeamIdx(prev => (prev + 1) % currentTeams.length);
    }
  };

  const sendRoomAction = async (action: string, payload: object) => {
    if (!activeRoomCode) return;
    try {
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action, payload }),
      });
    } catch { /* silent */ }
  };

  // ── Generate ──────────────────────────────────────

  const generatePuzzle = async (t: string) => {
    setIsGenerating(true);
    setImageUrl("");
    setImageLoading(false);
    setImageError(false);
    setRevealedTiles(Array(16).fill(false));
    setBoardRevealed(false);
    setRoundEndAnswer(null);
    setImageGuessMode(null);
    setSubmittedGuess(null);
    setActiveQuestion(null);

    try {
      const res = await fetch("/api/generate-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: getActiveApiKey(),
          mistralModel,
          provider: llmProvider,
          topic: t,
          level: "Mixed Level",
        }),
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        setGameData(data);
        const url = buildImageUrl(data.imageAnswer, data.imagePrompt);
        setImageUrl(url);
        setImageLoading(true);
        setImageError(false);
        setDebouncedAnswer(data.imageAnswer);
        setReviewMode(true);
      } else {
        alert("Error: " + (data.error || "Unknown Error"));
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    }
    setIsGenerating(false);
  };

  const handleGenerate = () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    setGameData(null);
    generatePuzzle(topic);
  };

  // ── Tile interaction ──────────────────────────────

  const handleTileClick = (index: number) => {
    if (
      !gameData || revealedTiles[index] ||
      pressingTile !== null || activeQuestion !== null ||
      roundEndAnswer !== null || imageGuessMode !== null
    ) return;
    setPressingTile(index);
    setTimeout(() => {
      setPressingTile(null);
      setActiveAwardAmount(100);
      setActiveQuestion({ ...gameData.questions[index], index });
    }, 120);
  };

  // ── Award correct tile ────────────────────────────

  const awardTileCorrect = (teamId: string) => {
    updateTeamScore(teamId, 100);
    const newTiles = [...revealedTiles];
    newTiles[activeQuestion!.index] = true;
    setRevealedTiles(newTiles);
    setActiveQuestion(null);
    setActiveAwardAmount(0);
    // Offer image guess
    setImageGuessMode("offering");
  };

  const handleWrongTile = () => {
    setActiveQuestion(null);
    setActiveAwardAmount(0);
    advanceTurn();
  };

  // ── Image guess ───────────────────────────────────

  const offerImageGuess = async () => {
    const team = currentTeams[currentTeamIdx];
    setSubmittedGuess(null);
    setImageGuessMode("waiting");
    if (team && activeRoomCode) {
      await sendRoomAction("trigger_image_guess", {
        teamId: team.id,
        teamName: team.name,
      });
    }
  };

  const judgeTeacherOnly = () => {
    setImageGuessMode("teacher_only");
  };

  const skipImageGuess = async () => {
    setImageGuessMode(null);
    advanceTurn();
    await sendRoomAction("clear_image_guess", {});
  };

  const judgeGuess = async (correct: boolean) => {
    await sendRoomAction("clear_image_guess", {});
    if (correct) {
      const team = currentTeams[currentTeamIdx];
      if (team) updateTeamScore(team.id, 300);
      setRevealedTiles(Array(16).fill(true));
      setBoardRevealed(true);
      setRoundEndAnswer(gameData?.imageAnswer || "");
      setImageGuessMode(null);
    } else {
      setImageGuessMode(null);
      advanceTurn();
    }
  };

  // ── Full reveal (header button) ───────────────────

  const handleFullReveal = () => {
    setRevealedTiles(Array(16).fill(true));
    setBoardRevealed(true);
    setRoundEndAnswer(gameData?.imageAnswer || "");
    setImageGuessMode(null);
  };

  // ── Round / Game management ───────────────────────

  const startNextRound = async () => {
    if (currentRound >= TOTAL_ROUNDS) {
      // Game over — just reset
      resetGame();
      return;
    }
    setCurrentRound(prev => prev + 1);
    await generatePuzzle(topic);
  };

  const resetGame = () => {
    setGameData(null);
    setRevealedTiles(Array(16).fill(false));
    setBoardRevealed(false);
    setActiveQuestion(null);
    setImageGuessMode(null);
    setSubmittedGuess(null);
    setRoundEndAnswer(null);
    setCurrentRound(1);
    setCurrentTeamIdx(0);
    setActiveAwardAmount(0);
  };

  // ── Derived ───────────────────────────────────────

  const activeTeam = currentTeams.length > 0 ? currentTeams[currentTeamIdx] : null;
  const activeTeamIdx = activeTeam ? currentTeams.indexOf(activeTeam) : -1;
  const activeTeamColor = activeTeamIdx >= 0 ? (TEAM_COLORS[activeTeamIdx] || "#ff7d3b") : "#ff7d3b";
  const buzzes: any[] = roomData?.buzzes || [];

  // ── Render ────────────────────────────────────────
  return (
    <>
      {/* ── Setup / Generating overlay ─── */}
      {(!gameData || isGenerating) && (
        <div className={styles.setupOverlay}>
          <div className={styles.setupModal}>
            <div className={styles.setupTitleRow}>
              <div className={styles.setupTitleIcon}>🖼️</div>
              <div>
                <div className={styles.setupTitleText}>Picture Reveal</div>
                <div className={styles.setupTitleSub}>
                  {currentRound > 1
                    ? `Round ${currentRound} of ${TOTAL_ROUNDS}`
                    : `Image Tile Reveal · ${TOTAL_ROUNDS} Rounds`}
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <MultiplayerHost gameMode="reveal" />
              </div>
            </div>
            {isGenerating ? (
              <div className={styles.generatingState}>
                <div className={styles.spinner} />
                <div className={styles.generatingText}>
                  {currentRound > 1
                    ? `Generating round ${currentRound}...`
                    : "Generating puzzle..."}
                </div>
              </div>
            ) : (
              <>
                <div className={styles.setupField}>
                  <div className={styles.setupLabel}>Topic / Theme</div>
                  <input
                    className={styles.setupInput}
                    placeholder="e.g. Landmarks, Animals, Famous People..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !isGenerating && handleGenerate()}
                    autoFocus
                  />
                </div>
                <button
                  className={styles.btnGenerate}
                  onClick={handleGenerate}
                  disabled={!topic.trim()}
                >
                  <Sparkles size={16} /> Generate Puzzle
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Review mode ─── */}
      {gameData && reviewMode && !isGenerating && (
        <div className={styles.reviewContainer}>
          <div className={styles.reviewHeader}>
            <h2 className={styles.reviewTitle}>
              REVIEW PUZZLE — ROUND {currentRound} OF {TOTAL_ROUNDS}
            </h2>
            <button
              onClick={() => setReviewMode(false)}
              className={styles.btnGenerate}
              style={{ padding: "10px 20px", fontSize: 12 }}
            >
              APPROVE &amp; START GAME
            </button>
          </div>

          <div className={styles.reviewScroll}>
            {/* Image answer + manual URL */}
            <div style={{
              marginBottom: "1.5rem", padding: "1rem",
              background: "rgba(255,125,59,0.05)", borderRadius: "12px",
              border: "1px solid rgba(255,125,59,0.1)",
            }}>
              <h3 style={{
                color: "#ff7d3b", marginBottom: "0.5rem",
                fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                fontSize: 12, letterSpacing: "0.1em", margin: "0 0 0.5rem",
              }}>
                IMAGE ANSWER:
              </h3>
              <input
                value={gameData.imageAnswer || ""}
                onChange={e => {
                  const newAnswer = e.target.value;
                  const newData = { ...gameData };
                  newData.imageAnswer = newAnswer;
                  if (!newData.imagePrompt.includes(newAnswer)) {
                    newData.imagePrompt = `${newAnswer}, ${newData.imagePrompt}`;
                  }
                  setGameData(newData);
                }}
                className={styles.reviewInput}
                style={{ fontSize: "1.2rem", fontWeight: "bold" }}
              />
              <div style={{ marginTop: "1rem" }}>
                <h3 style={{
                  color: "#ff7d3b", marginBottom: "0.5rem",
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                  fontSize: 11, letterSpacing: "0.08em",
                  margin: "0 0 0.5rem",
                }}>
                  MANUAL IMAGE URL (optional override):
                </h3>
                <input
                  placeholder="Paste a direct image URL..."
                  value={imageUrl.startsWith("https://image.pollinations.ai") ? "" : imageUrl}
                  onChange={e => {
                    const val = e.target.value.trim();
                    if (val) {
                      setImageUrl(val);
                      setImageError(false);
                      setImageLoading(true);
                    }
                  }}
                  className={styles.reviewInput}
                  style={{ fontSize: "0.9rem" }}
                />
              </div>
            </div>

            {/* Image preview */}
            <div className={styles.reviewImageWrapper}>
              {imageLoading && !imageError && (
                <div className={styles.imageLoadingOverlay}>
                  <Loader size={40} className={styles.spinIcon} />
                  <p style={{ fontFamily: "monospace", marginTop: "0.5rem", fontSize: 13 }}>
                    Loading image...
                  </p>
                </div>
              )}
              {imageError && (
                <div className={styles.imageErrorState}>
                  <ImageOff size={40} />
                  <p style={{ fontFamily: "monospace", marginTop: "0.5rem" }}>
                    Image failed to load
                  </p>
                  <button
                    className={styles.btnGenerate}
                    style={{ marginTop: "1rem", fontSize: 11, padding: "8px 16px" }}
                    onClick={() => {
                      setImageError(false);
                      setImageLoading(true);
                      setImageUrl(
                        buildImageUrl(gameData.imageAnswer, gameData.imagePrompt) +
                        "&retry=" + Date.now()
                      );
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              {imageUrl && (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt="Preview"
                  className={styles.reviewImagePreview}
                  style={{ display: imageError ? "none" : "block" }}
                  onLoad={() => setImageLoading(false)}
                  onError={() => { setImageLoading(false); setImageError(true); }}
                />
              )}
            </div>

            {/* Questions */}
            {gameData.questions.map((q, qIndex) => (
              <div key={qIndex} className={styles.reviewQuestion}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{
                    fontWeight: 800, color: "#ff7d3b",
                    width: "40px", fontFamily: "monospace",
                  }}>
                    #{qIndex + 1}
                  </span>
                  <input
                    value={q.q}
                    onChange={e => {
                      const newData = { ...gameData };
                      newData.questions[qIndex].q = e.target.value;
                      setGameData(newData);
                    }}
                    className={styles.reviewInput}
                    placeholder="Question..."
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{
                    fontWeight: 800, color: "#ff7d3b",
                    width: "40px", fontFamily: "monospace",
                  }}>
                    Ans
                  </span>
                  <input
                    value={q.a}
                    onChange={e => {
                      const newData = { ...gameData };
                      newData.questions[qIndex].a = e.target.value;
                      setGameData(newData);
                    }}
                    className={styles.reviewInput}
                    placeholder="Answer..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Game view ─── */}
      {gameData && !reviewMode && !isGenerating && (
        <div className={styles.page}>
          {/* Header */}
          <div className={styles.gameHeader}>
            <div className={styles.gameTitle}>Picture Reveal</div>
            <div className={styles.headerDivider} />
            <div className={styles.roundBadge}>Round {currentRound} / {TOTAL_ROUNDS}</div>
            {activeTeam && (
              <>
                <div className={styles.headerDivider} />
                <div
                  className={styles.activeTeamBanner}
                  style={{ color: activeTeamColor }}
                >
                  {activeTeam.name}&apos;s Turn
                </div>
              </>
            )}
            <div className={styles.headerSpacer} />
            <div className={styles.headerActions}>
              <button
                className={`${styles.headerBtn} ${styles.headerBtnPrimary}`}
                onClick={handleFullReveal}
                disabled={boardRevealed}
              >
                Full Reveal
              </button>
              <button className={styles.headerBtn} onClick={resetGame}>
                ← New Game
              </button>
              <MultiplayerHost gameMode="reveal" />
            </div>
          </div>

          {/* Board area */}
          <div className={styles.boardArea}>
            <div className={styles.boardWrap}>
              <div className={styles.revealBoard}>

                {/* Hidden image */}
                {imageUrl ? (
                  <>
                    {imageLoading && !imageError && (
                      <div className={styles.imagePlaceholder}>
                        <Loader size={40} className={styles.spinIcon} />
                      </div>
                    )}
                    {imageError && (
                      <div className={styles.imagePlaceholder}>
                        <ImageOff size={36} />
                      </div>
                    )}
                    <img
                      key={imageUrl}
                      src={imageUrl}
                      alt="Hidden Image"
                      className={styles.hiddenImage}
                      style={{
                        opacity: (imageLoading || imageError) ? 0 : 1,
                        transition: "opacity 0.8s ease",
                      }}
                      onLoad={() => setImageLoading(false)}
                      onError={() => { setImageLoading(false); setImageError(true); }}
                    />
                  </>
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <ImageOff size={36} />
                  </div>
                )}

                {/* Tile grid */}
                <div className={styles.gridOverlay}>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <button
                      key={i}
                      className={[
                        styles.tile,
                        revealedTiles[i] ? styles.tileRevealed : "",
                        pressingTile === i ? styles.pressing : "",
                      ].join(" ")}
                      onClick={() => handleTileClick(i)}
                      disabled={revealedTiles[i]}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Image Guess Prompt */}
                {imageGuessMode === "offering" && (
                  <div className={styles.guessPromptOverlay}>
                    <div className={styles.guessPromptCard}>
                      <div className={styles.guessPromptLabel}>
                        Image Guess Opportunity
                      </div>
                      {activeTeam && (
                        <div
                          className={styles.guessPromptTeam}
                          style={{ color: activeTeamColor }}
                        >
                          {activeTeam.name}
                        </div>
                      )}
                      <div className={styles.guessPromptSub}>Worth 300 pts if correct</div>
                      <div className={styles.guessPromptActions}>
                        <button className={styles.btnOfferGuess} onClick={offerImageGuess}>
                          Offer via Phone
                        </button>
                        <button className={styles.btnTeacherOnly} onClick={judgeTeacherOnly}>
                          Judge Verbally
                        </button>
                        <button className={styles.btnSkipGuess} onClick={skipImageGuess}>
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting for phone guess */}
                {imageGuessMode === "waiting" && (
                  <div className={styles.guessPromptOverlay}>
                    <div className={styles.imageGuessWaitCard}>
                      <div className={styles.waitingLabel}>
                        {submittedGuess
                          ? "Guess Received"
                          : activeTeam
                          ? `Waiting for ${activeTeam.name}...`
                          : "Waiting for guess..."}
                      </div>
                      {submittedGuess ? (
                        <div className={styles.submittedGuessText}>
                          &ldquo;{submittedGuess.guess}&rdquo;
                        </div>
                      ) : (
                        <div className={styles.spinner} style={{ width: 24, height: 24 }} />
                      )}
                      <div className={styles.judgeRow}>
                        <button className={styles.btnCorrect} onClick={() => judgeGuess(true)}>
                          Correct — 300 pts
                        </button>
                        <button className={styles.btnWrong} onClick={() => judgeGuess(false)}>
                          Wrong
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teacher-only verbal judge */}
                {imageGuessMode === "teacher_only" && (
                  <div className={styles.guessPromptOverlay}>
                    <div className={styles.imageGuessWaitCard}>
                      <div className={styles.waitingLabel}>Judge Verbally</div>
                      {activeTeam && (
                        <div
                          className={styles.submittedGuessText}
                          style={{ color: activeTeamColor }}
                        >
                          {activeTeam.name} is guessing...
                        </div>
                      )}
                      <div style={{
                        fontSize: 11,
                        color: "var(--muted,#4a637d)",
                        fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                        letterSpacing: "0.06em",
                      }}>
                        Ask the team to say their answer aloud
                      </div>
                      <div className={styles.judgeRow}>
                        <button className={styles.btnCorrect} onClick={() => judgeGuess(true)}>
                          Correct — 300 pts
                        </button>
                        <button className={styles.btnWrong} onClick={() => judgeGuess(false)}>
                          Wrong
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Round End Overlay */}
                {roundEndAnswer !== null && (
                  <div className={styles.roundEndOverlay}>
                    <div className={styles.roundEndCard}>
                      <div className={styles.roundEndLabel}>
                        {currentRound >= TOTAL_ROUNDS
                          ? "Game Complete!"
                          : `Round ${currentRound} Complete!`}
                      </div>
                      <div className={styles.roundEndAnswer}>
                        {roundEndAnswer.toUpperCase()}
                      </div>
                      <div className={styles.roundEndBtns}>
                        {currentRound < TOTAL_ROUNDS ? (
                          <button className={styles.btnNextRound} onClick={startNextRound}>
                            Next Round →
                          </button>
                        ) : (
                          <button
                            className={styles.btnNextRound}
                            style={{ background: "#00e87a" }}
                            onClick={resetGame}
                          >
                            New Game
                          </button>
                        )}
                        <button className={styles.btnEndGame} onClick={resetGame}>
                          End Game
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ScoreboardOverlay />
        </div>
      )}

      {/* ── Question Modal ─── */}
      {activeQuestion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* Badge */}
            <div className={styles.qBadge}>
              Tile {activeQuestion.index + 1}
              <span className={styles.qBadgePts}>&nbsp;· 100 pts</span>
            </div>

            {/* Question */}
            <div className={styles.questionText}>{activeQuestion.q}</div>

            {/* Timer */}
            <div className={styles.timerRow}>
              <div className={`${styles.timerNum} ${timeLeft < 10 ? styles.timerNumLow : ""}`}>
                {timeLeft}
              </div>
              <div className={styles.timerBar}>
                <div
                  className={`${styles.timerFill} ${timeLeft < 10 ? styles.timerFillLow : ""}`}
                  style={{ width: `${(timeLeft / QUESTION_TIME) * 100}%` }}
                />
              </div>
            </div>

            {/* Buzz panel (phone mode) */}
            {buzzes.length > 0 && (
              <div className={styles.buzzPanel}>
                <div className={styles.buzzPanelHeader}>Buzz Order</div>
                {buzzes.map((buzz, i) => {
                  const team = currentTeams.find(t => t.id === buzz.teamId);
                  const tIdx = team ? currentTeams.indexOf(team) : -1;
                  const color = tIdx >= 0 ? (TEAM_COLORS[tIdx] || "#ff7d3b") : "#ff7d3b";
                  const isFirst = i === 0;
                  return (
                    <div
                      key={buzz.studentId}
                      className={`${styles.buzzRow} ${!isFirst ? styles.buzzRowDimmed : ""}`}
                    >
                      <div className={styles.rankCircle}>{i + 1}</div>
                      <div
                        className={styles.buzzTeamName}
                        style={{ color: isFirst ? color : undefined }}
                      >
                        {buzz.teamName}
                      </div>
                      <div className={styles.buzzStudentName}>{buzz.name}</div>
                      {isFirst && (
                        <button
                          className={styles.awardBtn}
                          style={{ background: color }}
                          onClick={() => awardTileCorrect(buzz.teamId)}
                        >
                          +100 pts
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Answer box */}
            {showAnswer && (
              <div className={styles.answerBox}>
                <div className={styles.answerLabel}>Answer</div>
                <div className={styles.answerText}>
                  {activeQuestion.a || "No answer provided."}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className={styles.modalActionRow}>
              {!showAnswer && (
                <button
                  className={styles.btnReveal}
                  onClick={() => setShowAnswer(true)}
                >
                  Reveal Answer
                </button>
              )}
              {/* Award active team when no buzzes (teacher-controlled mode) */}
              {buzzes.length === 0 && activeTeam && (
                <button
                  className={`${styles.awardBtn} ${styles.awardBtnFull}`}
                  style={{ background: activeTeamColor }}
                  onClick={() => awardTileCorrect(activeTeam.id)}
                >
                  Award {activeTeam.name} · +100 pts
                </button>
              )}
              <button className={styles.btnSkip} onClick={handleWrongTile}>
                Wrong / Next Team
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
