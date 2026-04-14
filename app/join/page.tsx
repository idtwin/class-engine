"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./join.module.css";

// Team color tokens matching the design system
const TEAM_COLORS = [
  "#00e87a", // T1 green
  "#00c8f0", // T2 cyan
  "#ffc843", // T3 yellow
  "#ff4d8f", // T4 pink
  "#b06eff", // T5 purple
  "#ff7d3b", // T6 orange
  "#e2e8f0", // T7 white
];

function JoinLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

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
        setError(data.error || "Room not found");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const parsed = selectedValue ? JSON.parse(selectedValue) : null;

  const handleJoin = async () => {
    if (!parsed) return setError("Please select your name");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name: parsed.name,
          teamId: parsed.teamId,
          teamName: parsed.teamName,
        }),
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
    <div className={styles.card}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoDot} />
        ARCADE_COMMAND
      </div>

      {/* Hero */}
      <h1 className={styles.title}>
        {step === 1 ? "Join a Game" : "Ready to Play?"}
      </h1>
      <p className={styles.subtitle}>
        {step === 1
          ? "Enter the 4-digit code on the projector"
          : "Select your name to join"}
      </p>

      {/* Step 1 — Code entry */}
      {step === 1 && (
        <div className={styles.codeWrap}>
          <label className={styles.fieldLabel}>Room Code</label>
          <input
            type="text"
            className={styles.codeInput}
            maxLength={4}
            placeholder="XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleFetchRoom()}
            autoFocus
            autoComplete="off"
          />
          {error && <div className={styles.error}>{error}</div>}
          <button
            className={styles.joinBtn}
            onClick={handleFetchRoom}
            disabled={code.length !== 4 || loading}
          >
            {loading ? "Searching..." : "Find Room →"}
          </button>
        </div>
      )}

      {/* Step 2 — Name select */}
      {step === 2 && (
        <div className={styles.nameWrap}>
          <label className={styles.fieldLabel}>Your Name</label>
          <select
            className={styles.nameSelect}
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
          >
            <option value="" disabled>
              Choose your name...
            </option>
            {teams.map((team, tIdx) => {
              const color = TEAM_COLORS[tIdx % TEAM_COLORS.length];
              return (
                <optgroup key={team.id} label={`── ${team.name} ──`}>
                  {team.students?.map((s: any) => (
                    <option
                      key={s.id}
                      value={JSON.stringify({
                        name: s.name,
                        teamId: team.id,
                        teamName: team.name,
                        color,
                      })}
                    >
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          {/* Team preview */}
          {parsed && (
            <div
              className={styles.teamPreview}
              style={{
                border: `1.5px solid ${parsed.color}30`,
                background: `${parsed.color}0d`,
              }}
            >
              <div
                className={styles.teamPreviewDot}
                style={{ background: parsed.color, boxShadow: `0 0 8px ${parsed.color}80` }}
              />
              <div className={styles.teamPreviewInfo}>
                <span className={styles.teamPreviewLabel}>Your Team</span>
                <span
                  className={styles.teamPreviewName}
                  style={{ color: parsed.color }}
                >
                  {parsed.teamName}
                </span>
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.joinBtn}
            onClick={handleJoin}
            disabled={!parsed || loading}
          >
            {loading
              ? "Connecting..."
              : parsed
              ? `Join as ${parsed.name} →`
              : "Select your name above"}
          </button>
        </div>
      )}

      {/* Class badge */}
      <div className={styles.classBadge}>
        <div className={styles.classBadgeDot} />
        <span className={styles.classBadgeText}>
          {step === 2 && teams.length > 0
            ? `${teams.reduce((n, t) => n + (t.students?.length || 0), 0)} Students · ${teams.length} Teams`
            : "SMA · English Class"}
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
