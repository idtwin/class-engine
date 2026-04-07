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
  const { currentTeams, updateTeamScore, triggerTwist, geminiKey, ollamaModel, llmProvider, activeRoomCode } = useClassroomStore();
  const [board, setBoard] = useState<any[]>(DEFAULT_GAME_BOARD);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [roomBuzzes, setRoomBuzzes] = useState<any[]>([]);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);

  // Poll for buzzes and student answers when active room
  useEffect(() => {
    if (!activeRoomCode) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomBuzzes(data.buzzes || []);
          setRoomStudents(data.students || []);
          setRoomData(data);
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
    if (llmProvider === 'gemini' && !geminiKey) return alert("Please set your Gemini API key in the Dashboard Settings first!");
    if (!topic) return alert("Please enter a topic!");
    
    setIsGenerating(true);
    setBoard([]); 
    try {
      const res = await fetch("/api/generate-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: geminiKey, 
          ollamaModel,
          provider: llmProvider,
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
        {currentTeams.map((t, i) => {
          const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4"];
          const color = colors[i % colors.length];
          return (
          <div key={t.id} className={styles.teamScore} style={{ borderTop: `3px solid ${color}` }}>
            <span className={styles.teamName} style={{ color }}>{t.name}</span>
            <div className={styles.scoreControl}>
              <button onClick={() => updateTeamScore(t.id, -100)}>-</button>
              <span className={styles.scoreVal} style={{ color }}>{t.score}</span>
              <button onClick={() => updateTeamScore(t.id, 100)}>+</button>
            </div>
          </div>
          );
        })}
      </div>

      {activeQuestion && (() => {
        const sortedBuzzes = [...roomBuzzes].sort((a: any, b: any) => a.time - b.time);
        const firstBuzzer = sortedBuzzes[0];
        const firstBuzzerTeam = firstBuzzer ? currentTeams.find(t => t.name === firstBuzzer.name || t.students.some(s => s.name === firstBuzzer.name)) : null;
        
        // Find student answers from the buzzed-in students
        const buzzedStudentAnswers = sortedBuzzes.map(b => {
          const student = roomStudents.find((s: any) => s.name === b.name);
          return { ...b, answered: student?.answered, lastAnswer: student?.lastAnswer, answerTime: student?.answerTime };
        });

        return (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem 3rem' }}>
            <h2 style={{ margin: 0 }}>{activeQuestion.category} - {activeQuestion.points}</h2>
            
            {activeQuestion.includeImage && activeQuestion.imagePrompt && (
              <img 
                src={`https://image.pollinations.ai/prompt/${encodeURIComponent(activeQuestion.imagePrompt)}?width=800&height=400&nologo=true`} 
                alt={activeQuestion.imagePrompt}
                className={styles.modalImage}
              />
            )}

            {showAnswer ? (
              <div className={styles.answerBox}>
                <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Answer:</h3>
                <p className={styles.questionText} style={{ fontSize: '2.5rem' }}>{activeQuestion.answer || "No answer provided."}</p>
              </div>
            ) : (
              <p className={styles.questionText} style={{ fontSize: '2.5rem' }}>{activeQuestion.text}</p>
            )}

            {/* Buzz-in + Typed Answers Panel */}
            {activeRoomCode && sortedBuzzes.length > 0 && (
              <div style={{ width: '100%', padding: '1.5rem', borderRadius: '16px', background: 'rgba(45,212,191,0.1)', border: '2px solid var(--accent)' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: '0.75rem', fontSize: '1.1rem' }}>🔔 Buzz Order:</div>
                {buzzedStudentAnswers.map((b: any, i: number) => {
                  return (
                    <div key={i} style={{ 
                      padding: '0.5rem 0', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      borderBottom: i < sortedBuzzes.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                    }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                        color: i === 0 ? '#111' : 'rgba(255,255,255,0.5)',
                        fontWeight: 900, fontSize: '0.9rem'
                      }}>{i + 1}</span>
                      <span style={{ fontWeight: i === 0 ? 900 : 400, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                        {b.teamName && b.teamName !== b.name ? `${b.teamName} — ${b.name}` : b.name} {i === 0 && '🏆'}
                      </span>
                      {b.answered && b.lastAnswer && (
                        <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '1rem' }}>
                          &ldquo;{b.lastAnswer}&rdquo;
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className={`${styles.timer} ${timeLeft <= 3 ? styles.timerDanger : ''}`} style={{ fontSize: '3rem' }}>
              <Clock size={32} />
              <span>0:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {!showAnswer && (
                <button onClick={() => {
                  setShowAnswer(true);
                  if (activeRoomCode) {
                    fetch("/api/room/action", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
                    }).catch(() => {});
                  }
                }} style={{ padding: '1rem 2rem', fontSize: '1.3rem', background: '#2dd4bf', color: '#111', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
                  Reveal Answer
                </button>
              )}
              
              {/* Manual Award: Give points to first buzzer's team */}
              {firstBuzzerTeam && (
                <button onClick={() => {
                  updateTeamScore(firstBuzzerTeam.id, activeQuestion.points);
                  setShowAnswer(true);
                  if (activeRoomCode) {
                    fetch("/api/room/action", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
                    }).catch(() => {});
                  }
                }} style={{ padding: '1rem 2rem', fontSize: '1.3rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
                  ✅ Award {activeQuestion.points} to {firstBuzzer.name}
                </button>
              )}

              <button onClick={() => closeQuestion(true)} style={{ padding: '1rem 2rem', fontSize: '1.3rem', background: 'var(--panel)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Done (Close)
              </button>
              <button onClick={() => closeQuestion(false)} style={{ padding: '1rem 2rem', fontSize: '1.3rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
