"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./reveal.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { ImageOff, Loader, Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import ScoreboardOverlay from "../components/ScoreboardOverlay";

const TEAM_COLORS = [
  "#00e87a", "#00c8f0", "#ffc843",
  "#ff4d8f", "#b06eff", "#ff7d3b", "#e2e8f0",
];

const QUESTION_TIME = 30;

function buildImageUrl(answer: string, prompt: string) {
  const seed = Math.floor(Math.random() * 1000000);
  const sanitizedPrompt = prompt.replace(/['"()]/g, "");
  const combined = `${answer}, ${sanitizedPrompt}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(combined)}?width=768&height=768&nologo=true&seed=${seed}`;
}

export default function PictureRevealMode() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const {
    getActiveApiKey, mistralModel, llmProvider,
    setActiveAwardAmount, updateTeamScore,
    currentTeams, activeRoomCode,
  } = useClassroomStore();

  // ── Setup / generate ──────────────────────────────
  const [topic, setTopic] = useState("");
  const [totalRounds, setTotalRounds] = useState(3);
  const [level, setLevel] = useState("Mixed Level");
  const [isGenerating, setIsGenerating] = useState(false);
  const [usedAnswers, setUsedAnswers] = useState<string[]>([]);
  const [gameData, setGameData] = useState<{
    imagePrompt: string;
    imageAnswer: string;
    questions: { q: string; a: string; options?: Record<string, string>; correctLetter?: string }[];
  } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  // ── Board state ───────────────────────────────────
  const [revealedTiles, setRevealedTiles] = useState<boolean[]>(Array(16).fill(false));
  const [boardRevealed, setBoardRevealed] = useState(false);
  const [pressingTile, setPressingTile] = useState<number | null>(null);

  // ── Question modal ────────────────────────────────
  const [activeQuestion, setActiveQuestion] = useState<{
    q: string; a: string; index: number;
    options?: Record<string, string>; correctLetter?: string;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // ── Turn / Round ──────────────────────────────────
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);

  // ── Open guess win ────────────────────────────────
  const [openGuessWon, setOpenGuessWon] = useState<{
    teamId: string; teamName: string; guess: string; tilesRevealed: number; points: number;
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

  // Poll room during active game (buzz panel + openGuessWon detection)
  const shouldPoll = gameData !== null && !reviewMode && !isGenerating;
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

  // Detect openGuessWon from polling — award points + reveal board
  useEffect(() => {
    if (roomData?.openGuessWon && !openGuessWon) {
      const won = roomData.openGuessWon;
      setOpenGuessWon(won);
      updateTeamScore(won.teamId, won.points);
      setRevealedTiles(Array(16).fill(true));
      setBoardRevealed(true);
    }
  }, [roomData?.openGuessWon]);

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

  const generatePuzzle = async (t: string, exclude: string[] = []) => {
    setIsGenerating(true);
    setImageUrl("");
    setImageLoading(false);
    setImageError(false);
    setRevealedTiles(Array(16).fill(false));
    setBoardRevealed(false);
    setRoundEndAnswer(null);
    setOpenGuessWon(null);
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
          level,
          usedAnswers: exclude,
        }),
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        // Enrich questions with shuffled A/B/C/D options
        const letters = ["A", "B", "C", "D"];
        const enriched = data.questions.map((q: any) => {
          if (!q.wrongOptions?.length) return q;
          const all = [q.a, ...q.wrongOptions].sort(() => Math.random() - 0.5);
          const options: Record<string, string> = {};
          all.forEach((opt: string, i: number) => { options[letters[i]] = opt; });
          const correctLetter = Object.entries(options).find(([, v]) => v === q.a)?.[0] || "A";
          return { q: q.q, a: q.a, options, correctLetter };
        });
        setGameData({ ...data, questions: enriched });
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
      roundEndAnswer !== null || openGuessWon !== null
    ) return;
    setPressingTile(index);
    setTimeout(() => {
      setPressingTile(null);
      setShowAnswer(false);
      setActiveAwardAmount(100);
      const q = gameData.questions[index];
      setActiveQuestion({ q: q.q, a: q.a, index, options: q.options, correctLetter: q.correctLetter });
      // Signal phones: new question active, reset buzz state
      sendRoomAction("set_question", { text: gameData.questions[index].q, tileIndex: index });
      sendRoomAction("clear_buzzes", {});
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
    sendRoomAction("set_question", {});  // clear question on phones → lobby
    sendRoomAction("set_tiles_revealed", { count: newTiles.filter(Boolean).length });
    advanceTurn();
  };

  const handleWrongTile = () => {
    setActiveQuestion(null);
    setActiveAwardAmount(0);
    sendRoomAction("set_question", {});  // clear question on phones → lobby
    advanceTurn();
  };

  // ── Full reveal (header button) ───────────────────

  const handleFullReveal = () => {
    setRevealedTiles(Array(16).fill(true));
    setBoardRevealed(true);
    setRoundEndAnswer(gameData?.imageAnswer || "");
  };

  // ── Round / Game management ───────────────────────

  const startNextRound = async () => {
    if (currentRound >= totalRounds) {
      resetGame();
      return;
    }
    const newUsed = [...usedAnswers, ...(gameData?.imageAnswer ? [gameData.imageAnswer] : [])];
    setUsedAnswers(newUsed);
    setCurrentRound(prev => prev + 1);
    setOpenGuessWon(null);
    sendRoomAction("clear_open_guesses", {});
    await generatePuzzle(topic, newUsed);
  };

  const resetGame = () => {
    setGameData(null);
    setRevealedTiles(Array(16).fill(false));
    setBoardRevealed(false);
    setActiveQuestion(null);
    setOpenGuessWon(null);
    setRoundEndAnswer(null);
    setCurrentRound(1);
    setCurrentTeamIdx(0);
    setActiveAwardAmount(0);
    setUsedAnswers([]);
    sendRoomAction("clear_open_guesses", {});
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
              <button
                onClick={() => router.push("/games")}
                style={{
                  background: "transparent", border: "1px solid var(--border2,#243347)",
                  borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                  fontSize: 11, fontWeight: 700, color: "var(--muted,#4a637d)",
                  letterSpacing: "0.06em", flexShrink: 0,
                }}
              >
                ← Back
              </button>
              <div className={styles.setupTitleIcon}>🖼️</div>
              <div>
                <div className={styles.setupTitleText}>Picture Reveal</div>
                <div className={styles.setupTitleSub}>
                  {currentRound > 1
                    ? `Round ${currentRound} of ${totalRounds}`
                    : "Image Tile Reveal"}
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <MultiplayerHost gameMode="reveal" forceShow />
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
                <div style={{ display: "flex", gap: 12 }}>
                  <div className={styles.setupField} style={{ flex: 1 }}>
                    <div className={styles.setupLabel}>Level</div>
                    <select
                      className={styles.setupInput}
                      value={level}
                      onChange={e => setLevel(e.target.value)}
                      style={{ cursor: "pointer" }}
                    >
                      <option value="Low (A1)">Low (A1)</option>
                      <option value="Low-Mid (A1-A2)">Low-Mid (A1-A2)</option>
                      <option value="Mid (A2)">Mid (A2)</option>
                      <option value="Mid-High (A2-B1)">Mid-High (A2-B1)</option>
                      <option value="High (B1)">High (B1)</option>
                      <option value="Mixed Level">Mixed Level</option>
                    </select>
                  </div>
                  <div className={styles.setupField} style={{ flex: 1 }}>
                    <div className={styles.setupLabel}>Rounds</div>
                    <select
                      className={styles.setupInput}
                      value={totalRounds}
                      onChange={e => setTotalRounds(Number(e.target.value))}
                      style={{ cursor: "pointer" }}
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n} Round{n !== 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
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
              REVIEW PUZZLE — ROUND {currentRound} OF {totalRounds}
            </h2>
            <button
              onClick={async () => {
                setReviewMode(false);
                await sendRoomAction("set_reveal_answer", { answer: gameData.imageAnswer });
                await sendRoomAction("set_tiles_revealed", { count: 0 });
              }}
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
            <div className={styles.roundBadge}>Round {currentRound} / {totalRounds}</div>
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

                {/* Open Guess Win Overlay */}
                {openGuessWon && (
                  <div className={styles.roundEndOverlay}>
                    <div className={styles.roundEndCard}>
                      <div className={styles.roundEndLabel}>
                        🎉 {openGuessWon.teamName} cracked it!
                      </div>
                      <div className={styles.roundEndAnswer}>
                        {openGuessWon.guess.toUpperCase()}
                      </div>
                      <div style={{
                        fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                        fontSize: 13, color: "#00e87a", fontWeight: 700, letterSpacing: "0.1em",
                      }}>
                        +{openGuessWon.points} pts
                      </div>
                      <div className={styles.roundEndBtns}>
                        {currentRound < totalRounds ? (
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

                {/* Round End Overlay (manual full reveal) */}
                {roundEndAnswer !== null && (
                  <div className={styles.roundEndOverlay}>
                    <div className={styles.roundEndCard}>
                      <div className={styles.roundEndLabel}>
                        {currentRound >= totalRounds
                          ? "Game Complete!"
                          : `Round ${currentRound} Complete!`}
                      </div>
                      <div className={styles.roundEndAnswer}>
                        {roundEndAnswer.toUpperCase()}
                      </div>
                      <div className={styles.roundEndBtns}>
                        {currentRound < totalRounds ? (
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
            {/* Badge + active team */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div className={styles.qBadge}>
                Tile {activeQuestion.index + 1}
                <span className={styles.qBadgePts}>&nbsp;· 100 pts</span>
              </div>
              {activeTeam && (
                <div style={{
                  fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: activeTeamColor,
                }}>
                  {activeTeam.name}&apos;s Turn
                </div>
              )}
            </div>

            {/* Question */}
            <div className={styles.questionText}>{activeQuestion.q}</div>

            {/* Multiple choice options (shown before reveal) */}
            {activeQuestion.options && (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 10, width: "100%",
              }}>
                {(["A", "B", "C", "D"] as const).map(letter => {
                  const isCorrect = showAnswer && letter === activeQuestion.correctLetter;
                  const isWrong = showAnswer && letter !== activeQuestion.correctLetter;
                  return (
                    <div key={letter} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 10,
                      background: isCorrect
                        ? "rgba(0,232,122,0.12)"
                        : isWrong ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.04)",
                      border: isCorrect
                        ? "1.5px solid #00e87a"
                        : isWrong ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.1)",
                      transition: "all 0.3s",
                    }}>
                      <span style={{
                        fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                        fontSize: 13, fontWeight: 800,
                        color: isCorrect ? "#00e87a" : "rgba(255,255,255,0.35)",
                        minWidth: 18,
                      }}>
                        {letter}
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: isCorrect ? "#00e87a" : isWrong ? "rgba(220,232,245,0.4)" : "#dce8f5",
                        transition: "color 0.3s",
                      }}>
                        {activeQuestion.options![letter]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

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
              {/* Correct button — always visible once answer revealed */}
              {showAnswer && (() => {
                const winner = buzzes.length > 0
                  ? buzzes[0]
                  : activeTeam
                  ? { teamId: activeTeam.id, teamName: activeTeam.name }
                  : null;
                return (
                  <button
                    className={`${styles.awardBtn} ${styles.awardBtnFull}`}
                    style={{ background: "#00e87a", color: "#07090f", fontSize: 14 }}
                    onClick={() => winner ? awardTileCorrect(winner.teamId) : handleWrongTile()}
                  >
                    ✓ Correct{winner ? ` — ${winner.teamName || winner.teamId}` : ""} · +100 pts
                  </button>
                );
              })()}
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
