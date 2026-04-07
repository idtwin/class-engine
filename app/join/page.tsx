"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./join.module.css";

const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4"];

function JoinLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || "";
  
  const [code, setCode] = useState(initialCode);
  const [step, setStep] = useState(initialCode.length === 4 ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [teams, setTeams] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [matchedTeam, setMatchedTeam] = useState<any>(null);

  const handleFetchRoom = async () => {
    if (code.length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/room/get?code=${code}`);
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams || []);
        setStep(2);
      } else {
        setError(data.error);
        if (step === 2) setStep(1);
      }
    } catch (e: any) {
      setError(e.message);
      if (step === 2) setStep(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (initialCode && initialCode.length === 4) {
      setCode(initialCode);
      handleFetchRoom();
    }
  }, [initialCode]);

  // Auto-match name to team
  useEffect(() => {
    if (!name.trim() || teams.length === 0) {
      setMatchedTeam(null);
      return;
    }
    const lower = name.trim().toLowerCase();
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      const match = t.students?.some((s: any) => s.name.toLowerCase() === lower);
      if (match) {
        setMatchedTeam({ ...t, colorIndex: i });
        return;
      }
    }
    setMatchedTeam(null);
  }, [name, teams]);

  const handleJoin = async () => {
    if (!name.trim()) return setError("Please enter your name");
    if (!matchedTeam) return setError("Your name was not found in any team. Ask your teacher for help.");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/room/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: name.trim(), teamId: matchedTeam.id, teamName: matchedTeam.name })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(`studentId_${code}`, data.studentId);
        localStorage.setItem(`studentName_${code}`, name.trim());
        router.push(`/play/${code}`);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const teamColor = matchedTeam ? TEAM_COLORS[matchedTeam.colorIndex % TEAM_COLORS.length] : null;

  return (
    <div className={styles.box}>
      <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Join Game</h1>
      
      {step === 1 && (
        <>
          <p style={{ opacity: 0.7 }}>Enter the 4-digit code on the projector</p>
          <input 
            type="text" 
            maxLength={4} 
            className={styles.input}
            placeholder="XXXX"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
          />
          {error && <div style={{ color: '#ef4444' }}>{error}</div>}
          <button className={styles.btn} onClick={handleFetchRoom} disabled={code.length !== 4 || loading}>
            {loading ? "Searching..." : "Lock In"}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{ opacity: 0.7 }}>Enter your name to find your team</p>
          <input 
            type="text"
            className={styles.input}
            placeholder="Your name..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          
          {/* Team Match Indicator */}
          {matchedTeam ? (
            <div style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              border: `2px solid ${teamColor}`, 
              background: `${teamColor}15`,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>Your Team</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: teamColor || undefined }}>{matchedTeam.name}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.3rem' }}>
                {matchedTeam.students?.length} members
              </div>
            </div>
          ) : name.trim().length > 0 ? (
            <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.9rem', color: '#ef4444' }}>
              Name not found in any team. Check spelling or ask your teacher.
            </div>
          ) : null}

          {error && <div style={{ color: '#ef4444' }}>{error}</div>}
          <button className={styles.btn} onClick={handleJoin} disabled={!matchedTeam || loading}>
            {loading ? "Connecting..." : matchedTeam ? `Join as ${name.trim()}` : "Enter your name above"}
          </button>
        </>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div className={styles.box}>Loading Client Boundary...</div>}>
         <JoinLogic />
      </Suspense>
    </div>
  );
}
