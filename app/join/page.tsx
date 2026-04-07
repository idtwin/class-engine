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
  const [selectedValue, setSelectedValue] = useState("");

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

  // Parse selected value -> { name, teamId, teamName, teamColor }
  const parsed = selectedValue ? JSON.parse(selectedValue) : null;

  const handleJoin = async () => {
    if (!parsed) return setError("Please select your name");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/room/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: parsed.name, teamId: parsed.teamId, teamName: parsed.teamName })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(`studentId_${code}`, data.studentId);
        localStorage.setItem(`studentName_${code}`, parsed.name);
        router.push(`/play/${code}`);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

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
          <p style={{ opacity: 0.7 }}>Select your name</p>
          <select 
            className={styles.select}
            value={selectedValue}
            onChange={e => setSelectedValue(e.target.value)}
          >
            <option value="" disabled>Choose your name...</option>
            {teams.map((team, tIdx) => {
              const color = TEAM_COLORS[tIdx % TEAM_COLORS.length];
              return (
                <optgroup key={team.id} label={`── ${team.name} ──`}>
                  {team.students?.map((s: any) => (
                    <option 
                      key={s.id} 
                      value={JSON.stringify({ name: s.name, teamId: team.id, teamName: team.name, color })}
                    >
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          {/* Team Preview Card */}
          {parsed && (
            <div style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              border: `2px solid ${parsed.color}`, 
              background: `${parsed.color}15`,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>Your Team</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: parsed.color }}>{parsed.teamName}</div>
            </div>
          )}

          {error && <div style={{ color: '#ef4444' }}>{error}</div>}
          <button className={styles.btn} onClick={handleJoin} disabled={!parsed || loading}>
            {loading ? "Connecting..." : parsed ? `Join as ${parsed.name}` : "Select your name above"}
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
