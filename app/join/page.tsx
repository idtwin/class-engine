"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./join.module.css";

function JoinLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [roster, setRoster] = useState<{ id: string; name: string; class_name: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!code) return; // If code isn't parsed yet from search params, wait

    // 1. Check if they already bypassed this room via old local storage mapping
    const localId = localStorage.getItem(`studentId_${code}`);
    const localName = localStorage.getItem(`studentName_${code}`);

    // 2. Check if they have a global trusted identity from a recent OTP
    const globalId = localStorage.getItem('globalStudentId');
    const globalName = localStorage.getItem('globalStudentName');
    
    if (localId && localName) {
      router.replace(`/play/${code}`); // Already joined this room
    } else if (globalId && globalName) {
      // Sync their identity to this specific game room code
      localStorage.setItem(`studentId_${code}`, globalId);
      localStorage.setItem(`studentName_${code}`, globalName);
      router.replace(`/play/${code}`);
    }
  }, [code, router]);

  useEffect(() => {
    // Fetch filtered roster (only those with active PINs)
    const fetchRoster = async () => {
      try {
        const res = await fetch('/api/roster?active=true');
        const data = await res.json();
        if (data.roster) {
          setRoster(data.roster);
        }
      } catch (err) {
        console.error("Failed to load roster", err);
      }
    };
    
    fetchRoster();
    
    // Polling: refresh the list every 10 seconds in case a student just got synced
    const refreshInterval = setInterval(fetchRoster, 10000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Group roster by class
  const groupedRoster = roster.reduce((acc, student) => {
    if (!acc[student.class_name]) acc[student.class_name] = [];
    acc[student.class_name].push(student);
    return acc;
  }, {} as Record<string, typeof roster>);

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roster_id: selectedStudent,
          otp: otp
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Drop cookie handled by server, we can just redirect!
        // Store global identity to bypass future logins
        localStorage.setItem(`globalStudentId`, data.studentId);
        localStorage.setItem(`globalStudentName`, data.studentName);
        // Sync it to this specific room so game logic immediately picks it up
        localStorage.setItem(`studentId_${code}`, data.studentId);
        localStorage.setItem(`studentName_${code}`, data.studentName);
        
        if (code) {
          router.push(`/play/${code}`);
        } else {
          setError("No room code provided. Please scan the QR code on the projector again.");
          setOtp("");
        }
      } else {
        setError(data.error || "Invalid Authorization Code");
        setOtp("");
      }
    } catch (e: any) {
      setError(e.message);
      setOtp("");
    }
    setLoading(false);
  };

  const selectedStudentData = roster.find(s => s.id === selectedStudent);

  return (
    <div className={styles.card}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoDot} />
        ARCADE_COMMAND
      </div>

      {/* Hero */}
      <h1 className={styles.title}>
        {step === 1 ? "Choose Operator" : "Authorization"}
      </h1>
      <p className={styles.subtitle}>
        {step === 1
          ? "Select your identity to connect"
          : `Enter the code provided by the Commander`}
      </p>

      {/* Step 1 — Name select */}
      {step === 1 && (
        <div className={styles.nameWrap}>
          <label className={styles.fieldLabel}>Global Roster</label>
          <select
            className={styles.nameSelect}
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="" disabled>
              Select your name...
            </option>
            {Object.keys(groupedRoster).map(className => (
                <optgroup key={className} label={`── ${className} ──`}>
                  {groupedRoster[className].map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
            ))}
          </select>

          {/* Identity preview */}
          {selectedStudentData && (
            <div
              className={styles.teamPreview}
              style={{
                border: `1.5px solid rgba(190, 239, 0, 0.3)`,
                background: `rgba(190, 239, 0, 0.05)`,
              }}
            >
              <div
                className={styles.teamPreviewDot}
                style={{ background: 'var(--team-green)', boxShadow: `0 0 8px var(--team-green)` }}
              />
              <div className={styles.teamPreviewInfo}>
                <span className={styles.teamPreviewLabel}>Selected Operator</span>
                <span
                  className={styles.teamPreviewName}
                  style={{ color: 'var(--team-green)' }}
                >
                  {selectedStudentData.name}
                </span>
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.joinBtn}
            onClick={() => setStep(2)}
            disabled={!selectedStudent || loading}
          >
            Proceed →
          </button>
        </div>
      )}

      {/* Step 2 — Code entry */}
      {step === 2 && (
        <div className={styles.codeWrap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-8px' }}>
             <label className={styles.fieldLabel}>4-Digit Authorization Code</label>
             <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>Change Operator</button>
          </div>
          
          <input
            type="text"
            className={styles.codeInput}
            maxLength={4}
            placeholder="XXXX"
            value={otp}
            onChange={(e) => setOtp(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
            autoFocus
            autoComplete="off"
            type="tel"
          />
          {error && <div className={styles.error}>{error}</div>}
          <button
            className={styles.joinBtn}
            onClick={handleVerifyOtp}
            disabled={otp.length !== 4 || loading}
          >
            {loading ? "Authenticating..." : "Connect →"}
          </button>
        </div>
      )}

      {/* Class badge */}
      <div className={styles.classBadge} style={{ marginTop: '32px' }}>
        <div className={styles.classBadgeDot} />
        <span className={styles.classBadgeText}>
          SECURE NEURAL LINK • ENCRYPTED
        </span>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className={styles.page}>
      <Suspense
        fallback={
          <div className={styles.card}>
            <div className={styles.spinner} />
          </div>
        }
      >
        <JoinLogic />
      </Suspense>
    </div>
  );
}
