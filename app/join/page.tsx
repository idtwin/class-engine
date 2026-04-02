"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./join.module.css";

function JoinLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || "";
  
  const [code, setCode] = useState(initialCode);
  const [step, setStep] = useState(initialCode.length === 4 ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [roster, setRoster] = useState<{id: string, name: string}[]>([]);
  const [selectedName, setSelectedName] = useState("");

  const handleFetchRoom = async () => {
    if (code.length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/room/get?code=${code}`);
      const data = await res.json();
      if (res.ok) {
        setRoster(data.activeRoster || []);
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
      handleFetchRoom(); // Auto-fetch if via QR hook
    }
  }, [initialCode]);

  const handleJoin = async () => {
    if (!selectedName) return setError("Please select your identity");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/room/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: selectedName })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(`studentId_${code}`, data.studentId);
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
          <p style={{ opacity: 0.7 }}>Who are you playing as?</p>
          <select 
              className={styles.select}
              value={selectedName}
              onChange={e => setSelectedName(e.target.value)}
          >
              <option value="" disabled>Select Name or Team...</option>
              {roster.map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
              {roster.length === 0 && <option value="Guest">Guest (No Roster Found)</option>}
          </select>
          {error && <div style={{ color: '#ef4444' }}>{error}</div>}
          <button className={styles.btn} onClick={handleJoin} disabled={!selectedName || loading}>
            {loading ? "Connecting..." : "Join Lobby"}
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
