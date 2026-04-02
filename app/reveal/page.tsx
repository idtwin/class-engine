"use client";

import { useState, useEffect } from "react";
import styles from "./reveal.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

export default function PictureRevealMode() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, triggerTwist, geminiKey } = useClassroomStore();
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [gameData, setGameData] = useState<{ imagePrompt: string, imageAnswer: string, questions: { q: string, a: string }[] } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  
  const [revealedTiles, setRevealedTiles] = useState<boolean[]>(Array(16).fill(false));
  const [activeQuestion, setActiveQuestion] = useState<{ q: string, a: string, index: number } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [boardRevealed, setBoardRevealed] = useState(false);
  const [debouncedAnswer, setDebouncedAnswer] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gameData?.imageAnswer) setDebouncedAnswer(gameData.imageAnswer);
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameData?.imageAnswer]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (!geminiKey) return alert("Please set your Gemini API key in Dashboard Settings!");
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setGameData(null); 
    setRevealedTiles(Array(16).fill(false));
    setBoardRevealed(false);

    try {
      const res = await fetch("/api/generate-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiKey, topic, level: "Mixed Level" })
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        setGameData(data);
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
          <Link href="/games"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
          <h1>Picture Reveal</h1>
          
          <div className={styles.aiControls}>
            <input 
              placeholder="Topic (e.g. World Landmarks)" 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className={styles.topicInput}
            />
            <button onClick={handleGenerate} disabled={isGenerating} className={styles.genBtn}>
              <Sparkles size={20} /> {isGenerating ? "Generating..." : "Generate Custom Board"}
            </button>
            <MultiplayerHost gameMode="reveal" />
          </div>
        </div>
        
        <button className={styles.twistBtn} onClick={triggerTwist}>
          <Zap size={20} /> Trigger Twist
        </button>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={80} className={styles.spinIcon} />
          <h2>Drawing image and writing puzzle...</h2>
        </div>
      ) : reviewMode && gameData ? (
        <div className={styles.reviewContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: 'var(--accent)', margin: 0 }}>Review Image & Questions</h2>
            <button onClick={() => setReviewMode(false)} className={styles.genBtn} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '8px' }}>
              Approve Board & Hide Image
            </button>
          </div>
          <div className={styles.reviewScroll}>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Final Image Answer:</h3>
              <input 
                value={gameData.imageAnswer || ""} 
                onChange={(e) => {
                  if (!gameData) return;
                  const newData = { ...gameData };
                  newData.imageAnswer = e.target.value;
                  newData.imagePrompt = "highly detailed photography, beautiful masterpiece, 8k resolution, clear subject";
                  setGameData(newData);
                }}
                className={styles.reviewInput}
                style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
              />
            </div>

            <img 
              src={`https://image.pollinations.ai/prompt/${encodeURIComponent(`${debouncedAnswer || gameData.imageAnswer}, ${gameData.imagePrompt}`)}?width=900&height=600&nologo=true&model=flux&seed=${Math.floor(Math.random() * 1000)}`} 
              alt="Preview"
              className={styles.reviewImagePreview}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://loremflickr.com/900/600/${encodeURIComponent((debouncedAnswer || gameData?.imageAnswer || topic).replace(/ /g, ','))}/all`; }}
            />

            {gameData.questions.map((q, qIndex) => (
              <div key={qIndex} className={styles.reviewQuestion}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent)', width: '40px' }}>#{qIndex + 1}</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent)', width: '40px' }}>Ans</span>
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
          <p>Type a topic above to generate a 4x4 picture puzzle!</p>
        </div>
      ) : (
        <div className={styles.gameArea}>
          <div className={styles.revealBoard}>
            <img 
              src={`https://image.pollinations.ai/prompt/${encodeURIComponent(`${debouncedAnswer || gameData.imageAnswer}, ${gameData.imagePrompt}`)}?width=900&height=600&nologo=true&model=flux&seed=${Math.floor(Math.random() * 1000)}`} 
              alt="Hidden Image"
              className={styles.hiddenImage}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://loremflickr.com/900/600/${encodeURIComponent((debouncedAnswer || gameData?.imageAnswer || topic).replace(/ /g, ','))}/all`; }}
            />
            
            <div className={styles.gridOverlay}>
              {Array.from({ length: 16 }).map((_, i) => (
                <button 
                  key={i} 
                  className={`${styles.tile} ${revealedTiles[i] ? styles.tileHidden : ''}`}
                  onClick={() => handleTileClick(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            
            {boardRevealed && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.85)',
                padding: '2rem 4rem',
                borderRadius: '24px',
                border: '4px solid var(--accent)',
                boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                zIndex: 20,
                textAlign: 'center',
                backdropFilter: 'blur(8px)'
              }}>
                <h2 style={{ fontSize: '3rem', color: '#fff', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {gameData?.imageAnswer ? gameData.imageAnswer.toUpperCase() : topic.toUpperCase()}
                </h2>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '900px', margin: '1rem auto' }}>
            <button 
              className={styles.genBtn}
              onClick={() => {
                setRevealedTiles(Array(16).fill(true));
                setBoardRevealed(true);
              }}
              style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', borderRadius: '16px' }}
            >
              <Sparkles /> Reveal Full Picture & Answer
            </button>
          </div>

          <div className={styles.teamScoreList}>
            {currentTeams.map(t => (
              <div key={t.id} className={styles.teamCard}>
                <span style={{ fontWeight: 800 }}>{t.name}</span>
                <div className={styles.scoreControl}>
                  <button onClick={() => updateTeamScore(t.id, -100)}>-</button>
                  <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{t.score}</span>
                  <button onClick={() => updateTeamScore(t.id, 100)}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeQuestion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 style={{ color: 'var(--accent)' }}>Tile {activeQuestion.index + 1}</h2>
            
            {showAnswer ? (
              <div className={styles.answerBox}>
                <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Answer:</h3>
                <p className={styles.questionText}>{activeQuestion.a}</p>
              </div>
            ) : (
              <p className={styles.questionText}>{activeQuestion.q}</p>
            )}
            
            <div className={styles.modalActions}>
              {!showAnswer && (
                <button onClick={() => setShowAnswer(true)} className={styles.secondaryBtn}>
                  Reveal Answer
                </button>
              )}
              <button onClick={() => handleClose(true)}>Correct (Reveal Tile)</button>
              <button onClick={() => handleClose(false)} className={styles.secondaryBtn}>Incorrect (Keep Tile)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
