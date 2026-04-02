"use client";

import { useState, useEffect } from "react";
import styles from "./play.module.css";
import React from "react";

export default function PlayPage({ params }: { params: { code: string } }) {
  // Extracting from generic params payload manually mapping for next13/14
  const code = params.code;

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

    const source = new EventSource(`/api/room/stream?code=${code}`);
    
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.error) {
           setError(data.error);
        } else if (data.status === "ended") {
           setRoom((prev: any) => ({ ...prev, status: "ended" }));
        } else {
           setRoom(data);
        }
      } catch (err) {
         console.error("SSE Parse Error", err);
      }
    };

    source.onerror = (e) => {
       console.error("Live streaming pipeline error", e);
    };

    return () => source.close();
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
  if (!room) return <div className={styles.screen}><div className={styles.giantBuzzer} style={{ width: '100px', height: '100px', opacity: 0.5, pointerEvents: 'none' }} /></div>;

  if (room.status === "ended") {
    return <div className={styles.screen}><h2>Session Terminated.</h2><p style={{ opacity: 0.5 }}>The host explicitly severed the connection.</p></div>;
  }

  if (room.status === "waiting") {
    return <div className={styles.screen}><h2>Awaiting Signal...</h2><p style={{ opacity: 0.5 }}>Locked into lobby: {code}</p></div>;
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

  return <div className={styles.screen}>Sync Protocol Desync: Unsupported Mode</div>;
}
