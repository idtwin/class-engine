"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "../play.module.css";
import React from "react";
import { useParams } from "next/navigation";

export default function PlayPage() {
  const params = useParams();
  const code = params.code as string;

  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  
  const [textInput, setTextInput] = useState("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lastQuestionId, setLastQuestionId] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(`studentId_${code}`);
    const storedName = localStorage.getItem(`studentName_${code}`);
    if (!stored) {
      window.location.href = `/join?code=${code}`;
      return;
    }
    setStudentId(stored);
    setStudentName(storedName || "Player");

    // Poll every 1.5s
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
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    poll();
    const intervalId = setInterval(poll, 1500);
    return () => clearInterval(intervalId);
  }, [code]);

  // Reset local buzz/vote state when the question changes
  useEffect(() => {
    if (room?.currentQuestion) {
      const qId = room.currentQuestion.brokenSentence || room.currentQuestion.text || room.currentQuestion.optionA || JSON.stringify(room.currentQuestion);
      if (qId !== lastQuestionId) {
        setLastQuestionId(qId);
        setHasBuzzed(false);
        setHasVoted(false);
        setHasSubmitted(false);
        setSelectedWord(null);
        setTextInput("");
      }
    }
  }, [room?.currentQuestion]);

  const sendAction = useCallback(async (action: string, payload: any) => {
    try {
      await fetch(`/api/room/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action, payload })
      });
    } catch (e: any) {
      console.error(e);
    }
  }, [code]);

  const handleBuzz = () => {
    if (hasBuzzed) return;
    setHasBuzzed(true);
    sendAction("buzz_in", { studentId, name: studentName });
  };

  const handleVote = (vote: string) => {
    if (hasVoted) return;
    setHasVoted(true);
    sendAction("student_vote", { studentId, vote });
  };

  const handleSubmitAnswer = () => {
    if (!textInput.trim() || hasSubmitted) return;
    setHasSubmitted(true);
    sendAction("student_answer", { studentId, answer: textInput.trim() });
  };

  const handleTapWord = (word: string) => {
    if (selectedWord) return; // already tapped
    setSelectedWord(word);
    sendAction("student_answer", { studentId, answer: word });
  };

  if (error) return <div className={styles.screen}><h1>Disconnected</h1><p>{error}</p></div>;
  
  if (!room) return (
    <div className={styles.screen}>
      <div className={styles.loadingPulse} />
      <p style={{ opacity: 0.5 }}>Connecting to session...</p>
    </div>
  );

  if (room.status === "ended") {
    return <div className={styles.screen}><h2>Session Ended</h2><p style={{ opacity: 0.5 }}>The host closed this session.</p></div>;
  }

  if (room.status === "waiting") {
    return <div className={styles.screen}><h2>You&apos;re In! ✅</h2><p style={{ opacity: 0.5 }}>Waiting for the teacher to start the game...</p><p style={{ fontSize: '3rem' }}>📱</p></div>;
  }

  // Active Phase
  const me = room.students?.find((s: any) => s.id === studentId);

  // === BUZZER GAMES: Jeopardy, Rapid Fire, Picture Reveal ===
  if (room.gameMode === "jeopardy" || room.gameMode === "rapidfire" || room.gameMode === "reveal") {
    return (
      <div className={styles.screen}>
        {room.currentQuestion && (
          <div style={{ marginBottom: '2rem', textAlign: 'center', maxWidth: '90%' }}>
            <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>
              {room.currentQuestion.category && `${room.currentQuestion.category} • `}
              {room.currentQuestion.points && `${room.currentQuestion.points} pts`}
            </p>
            <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>{room.currentQuestion.text}</p>
          </div>
        )}
        <button 
          className={`${styles.giantBuzzer} ${hasBuzzed ? styles.buzzerPressed : ''}`}
          onClick={handleBuzz}
          disabled={hasBuzzed}
        >
          {hasBuzzed ? "BUZZED! 🔔" : "BUZZ IN"}
        </button>
        {hasBuzzed && <p style={{ marginTop: '1rem', opacity: 0.5 }}>Waiting for teacher...</p>}
      </div>
    );
  }

  // === ODD ONE OUT: 2x2 Grid ===
  if (room.gameMode === "oddoneout") {
    const words = room.currentQuestion?.words || ["...", "...", "...", "..."];
    return (
      <div className={styles.screen}>
        <h2 style={{ marginBottom: '1.5rem' }}>Tap the Outlier</h2>
        <div className={styles.grid2x2}>
          {words.map((w: string, idx: number) => (
            <button 
              key={idx} 
              className={`${styles.cardBtn} ${selectedWord === w ? styles.cardSelected : ''}`}
              onClick={() => handleTapWord(w)}
              disabled={!!selectedWord}
            >
              {w}
            </button>
          ))}
        </div>
        {selectedWord && <p style={{ marginTop: '1rem', color: 'var(--accent)' }}>Answer locked! ✅</p>}
      </div>
    );
  }

  // === FIX IT: Text input ===
  if (room.gameMode === "fixit") {
    return (
      <div className={styles.screen}>
        <h2 style={{ marginBottom: '0.5rem' }}>Correct the Sentence</h2>
        {room.currentQuestion?.brokenSentence && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', maxWidth: '90%', textAlign: 'center', fontSize: '1.1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            &ldquo;{room.currentQuestion.brokenSentence}&rdquo;
          </div>
        )}
        <textarea 
          className={styles.textArea} 
          value={textInput} 
          onChange={e => setTextInput(e.target.value)}
          disabled={hasSubmitted}
          placeholder="Type the corrected sentence..."
        />
        <button 
          className={styles.submitBtn} 
          onClick={handleSubmitAnswer}
          disabled={hasSubmitted || !textInput.trim()}
        >
          {hasSubmitted ? "Locked In ✅" : "LOCK IN ANSWER 🔒"}
        </button>
      </div>
    );
  }

  // === WOULD YOU RATHER: A/B Vote ===
  if (room.gameMode === "wyr") {
    return (
      <div className={styles.screen}>
        <h2 style={{ marginBottom: '1.5rem' }}>Would You Rather?</h2>
        {room.currentQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '90%', maxWidth: '400px' }}>
            <button 
              className={styles.submitBtn}
              onClick={() => handleVote('A')}
              disabled={hasVoted}
              style={{ background: hasVoted && me?.lastAnswer === 'A' ? '#ff4d4d' : hasVoted ? '#333' : '#ff4d4d', padding: '2rem', fontSize: '1.1rem', fontWeight: 700 }}
            >
              {room.currentQuestion.optionA}
            </button>
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.5rem', opacity: 0.3 }}>VS</div>
            <button 
              className={styles.submitBtn}
              onClick={() => handleVote('B')}
              disabled={hasVoted}
              style={{ background: hasVoted && me?.lastAnswer === 'B' ? '#4d9fff' : hasVoted ? '#333' : '#4d9fff', padding: '2rem', fontSize: '1.1rem', fontWeight: 700 }}
            >
              {room.currentQuestion.optionB}
            </button>
          </div>
        )}
        {hasVoted && <p style={{ marginTop: '1rem', color: 'var(--accent)' }}>Vote cast! ✅</p>}
        {!room.currentQuestion && <p style={{ opacity: 0.5 }}>Waiting for next scenario...</p>}
      </div>
    );
  }

  // === PASSIVE GAMES: Hot Seat, Story Chain ===
  if (room.gameMode === "hotseat" || room.gameMode === "story") {
    return (
      <div className={styles.screen}>
        <h2>🎬 Watch the Projector!</h2>
        <p style={{ opacity: 0.5, maxWidth: '80%', textAlign: 'center' }}>This game is played live in the classroom. Watch the projector and follow along!</p>
        <div style={{ fontSize: '4rem', marginTop: '1rem' }}>{room.gameMode === "hotseat" ? "🪑" : "📖"}</div>
      </div>
    );
  }

  // Fallback
  return <div className={styles.screen}><p style={{ opacity: 0.5 }}>Waiting for game to begin...</p></div>;
}
