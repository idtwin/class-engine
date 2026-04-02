"use client";

import { useState, useEffect } from "react";
import styles from "./game.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Clock, Zap, Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";

const DEFAULT_GAME_BOARD = [
  {
    category: "Grammar",
    questions: [
      { points: 100, text: "Correct this: He don't like apples.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 200, text: "Make a sentence using 'have been'.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 300, text: "Combine: 'I'm tired. I worked late.'", answered: false, includeImage: false, imagePrompt: "" },
      { points: 400, text: "Explain 'who' vs 'whom'.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 500, text: "Create a 3rd conditional sentence.", answered: false, includeImage: false, imagePrompt: "" },
    ]
  },
  {
    category: "Vocabulary",
    questions: [
      { points: 100, text: "Name 3 fruits that are red.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 200, text: "Synonym for 'happy' that starts with E.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 300, text: "What do you call someone who studies stars?", answered: false, includeImage: true, imagePrompt: "astronomer looking through telescope at stars" },
      { points: 400, text: "Use 'ubiquitous' in a sentence.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 500, text: "Antonym of 'ephemeral'.", answered: false, includeImage: false, imagePrompt: "" },
    ]
  },
  {
    category: "Everyday",
    questions: [
      { points: 100, text: "How do you ask for the bill at a restaurant?", answered: false, includeImage: false, imagePrompt: "" },
      { points: 200, text: "Polite way to say 'I don't know'.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 300, text: "How do you decline an invitation respectfully?", answered: false, includeImage: false, imagePrompt: "" },
      { points: 400, text: "Apologize for being very late.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 500, text: "Express sympathy for bad news without saying sorry.", answered: false, includeImage: false, imagePrompt: "" },
    ]
  },
  {
    category: "Pronounce",
    questions: [
      { points: 100, text: "Pronounce: 'Though'", answered: false, includeImage: false, imagePrompt: "" },
      { points: 200, text: "Pronounce: 'Tough' vs 'Through'", answered: false, includeImage: false, imagePrompt: "" },
      { points: 300, text: "Say quickly: She sells seashells.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 400, text: "Read: 'The chaos caused a choir to cough.'", answered: false, includeImage: false, imagePrompt: "" },
      { points: 500, text: "Say: 'Rural squirrel'.", answered: false, includeImage: true, imagePrompt: "cute squirrel in a forest" },
    ]
  },
  {
    category: "Debate",
    questions: [
      { points: 100, text: "Dogs or cats? Why?", answered: false, includeImage: true, imagePrompt: "a golden retriever next to a black cat" },
      { points: 200, text: "Is fast food ever good?", answered: false, includeImage: true, imagePrompt: "delicious glowing hamburger and fries" },
      { points: 300, text: "Argue FOR school uniforms.", answered: false, includeImage: false, imagePrompt: "" },
      { points: 400, text: "Should students have homework?", answered: false, includeImage: false, imagePrompt: "" },
      { points: 500, text: "Argue against using AI in school.", answered: false, includeImage: false, imagePrompt: "" },
    ]
  }
];

export default function GameBoard() {
  const [mounted, setMounted] = useState(false);
  const { currentTeams, updateTeamScore, triggerTwist, geminiKey, activeRoomCode } = useClassroomStore();
  const [board, setBoard] = useState<any[]>(DEFAULT_GAME_BOARD);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [roomBuzzes, setRoomBuzzes] = useState<any[]>([]);

  // Poll for buzzes when active room
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomBuzzes(data.buzzes || []);
        }
      } catch (e) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [activeRoomCode]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeQuestion && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [activeQuestion, timeLeft]);

  if (!mounted) return null;

  const handleGenerate = async () => {
    if (!geminiKey) return alert("Please set your Gemini API key in the Dashboard Settings first!");
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setBoard([]); 
    try {
      const res = await fetch("/api/generate-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: geminiKey, 
          topic, 
          level: "Mixed Level Class" 
        })
      });
      const data = await res.json();
      if (res.ok && data.board) {
        setBoard(data.board);
        setReviewMode(true);
      } else {
        alert("Error: " + (data.error || "Unknown Error from AI"));
        setBoard(DEFAULT_GAME_BOARD);
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
      setBoard(DEFAULT_GAME_BOARD);
    }
    setIsGenerating(false);
  };

  const handleTileClick = (cIndex: number, qIndex: number) => {
    if (board[cIndex].questions[qIndex].answered) return;
    setActiveQuestion({ ...board[cIndex].questions[qIndex], cIndex, qIndex, category: board[cIndex].category });
    setShowAnswer(false);
    setTimeLeft(10);
    setRoomBuzzes([]);
    // Push question to Redis + clear buzzes
    if (activeRoomCode) {
      fetch("/api/room/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "clear_buzzes", payload: {} })
      }).then(() => {
        fetch("/api/room/action", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeRoomCode, action: "set_question", payload: { question: { text: board[cIndex].questions[qIndex].text, category: board[cIndex].category, points: board[cIndex].questions[qIndex].points } } })
        });
      }).catch(() => {});
    }
  };

  const closeQuestion = (markAnswered = true) => {
    if (markAnswered && activeQuestion) {
      const newBoard = [...board];
      newBoard[activeQuestion.cIndex].questions[activeQuestion.qIndex].answered = true;
      setBoard(newBoard);
    }
    setActiveQuestion(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games"><button className={styles.iconBtn}><ArrowLeft /></button></Link>
          <h1>Jeopardy</h1>
          <MultiplayerHost gameMode="jeopardy" />
          
          <div className={styles.aiControls}>
            <input 
              placeholder="Topic (e.g. Animals & Colors)" 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className={styles.topicInput}
            />
            <button onClick={handleGenerate} disabled={isGenerating} className={styles.genBtn}>
              <Sparkles size={20} /> {isGenerating ? "Generating..." : "Generate AI Board"}
            </button>
          </div>
        </div>
        
        <button className={styles.twistBtn} onClick={triggerTwist}><Zap size={20} /> Trigger Twist</button>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={80} className={styles.spinIcon} />
          <h2>AI is crafting your game...</h2>
          <p>Generating intelligent questions & creative image prompts</p>
        </div>
      ) : reviewMode ? (
        <div className={styles.reviewContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: 'var(--accent)', margin: 0 }}>Review & Edit Questions</h2>
            <button onClick={() => setReviewMode(false)} className={styles.genBtn} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '8px' }}>
              Approve & Start Game
            </button>
          </div>
          <div className={styles.reviewScroll}>
            {board.map((col, cIndex) => (
              <div key={cIndex} className={styles.reviewCategory}>
                <input 
                  value={col.category}
                  onChange={(e) => {
                    const newBoard = [...board];
                    newBoard[cIndex].category = e.target.value;
                    setBoard(newBoard);
                  }}
                  className={styles.reviewCatInput}
                />
                {col.questions.map((q: any, qIndex: number) => (
                  <div key={qIndex} className={styles.reviewQuestion}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className={styles.reviewPoints}>{q.points}</span>
                      <input 
                        value={q.text} 
                        onChange={(e) => {
                          const newBoard = [...board];
                          newBoard[cIndex].questions[qIndex].text = e.target.value;
                          setBoard(newBoard);
                        }}
                        className={styles.reviewInput}
                        placeholder="Question text..."
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', width: '30px', fontWeight: 'bold' }}>Ans:</span>
                      <input 
                        value={q.answer || ""} 
                        onChange={(e) => {
                          const newBoard = [...board];
                          newBoard[cIndex].questions[qIndex].answer = e.target.value;
                          setBoard(newBoard);
                        }}
                        className={styles.reviewInput}
                        placeholder="Answer / Hint..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.boardGrid}>
          {board?.map((col, cIndex) => (
            <div key={cIndex} className={styles.column}>
              <div className={styles.categoryHeader}>{col.category}</div>
              {col.questions.map((q: any, qIndex: number) => (
                <button 
                  key={qIndex} 
                  className={`${styles.tile} ${q.answered ? styles.answered : ''}`}
                  onClick={() => handleTileClick(cIndex, qIndex)}
                  disabled={q.answered}
                >
                  {q.points}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className={styles.scorebar}>
        {currentTeams.length === 0 && <span style={{ opacity: 0.5 }}>Generate teams on Dashboard to use Scorecard</span>}
        {currentTeams.map(t => (
          <div key={t.id} className={styles.teamScore}>
            <span className={styles.teamName}>{t.name}</span>
            <div className={styles.scoreControl}>
              <button onClick={() => updateTeamScore(t.id, -100)}>-</button>
              <span className={styles.scoreVal}>{t.score}</span>
              <button onClick={() => updateTeamScore(t.id, 100)}>+</button>
            </div>
          </div>
        ))}
      </div>

      {activeQuestion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 style={{ margin: 0 }}>{activeQuestion.category} - {activeQuestion.points}</h2>
            
            {activeQuestion.includeImage && activeQuestion.imagePrompt && (
              <img 
                src={`https://image.pollinations.ai/prompt/${encodeURIComponent(activeQuestion.imagePrompt)}?width=800&height=400&nologo=true`} 
                alt={activeQuestion.imagePrompt}
                className={styles.modalImage}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            )}

            {/* Buzz-in Banner */}
            {activeRoomCode && roomBuzzes.length > 0 && (
              <div style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(45,212,191,0.15)', border: '2px solid var(--accent)', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem' }}>🔔 Buzz Order:</div>
                {roomBuzzes.sort((a: any, b: any) => a.time - b.time).map((b: any, i: number) => (
                  <div key={i} style={{ fontSize: '1.2rem', fontWeight: i === 0 ? 900 : 400, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                    {i + 1}. {b.name} {i === 0 && '🏆'}
                  </div>
                ))}
              </div>
            )}

            {showAnswer ? (
              <div className={styles.answerBox}>
                <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Answer / Hint:</h3>
                <p className={styles.questionText}>{activeQuestion.answer || "No specific answer was provided for this question."}</p>
              </div>
            ) : (
              <p className={styles.questionText}>{activeQuestion.text}</p>
            )}
            
            <div className={`${styles.timer} ${timeLeft <= 3 ? styles.timerDanger : ''}`}>
              <Clock size={40} />
              <span>0:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
            
            <div className={styles.modalActions}>
              {!showAnswer && (
                <button onClick={() => setShowAnswer(true)} className={styles.secondaryBtn} style={{ background: 'var(--panel)', color: 'white', borderColor: 'transparent' }}>
                  Reveal Answer
                </button>
              )}
              <button onClick={() => closeQuestion(true)}>Done</button>
              <button onClick={() => closeQuestion(false)} className={styles.secondaryBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
