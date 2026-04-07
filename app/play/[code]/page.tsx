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
  const [myTeamInfo, setMyTeamInfo] = useState<{name: string, color: string, activeCount: number} | null>(null);
  
  const [textInput, setTextInput] = useState("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lastQuestionId, setLastQuestionId] = useState("");
  const [teammateBlocked, setTeammateBlocked] = useState<string | null>(null);

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
        setTeammateBlocked(null);
      }
    }
  }, [room?.currentQuestion]);

  // Derive Team Info
  useEffect(() => {
    if (room && room.teams && studentName) {
      // Find team either by matching student name inside the team, or if the studentName is identically the team name
      const team = room.teams.find((t: any) => t.name === studentName || t.students.some((s: any) => s.name === studentName));
      if (team) {
        // Count how many from this team are actually connected in room.students
        const activeCount = room.students.filter((connectedStudent: any) => 
          connectedStudent.name === team.name || team.students.some((s: any) => s.name === connectedStudent.name)
        ).length;
        
        setMyTeamInfo({
          name: team.name,
          color: team.color || '#2dd4bf',
          activeCount
        });
      }
    }
  }, [room, studentName]);

  const sendAction = useCallback(async (action: string, payload: any) => {
    try {
      const res = await fetch(`/api/room/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action, payload })
      });
      return await res.json();
    } catch (e: any) {
      console.error(e);
      return null;
    }
  }, [code]);

  const handleBuzz = async () => {
    if (hasBuzzed) return;
    // Check if a teammate already buzzed by reading room state
    if (room?.buzzes && myTeamInfo) {
      const myStudent = room.students?.find((s: any) => s.id === studentId);
      const myTeamId = myStudent?.teamId;
      if (myTeamId) {
        const teamBuzz = room.buzzes.find((b: any) => b.teamId === myTeamId);
        if (teamBuzz) {
          setTeammateBlocked(teamBuzz.name);
          return;
        }
      }
    }
    setHasBuzzed(true);
    sendAction("buzz_in", { studentId, name: studentName });
  };

  const handleVote = (vote: string) => {
    if (hasVoted) return;
    setHasVoted(true);
    sendAction("student_vote", { studentId, vote });
  };

  const handleSubmitAnswer = async () => {
    if (!textInput.trim() || hasSubmitted) return;
    const result = await sendAction("student_answer", { studentId, answer: textInput.trim() });
    if (result?.error === "teammate_answered") {
      setTeammateBlocked(result.answeredBy);
      return;
    }
    setHasSubmitted(true);
  };

  const handleTapWord = async (word: string) => {
    if (selectedWord) return; // already tapped
    const result = await sendAction("student_answer", { studentId, answer: word });
    if (result?.error === "teammate_answered") {
      setTeammateBlocked(result.answeredBy);
      return;
    }
    setSelectedWord(word);
  };

  // Reusable teammate blocked banner
  const renderTeammateBlocked = () => {
    if (!teammateBlocked) return null;
    return (
      <div style={{
        padding: '1.2rem',
        borderRadius: '16px',
        border: '2px solid rgba(251,191,36,0.4)',
        background: 'rgba(251,191,36,0.1)',
        textAlign: 'center',
        width: '90%',
        maxWidth: '400px'
      }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24', margin: '0 0 0.3rem 0' }}>🤝 Teammate Already Answered</p>
        <p style={{ fontSize: '0.95rem', opacity: 0.7, margin: 0 }}>{teammateBlocked} locked in for your team</p>
      </div>
    );
  };

  if (error) return <div className={styles.screen}><h1>Disconnected</h1><p>{error}</p></div>;
  
  if (!room) return (
    <div className={styles.screen}>
      <div className={styles.loadingPulse} />
      <p style={{ opacity: 0.5 }}>Connecting to session...</p>
    </div>
  );

  // === RENDER HELPERS === //
  const teamColorStyle = myTeamInfo ? { color: myTeamInfo.color } : {};
  const teamBgStyle = myTeamInfo ? { background: `radial-gradient(circle at center, ${myTeamInfo.color}22 0%, transparent 70%)` } : {};
  
  const renderTeamBanner = () => {
    if (!myTeamInfo) return null;
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.75rem', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid ${myTeamInfo.color}66` }}>
        <span style={{ fontWeight: 800, color: myTeamInfo.color }}>{myTeamInfo.name}</span>
        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>🧑‍🤝‍🧑 {myTeamInfo.activeCount} Online</span>
      </div>
    );
  };

  if (room.status === "ended") {
    return <div className={styles.screen} style={teamBgStyle}>{renderTeamBanner()}<h2>Session Ended</h2><p style={{ opacity: 0.5 }}>The host closed this session.</p></div>;
  }

  if (room.status === "waiting") {
    return <div className={styles.screen} style={teamBgStyle}>{renderTeamBanner()}<h2>You&apos;re In! ✅</h2><p style={{ opacity: 0.5 }}>Waiting for the teacher to start the game...</p><p style={{ fontSize: '3rem' }}>📱</p></div>;
  }

  // Active Phase
  const me = room.students?.find((s: any) => s.id === studentId);

  // === UNIVERSAL WAITING STATE: No question loaded yet ===
  // Skip for passive games (hotseat, story) which don't need a question
  const isPassiveGame = room.gameMode === "hotseat" || room.gameMode === "story";
  if (!room.currentQuestion && !isPassiveGame) {
    const gameModeLabels: Record<string, { emoji: string; label: string }> = {
      fixit: { emoji: "🔧", label: "Fix It" },
      oddoneout: { emoji: "🎯", label: "Odd One Out" },
      rapidfire: { emoji: "⚡", label: "Rapid Fire" },
      jeopardy: { emoji: "🏆", label: "Jeopardy" },
      reveal: { emoji: "🖼️", label: "Picture Reveal" },
      wyr: { emoji: "🤔", label: "Would You Rather" },
    };
    const modeInfo = gameModeLabels[room.gameMode] || { emoji: "🎮", label: "Game" };

    return (
      <div className={styles.screen} style={teamBgStyle}>
        {renderTeamBanner()}
        <div style={{ fontSize: '4rem', marginTop: myTeamInfo ? '3rem' : '0' }}>{modeInfo.emoji}</div>
        <h2 style={{ marginBottom: '0.5rem' }}>{modeInfo.label}</h2>
        <div className={styles.loadingPulse} />
        <p style={{ opacity: 0.5, maxWidth: '80%', textAlign: 'center' }}>
          Waiting for the teacher to load the next question...
        </p>
        <p style={{ opacity: 0.3, fontSize: '0.9rem' }}>Stay on this screen!</p>
      </div>
    );
  }

  // === RAPID FIRE: MC Mode ===
  if (room.gameMode === "rapidfire" && room.currentQuestion?.options) {
    const isRevealed = room.answerRevealed;
    const sInfo = room.students?.find((s: any) => s.id === studentId);
    const myPick = sInfo?.lastAnswer || selectedWord;
    const correctLetter = room.currentQuestion.correctLetter;

    return (
      <div className={styles.screen} style={teamBgStyle}>
        {renderTeamBanner()}
        <h2 style={{ marginBottom: '0.5rem', marginTop: myTeamInfo ? '3rem' : '0', fontSize: '1.1rem', opacity: 0.7 }}>
          {room.currentQuestion.type}
        </h2>
        <p style={{ fontSize: '1.2rem', fontWeight: 700, textAlign: 'center', maxWidth: '90%', marginBottom: '1.5rem' }}>
          {room.currentQuestion.text}
        </p>

        {!isRevealed ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '90%', maxWidth: '400px' }}>
            {(["A", "B", "C", "D"] as const).map(letter => {
              const picked = myPick === letter;
              const anyPicked = !!myPick;
              return (
                <button
                  key={letter}
                  onClick={async () => {
                    if (myPick || teammateBlocked) return;
                    const result = await sendAction("student_answer", { studentId, answer: letter });
                    if (result?.error === "teammate_answered") {
                      setTeammateBlocked(result.answeredBy);
                      return;
                    }
                    setSelectedWord(letter);
                  }}
                  disabled={anyPicked || !!teammateBlocked}
                  style={{
                    padding: '1.2rem 1rem',
                    borderRadius: '14px',
                    border: `2px solid ${picked ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                    background: picked ? 'rgba(45,212,191,0.2)' : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: anyPicked ? 'default' : 'pointer',
                    opacity: anyPicked && !picked ? 0.3 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: 900, marginRight: '0.5rem', opacity: 0.5 }}>{letter}.</span>
                  {room.currentQuestion.options[letter]}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              padding: '1.5rem',
              borderRadius: '16px',
              border: `2px solid ${myPick === correctLetter ? '#22c55e' : '#ef4444'}`,
              background: myPick === correctLetter ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>
                {myPick === correctLetter ? '✅ Correct!' : '❌ Incorrect'}
              </h3>
              {myPick && <p style={{ opacity: 0.7, margin: 0 }}>You picked: <strong>{myPick}</strong></p>}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ opacity: 0.5, fontSize: '0.9rem', margin: '0 0 0.3rem 0' }}>Correct Answer:</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e', margin: 0 }}>
                {correctLetter}. {room.currentQuestion.options[correctLetter]}
              </p>
            </div>
          </div>
        )}
        {myPick && !isRevealed && <p style={{ marginTop: '1rem', color: 'var(--accent)' }}>Answer locked! ✅</p>}
        {renderTeammateBlocked()}
      </div>
    );
  }



  // === BUZZER GAMES: Jeopardy, Rapid Fire (buzzer mode), Picture Reveal ===
  if (room.gameMode === "jeopardy" || room.gameMode === "rapidfire" || room.gameMode === "reveal") {
    return (
      <div className={styles.screen} style={teamBgStyle}>
        {renderTeamBanner()}
        {room.currentQuestion && (
          <div style={{ marginBottom: '2rem', textAlign: 'center', maxWidth: '90%', marginTop: myTeamInfo ? '3rem' : '0' }}>
            <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>
              {room.currentQuestion.category && `${room.currentQuestion.category} • `}
              {room.currentQuestion.points && `${room.currentQuestion.points} pts`}
            </p>
            <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>{room.currentQuestion.text}</p>
          </div>
        )}
        
        {teammateBlocked ? (
          renderTeammateBlocked()
        ) : !hasBuzzed ? (
          <button 
            className={`${styles.giantBuzzer}`}
            onClick={handleBuzz}
          >
            BUZZ IN
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '90%', maxWidth: '400px' }}>
            <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.2rem' }}>🔔 BUZZED IN!</p>
            
            {room.gameMode === "jeopardy" && !hasSubmitted && (
              <>
                <textarea 
                  className={styles.textArea} 
                  value={textInput} 
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Type your answer..."
                  style={{ width: '100%', minHeight: '80px' }}
                />
                <button 
                  className={styles.submitBtn} 
                  onClick={() => {
                    if (!textInput.trim()) return;
                    setHasSubmitted(true);
                    sendAction("student_answer", { studentId, answer: textInput.trim() });
                  }}
                  disabled={!textInput.trim()}
                >
                  LOCK IN ANSWER 🔒
                </button>
              </>
            )}
            
            {hasSubmitted && <p style={{ color: 'var(--accent)' }}>Answer locked! ✅ Waiting for teacher...</p>}
            {!hasSubmitted && room.gameMode !== "jeopardy" && <p style={{ opacity: 0.5 }}>Waiting for teacher...</p>}
          </div>
        )}
      </div>
    );
  }

  // === ODD ONE OUT: 2x2 Grid ===
  if (room.gameMode === "oddoneout") {
    const words = room.currentQuestion?.words || ["...", "...", "...", "..."];
    return (
      <div className={styles.screen} style={teamBgStyle}>
        {renderTeamBanner()}
        <h2 style={{ marginBottom: '1.5rem', marginTop: myTeamInfo ? '3rem' : '0' }}>Tap the Outlier</h2>
        <div className={styles.grid2x2}>
          {words.map((w: string, idx: number) => (
            <button 
              key={idx} 
              className={`${styles.cardBtn} ${selectedWord === w ? styles.cardSelected : ''}`}
              onClick={() => handleTapWord(w)}
              disabled={!!selectedWord || !!teammateBlocked}
            >
              {w}
            </button>
          ))}
        </div>
        {selectedWord && <p style={{ marginTop: '1rem', color: 'var(--accent)' }}>Answer locked! ✅</p>}
        {renderTeammateBlocked()}
      </div>
    );
  }

  // === FIX IT: Text input ===
  if (room.gameMode === "fixit") {
    const isRevealed = room.answerRevealed;
    const sInfo = room.students?.find((s:any) => s.id === studentId);
    
    const myAnswer = sInfo?.lastAnswer || textInput;
    const correctAnswer = room.currentQuestion?.correctedSentence;
    const isCorrect = myAnswer && correctAnswer && myAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    
    const timeSeconds = (sInfo?.answerTime && room.questionStartTime) ? ((sInfo.answerTime - room.questionStartTime) / 1000).toFixed(1) + 's' : '';

    return (
      <div className={styles.screen} style={teamBgStyle}>
        {renderTeamBanner()}
        <h2 style={{ marginBottom: '0.5rem', marginTop: myTeamInfo ? '3rem' : '0' }}>Correct the Sentence</h2>
        {room.currentQuestion?.brokenSentence && !isRevealed && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', maxWidth: '90%', textAlign: 'center', fontSize: '1.1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            &ldquo;{room.currentQuestion.brokenSentence}&rdquo;
          </div>
        )}
        
        {!isRevealed ? (
          <>
            {teammateBlocked ? (
              renderTeammateBlocked()
            ) : (
            <>
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
            </>
            )}
          </>
        ) : (
          <div style={{ marginTop: '1rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              padding: '1.5rem',
              borderRadius: '16px',
              border: `2px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
              background: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>{isCorrect ? '✅ You got it!' : '❌ Incorrect'}</h3>
              {timeSeconds && <p style={{ opacity: 0.8, fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Locked in at: {timeSeconds}</p>}
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px' }}>
              <p style={{ opacity: 0.5, fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Your Answer:</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: isCorrect ? '#22c55e' : '#ef4444', margin: 0 }}>&ldquo;{myAnswer}&rdquo;</p>
            </div>
            
            {!isCorrect && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px' }}>
                <p style={{ opacity: 0.5, fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Correct Answer:</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2dd4bf', margin: 0 }}>&ldquo;{correctAnswer}&rdquo;</p>
              </div>
            )}
            
            <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '1rem' }}>Waiting for next round...</p>
          </div>
        )}
      </div>
    );
  }

  // === WOULD YOU RATHER: A/B Vote ===
  if (room.gameMode === "wyr") {
    return (
      <div className={styles.screen} style={teamBgStyle}>
        {renderTeamBanner()}
        <h2 style={{ marginBottom: '1.5rem', marginTop: myTeamInfo ? '3rem' : '0' }}>Would You Rather?</h2>
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
      <div className={styles.screen} style={teamBgStyle}>
        {renderTeamBanner()}
        <h2 style={{ marginTop: myTeamInfo ? '3rem' : '0' }}>🎬 Watch the Projector!</h2>
        <p style={{ opacity: 0.5, maxWidth: '80%', textAlign: 'center' }}>This game is played live in the classroom. Watch the projector and follow along!</p>
        <div style={{ fontSize: '4rem', marginTop: '1rem' }}>{room.gameMode === "hotseat" ? "🪑" : "📖"}</div>
      </div>
    );
  }

  // Fallback
  return <div className={styles.screen}><p style={{ opacity: 0.5 }}>Waiting for game to begin...</p></div>;
}
