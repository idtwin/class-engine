"use client";

import { useState, useEffect } from "react";
import styles from "../play.module.css";
import React from "react";
import { useParams } from "next/navigation";

export default function PlayPage() {
  const params = useParams();
  const code = params.code as string;

  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(`studentId_${code}`);
    if (!stored) {
      window.location.href = `/join?code=${code}`;
      return;
    }
    setStudentId(stored);

    // Poll every 1.5s instead of SSE — works reliably on Vercel
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

    poll(); // immediate first fetch
    const intervalId = setInterval(poll, 1500);
    return () => clearInterval(intervalId);
  }, [code]);

  const sendAction = async (payload: any) => {
    try {
      await fetch(`/api/room/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action: "student_answer", payload })
      });
    } catch (e: any) {
      console.error(e);
    }
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

  // Active Phase Checks
  const me = room.students?.find((s: any) => s.id === studentId);

  // Rapid Fire Controller
  if (room.gameMode === "rapidfire") {
     return (
       <div className={styles.screen}>
          <button 
             className={`${styles.giantBuzzer} ${me?.answered ? styles.buzzerPressed : ''}`}
             onClick={() => !me?.answered && sendAction({ studentId, answer: "buzzed" })}
             disabled={me?.answered}
          >
             {me?.answered ? "LOCKED" : "BUZZ IN"}
          </button>
       </div>
     );
  }

  // Odd One Out Controller
  if (room.gameMode === "oddoneout") {
     const words = room.currentQuestion?.words || ["...", "...", "...", "..."];
     return (
       <div className={styles.screen}>
          <h2>Tap the Outlier</h2>
          <div className={styles.grid2x2}>
             {words.map((w: string, idx: number) => (
                <button 
                  key={idx} 
                  className={`${styles.cardBtn} ${me?.lastAnswer === w ? styles.cardSelected : ''}`}
                  onClick={() => !me?.answered && sendAction({ studentId, answer: w })}
                  disabled={me?.answered}
                >
                  {w}
                </button>
             ))}
          </div>
       </div>
     )
  }

  // Fix It Controller
  if (room.gameMode === "fixit") {
     return (
       <div className={styles.screen}>
          <h2>Type Manual Correction</h2>
          <textarea 
            className={styles.textArea} 
            value={textInput} 
            onChange={e => setTextInput(e.target.value)}
            disabled={me?.answered}
            placeholder="Re-write the broken sentence here..."
          />
          <button 
             className={styles.submitBtn} 
             onClick={() => sendAction({ studentId, answer: textInput })}
             disabled={me?.answered || !textInput}
          >
             {me?.answered ? "Target Submitted." : "Push Hotfix"}
          </button>
       </div>
     )
  }

  return <div className={styles.screen}>Waiting for game to begin...</div>;
}
