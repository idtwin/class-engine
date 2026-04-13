"use client";

import { useState, useEffect } from "react";
import styles from "./reveal.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, ImageOff, Loader } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import ScoreboardOverlay from "../components/ScoreboardOverlay";
import GameTimer from "../components/GameTimer";

function buildImageUrl(answer: string, prompt: string) {
  const seed = Math.floor(Math.random() * 1000000);
  // Sanitize the prompt to remove single quotes and other characters that can break some CDNs/Proxies
  const sanitizedPrompt = prompt.replace(/['"()]/g, "");
  const combined = `${answer}, ${sanitizedPrompt}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(combined)}?width=768&height=768&nologo=true&seed=${seed}`;
}

export default function PictureRevealMode() {
  const [mounted, setMounted] = useState(false);
  const { geminiKey, ollamaModel, llmProvider, setActiveAwardAmount } = useClassroomStore();

  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [gameData, setGameData] = useState<{ imagePrompt: string; imageAnswer: string; questions: { q: string; a: string }[] } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  const [revealedTiles, setRevealedTiles] = useState<boolean[]>(Array(16).fill(false));
  const [activeQuestion, setActiveQuestion] = useState<{ q: string; a: string; index: number } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [boardRevealed, setBoardRevealed] = useState(false);

  // Image state
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [debouncedAnswer, setDebouncedAnswer] = useState("");

  useEffect(() => setMounted(true), []);

  // Debounce the answer for the review preview
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gameData?.imageAnswer) setDebouncedAnswer(gameData.imageAnswer);
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameData?.imageAnswer]);

  // Build the image URL whenever the debounced answer or prompt changes
  useEffect(() => {
    if (debouncedAnswer && gameData?.imagePrompt) {
      setImageLoading(true);
      setImageError(false);
      setImageUrl(buildImageUrl(debouncedAnswer, gameData.imagePrompt));
    }
  }, [debouncedAnswer, gameData?.imagePrompt]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (!topic) return alert("Please enter a topic!");

    setIsGenerating(true);
    setGameData(null);
    setImageUrl("");
    setImageLoading(false);
    setImageError(false);
    setRevealedTiles(Array(16).fill(false));
    setBoardRevealed(false);

    try {
      const res = await fetch("/api/generate-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, ollamaModel, provider: llmProvider, llmProvider, topic, level: "Mixed Level" }),
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        setGameData(data);
        // Set immediately so image starts loading right away
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

  const handleTileClick = (index: number) => {
    if (!gameData || revealedTiles[index]) return;
    setActiveAwardAmount(100);
    setActiveQuestion({ ...gameData.questions[index], index });
    setShowAnswer(false);
  };

  const handleClose = (markCorrect: boolean) => {
    if (activeQuestion && markCorrect) {
      const newTiles = [...revealedTiles];
      newTiles[activeQuestion.index] = true;
      setRevealedTiles(newTiles);
    }
    setActiveQuestion(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games" style={{ textDecoration: "none" }}>
            <button className={styles.iconBtn}>
              <ArrowLeft color="#a855f7" size={24} />
            </button>
          </Link>
          <h1 style={{ margin: 0, color: "#a855f7", letterSpacing: "0.1em", fontFamily: "monospace" }}>PICTURE_REVEAL_MATRIX</h1>

          <div className={styles.aiControls}>
            <input
              placeholder="Lexicon Topic (e.g. Landmarks)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={styles.topicInput}
              onKeyDown={(e) => e.key === "Enter" && !isGenerating && handleGenerate()}
            />
            <button onClick={handleGenerate} disabled={isGenerating} className={styles.genBtn}>
              <Sparkles size={18} /> {isGenerating ? "SYNTHESIZING..." : "GENERATE PUZZLE"}
            </button>
            <MultiplayerHost gameMode="reveal" />
          </div>
        </div>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={80} className={styles.spinIcon} />
          <h2 style={{ letterSpacing: "0.1em" }}>INITIALIZING DATA CORE...</h2>
        </div>
      ) : reviewMode && gameData ? (
        <div className={styles.reviewContainer}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              borderBottom: "1px solid rgba(168, 85, 247, 0.2)",
              paddingBottom: "1rem",
            }}
          >
            <h2 style={{ color: "#a855f7", margin: 0, fontFamily: "monospace", letterSpacing: "0.1em" }}>REVIEW MATRIX DATA</h2>
            <button onClick={() => setReviewMode(false)} className={styles.genBtn}>
              APPROVE BOARD & HIDE IMAGE
            </button>
          </div>
          <div className={styles.reviewScroll}>
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "rgba(168, 85, 247, 0.05)",
                borderRadius: "12px",
                border: "1px solid rgba(168, 85, 247, 0.1)",
              }}
            >
              <h3 style={{ color: "#a855f7", marginBottom: "0.5rem", fontFamily: "monospace" }}>FINAL IMAGE ANSWER:</h3>
              <input
                value={gameData.imageAnswer || ""}
                onChange={(e) => {
                  if (!gameData) return;
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
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ color: "#a855f7", marginBottom: "0.5rem", fontFamily: "monospace", fontSize: '0.8rem' }}>// OPTIONAL: MANUAL_IMAGE_URL_OVERRIDE (If AI is blocked)</h3>
                <input
                  placeholder="Paste a direct URL from Google Images or elsewhere..."
                  value={imageUrl.startsWith('https://image.pollinations.ai') ? "" : imageUrl}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      setImageUrl(val);
                      setImageError(false);
                      setImageLoading(true);
                    }
                  }}
                  className={styles.reviewInput}
                  style={{ fontSize: "0.9rem", borderStyle: 'solid' }}
                />
              </div>
            </div>

            {/* Review image preview with loading/error states */}
            <div className={styles.reviewImageWrapper}>
              {imageLoading && !imageError && (
                <div className={styles.imageLoadingOverlay}>
                  <Loader size={40} className={styles.spinIcon} />
                  <p style={{ fontFamily: "monospace", color: "#a855f7", marginTop: "0.5rem" }}>LOADING IMAGE...</p>
                </div>
              )}
              {imageError && (
                <div className={styles.imageErrorState}>
                  <ImageOff size={40} />
                  <p style={{ fontFamily: "monospace", marginTop: "0.5rem" }}>IMAGE LOAD FAILED</p>
                  <button
                    className={styles.genBtn}
                    style={{ marginTop: "1rem" }}
                    onClick={() => {
                      setImageError(false);
                      setImageLoading(true);
                      setImageUrl(buildImageUrl(gameData.imageAnswer, gameData.imagePrompt) + "&retry=" + Date.now());
                    }}
                  >
                    RETRY
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
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
              )}
            </div>

            {gameData.questions.map((q, qIndex) => (
              <div key={qIndex} className={styles.reviewQuestion}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontWeight: 800, color: "#a855f7", width: "40px", fontFamily: "monospace" }}>#{qIndex + 1}</span>
                  <input
                    value={q.q}
                    onChange={(e) => {
                      const newData = { ...gameData };
                      newData.questions[qIndex].q = e.target.value;
                      setGameData(newData);
                    }}
                    className={styles.reviewInput}
                    placeholder="Question..."
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontWeight: 800, color: "#a855f7", width: "40px", fontFamily: "monospace" }}>Ans</span>
                  <input
                    value={q.a}
                    onChange={(e) => {
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
      ) : !gameData ? (
        <div className={styles.emptyState}>
          <p>SYSTEM IDLE // AWAITING TOPIC INPUT_</p>
        </div>
      ) : (
        <div className={styles.gameArea}>
          <GameTimer timerActive={false} variant="bar" onTimeUp={() => { }} />
          <div className={styles.revealBoard}>
            {/* Background image behind tiles */}
            {imageUrl ? (
              <>
                {imageLoading && (
                  <div className={styles.imagePlaceholder}>
                    <Loader size={48} className={styles.spinIcon} />
                    <p style={{ fontFamily: "monospace", color: "#a855f7", marginTop: "0.5rem", fontSize: "0.9rem" }}>LOADING IMAGE...</p>
                  </div>
                )}
                {imageError && (
                  <div className={styles.imagePlaceholder}>
                    <ImageOff size={48} color="#a855f7" />
                    <p style={{ fontFamily: "monospace", color: "#a855f7", marginTop: "0.5rem", fontSize: "0.9rem" }}>IMAGE UNAVAILABLE</p>
                  </div>
                )}
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt="Hidden Image"
                  className={styles.hiddenImage}
                  style={{ opacity: (imageLoading || imageError || !imageUrl) ? 0 : 1, transition: "opacity 0.8s ease" }}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    console.error("Image reveal failed to load:", imageUrl);
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
              </>
            ) : (
              <div className={styles.imagePlaceholder}>
                <ImageOff size={48} color="#a855f7" />
                <p style={{ fontFamily: "monospace", color: "#a855f7", marginTop: "0.5rem", fontSize: "0.9rem" }}>NO IMAGE</p>
              </div>
            )}

            <div className={styles.gridOverlay}>
              {Array.from({ length: 16 }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.tile} ${revealedTiles[i] ? styles.tileHidden : ""}`}
                  onClick={() => handleTileClick(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {boardRevealed && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "rgba(0,0,0,0.85)",
                  padding: "2rem 4rem",
                  borderRadius: "24px",
                  border: "4px solid var(--accent)",
                  boxShadow: "0 0 40px rgba(0,0,0,0.8)",
                  zIndex: 20,
                  textAlign: "center",
                  backdropFilter: "blur(8px)",
                }}
              >
                <h2 style={{ fontSize: "3rem", color: "#fff", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                  {gameData?.imageAnswer ? gameData.imageAnswer.toUpperCase() : topic.toUpperCase()}
                </h2>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "center", width: "100%", maxWidth: "900px", margin: "0.5rem auto 0" }}>
            <button
              className={styles.genBtn}
              onClick={() => {
                setRevealedTiles(Array(16).fill(true));
                setBoardRevealed(true);
              }}
              style={{ width: "100%", padding: "1rem", fontSize: "1.2rem", display: "flex", justifyContent: "center", gap: "0.5rem", borderRadius: "16px" }}
            >
              <Sparkles /> INITIATE FULL REVEAL
            </button>
          </div>

          <ScoreboardOverlay />
        </div>
      )}

      {activeQuestion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 style={{ margin: 0, color: "#a855f7", fontFamily: "monospace" }}>PUZZLE TILE {activeQuestion.index + 1}</h2>

            {showAnswer ? (
              <div className={styles.answerBox}>
                <h3 style={{ color: "#a855f7", marginBottom: "0.5rem", fontFamily: "monospace" }}>DECRYPTED_ANSWER:</h3>
                <p className={styles.questionText} style={{ color: "#a855f7" }}>
                  {activeQuestion.a || "No answer provided."}
                </p>
              </div>
            ) : (
              <p className={styles.questionText}>{activeQuestion.q}</p>
            )}

            <div className={styles.modalActions}>
              {!showAnswer && <button onClick={() => setShowAnswer(true)}>DECRYPT ANSWER</button>}
              <button onClick={() => handleClose(true)}>AWARD & CLEAR TILE</button>
              <button className={styles.secondaryBtn} onClick={() => handleClose(false)}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
