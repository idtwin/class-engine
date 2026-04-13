"use client";

import { useState, useEffect } from "react";
import styles from "./game.module.css";
import GameTimer from "../components/GameTimer";
import GameSettingsDrawer from "../components/GameSettingsDrawer";
import BoardLibrary from "../components/BoardLibrary";
import { useClassroomStore, SavedBoard } from "../store/useClassroomStore";
import Link from "next/link";
import { ArrowLeft, Zap, Sparkles } from "lucide-react";
import MultiplayerHost from "../components/MultiplayerHost";
import { stopAllSFX } from "../lib/audio";

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

export default function JeopardyPage() {
  const { currentTeams, updateTeamScore, geminiKey, mistralKey, mistralModel, llmProvider, triggerTwist, activeRoomCode, saveBoard, setActiveAwardAmount } = useClassroomStore();
  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [board, setBoard] = useState<any[]>(DEFAULT_GAME_BOARD);
  const [reviewMode, setReviewMode] = useState(false);
  
  const handleLoadBoard = (saved: SavedBoard) => {
    setBoard(saved.content);
    setTopic(saved.topic);
    setReviewMode(true);
  };
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerDuration, setTimerDuration] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimesUp, setShowTimesUp] = useState(false);
  
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

  useEffect(() => {
    setMounted(true);
    return () => stopAllSFX();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setShowTimesUp(true);
      setTimeout(() => setShowTimesUp(false), 3000);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

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
          apiKey: llmProvider === 'gemini' ? geminiKey : mistralKey, 
          mistralModel,
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
    setTimeLeft(timerDuration);
    setTimerActive(true);
    setShowTimesUp(false);
    setRoomBuzzes([]);
    setActiveAwardAmount(board[cIndex].questions[qIndex].points);
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
    setTimerActive(false);
    setShowTimesUp(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/games" style={{ textDecoration: 'none' }}>
            <button className={styles.iconBtn}>
              <ArrowLeft color="#fbbf24" size={24} />
            </button>
          </Link>
          <h1 style={{ margin: 0, color: '#fbbf24', letterSpacing: '0.1em', fontFamily: 'monospace' }}>JEOPARDY_MATRIX</h1>
          <MultiplayerHost gameMode="jeopardy" />
          
          <div className={styles.aiControls} style={{ marginLeft: '1rem' }}>
            <input 
              placeholder="Lexicon Topic (e.g. Science)" 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className={styles.topicInput}
              onKeyDown={e => e.key === "Enter" && !isGenerating && handleGenerate()}
            />
            <button onClick={handleGenerate} disabled={isGenerating} className={styles.genBtn}>
              <Sparkles size={18} /> {isGenerating ? "SYNTHESIZING..." : "GENERATE MATRIX"}
            </button>
            <BoardLibrary currentGameType="jeopardy" onLoadBoard={handleLoadBoard} />
            <GameSettingsDrawer settings={[
              { label: "Timer per Question", type: "select", value: String(timerDuration), onChange: (v: string) => setTimerDuration(Number(v)), options: [
                { value: "10", label: "10 seconds" },
                { value: "15", label: "15 seconds" },
                { value: "20", label: "20 seconds" },
                { value: "30", label: "30 seconds" },
                { value: "45", label: "45 seconds" },
                { value: "60", label: "60 seconds" },
              ]},
            ]} />
          </div>
        </div>
        
        <button className={styles.twistBtn} onClick={triggerTwist}><Zap size={20} /> Trigger Twist</button>
      </header>

      {isGenerating ? (
        <div className={styles.loadingState}>
          <Sparkles size={80} className={styles.spinIcon} />
          <h2 style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>INITIALIZING DATA CORE...</h2>
        </div>
      ) : reviewMode ? (
        <div className={styles.reviewContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(251, 191, 36, 0.2)', paddingBottom: '1rem' }}>
            <h2 style={{ color: '#fbbf24', margin: 0, fontFamily: 'monospace', letterSpacing: '0.1em' }}>REVIEW MATRIX DATA</h2>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                onClick={() => {
                  const title = prompt("Enter a name for this board:", topic);
                  if (title) {
                    saveBoard({ title, topic, gameType: 'jeopardy', content: board });
                    alert("Board saved to your library!");
                  }
                }}
                className={styles.genBtn} 
                style={{ padding: '0.8rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: 'white' }}
              >
                💾 Save Board
              </button>
              <button onClick={() => setReviewMode(false)} className={styles.genBtn} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '8px' }}>
                Approve & Start Game
              </button>
            </div>
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
                alt="Question image"
                className={styles.modalImage}
                style={{ background: '#111', minHeight: '200px' }}
                onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '1'; }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                ref={(el) => { if (el) el.style.opacity = '0'; }}
              />
            )}

            {showAnswer ? (
              <div className={styles.answerBox}>
                <h3 style={{ color: '#fbbf24', marginBottom: '0.5rem', fontFamily: 'monospace' }}>DECRYPTED_ANSWER:</h3>
                <p className={styles.questionText}>{activeQuestion.answer || "No answer provided."}</p>
              </div>
            ) : (
              <p className={styles.questionText}>{activeQuestion.text}</p>
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
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GameTimer variant="circle" timeLeft={timeLeft} totalTime={timerDuration} showTimesUp={showTimesUp} />
            </div>
            
            {/* Action Buttons */}
            <div className={styles.modalActions}>
              {!showAnswer && (
                <button onClick={() => {
                  setShowAnswer(true);
                  if (activeRoomCode) {
                    fetch("/api/room/action", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: activeRoomCode, action: "reveal_answer", payload: {} })
                    }).catch(() => {});
                  }
                }}>
                  DECRYPT ANSWER
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
                }}>
                  AWARD [{activeQuestion.points}] {firstBuzzer.name}
                </button>
              )}

              <button className={styles.secondaryBtn} onClick={() => closeQuestion(true)}>
                ARCHIVE MODULE
              </button>
              {!showAnswer && (
                <button className={styles.secondaryBtn} onClick={() => closeQuestion(false)}>
                  CANCEL OVERRIDE
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
