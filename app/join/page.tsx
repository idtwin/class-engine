"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./join.module.css";

const TEAM_COLORS = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];

interface SquadMember {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  color: string;
}

interface SquadGroup {
  id: string;
  name: string;
  color: string;
  students: { id: string; name: string }[];
}

function JoinLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = (searchParams.get("code") || "").trim().toUpperCase();

  const [code, setCode] = useState(codeFromUrl);
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomData, setRoomData] = useState<any | null>(null);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [squads, setSquads] = useState<SquadGroup[]>([]);
  const [isFetchingRoom, setIsFetchingRoom] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // If URL query parameter changes
  useEffect(() => {
    if (codeFromUrl && codeFromUrl !== code) {
      setCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  // Load saved name on mount
  useEffect(() => {
    try {
      const savedName = localStorage.getItem("globalStudentName");
      if (savedName && !customName) {
        setCustomName(savedName);
      }
    } catch (e) {}
  }, []);

  const cleanCode = code.trim().toUpperCase();

  // Fetch room squads whenever cleanCode is 4 characters
  const activeFetchCode = useRef<string>("");
  useEffect(() => {
    if (cleanCode.length !== 4) {
      setRoomData(null);
      setRoomNotFound(false);
      setSquads([]);
      setIsFetchingRoom(false);
      return;
    }

    activeFetchCode.current = cleanCode;
    setIsFetchingRoom(true);
    setRoomNotFound(false);

    const loadRoom = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${cleanCode}`, { cache: "no-store" });
        if (activeFetchCode.current !== cleanCode) return; // stale request
        
        if (!res.ok) {
          setRoomData(null);
          setRoomNotFound(true);
          setSquads([]);
          setIsFetchingRoom(false);
          return;
        }

        const data = await res.json();
        const state = data.state || data;
        if (activeFetchCode.current !== cleanCode) return;

        setRoomData(state);
        setRoomNotFound(false);

        // 1. Primary: Extract squads from state.teams
        const squadList: SquadGroup[] = [];
        if (state.teams && Array.isArray(state.teams) && state.teams.length > 0) {
          state.teams.forEach((t: any, idx: number) => {
            const teamColor = t.color || TEAM_COLORS[idx % TEAM_COLORS.length];
            const rawStudents = Array.isArray(t.students) ? t.students : [];
            const studentItems = rawStudents
              .map((s: any) => ({
                id: s?.id || (typeof s === "string" ? s : s?.name) || `s_${Math.random()}`,
                name: typeof s === "string" ? s : (s?.name || s?.id || ""),
              }))
              .filter((s: any) => s.name && s.name.trim().length > 0);

            if (studentItems.length > 0) {
              squadList.push({
                id: t.id || `squad_${idx}`,
                name: t.name || `SQUAD ${idx + 1}`,
                color: teamColor,
                students: studentItems,
              });
            }
          });
        }

        // 2. Fallback: If teams had no students, group by activeRoster class_name
        const totalTeamStudents = squadList.reduce((acc, sq) => acc + sq.students.length, 0);
        if (totalTeamStudents === 0 && state.activeRoster && Array.isArray(state.activeRoster)) {
          const classGroups: Record<string, { id: string; name: string }[]> = {};
          state.activeRoster.forEach((p: any) => {
            const sName = typeof p === "string" ? p : (p?.name || "");
            if (sName && (!p?.type || p?.type === "student" || p?.type !== "team")) {
              const grpName = p.class_name || "Active Session";
              if (!classGroups[grpName]) classGroups[grpName] = [];
              classGroups[grpName].push({
                id: p.id || sName,
                name: sName,
              });
            }
          });

          Object.keys(classGroups).forEach((cName, idx) => {
            squadList.push({
              id: `class_${idx}`,
              name: cName,
              color: TEAM_COLORS[idx % TEAM_COLORS.length],
              students: classGroups[cName],
            });
          });
        }

        setSquads(squadList);
        setIsFetchingRoom(false);

        // 3. Pre-select student if previously saved in localStorage
        try {
          const savedId = localStorage.getItem(`studentId_${cleanCode}`) || localStorage.getItem("globalStudentId");
          const savedName = localStorage.getItem(`studentName_${cleanCode}`) || localStorage.getItem("globalStudentName");

          if (savedId || savedName) {
            for (const squad of squadList) {
              const match = squad.students.find(
                (s) => (savedId && s.id === savedId) || (savedName && s.name.toLowerCase() === savedName.toLowerCase())
              );
              if (match) {
                const matchVal: SquadMember = {
                  id: match.id,
                  name: match.name,
                  teamId: squad.id,
                  teamName: squad.name,
                  color: squad.color,
                };
                setSelectedValue(JSON.stringify(matchVal));
                setIsCustomMode(false);
                break;
              }
            }
          }
        } catch (e) {}
      } catch (err) {
        console.warn("[JOIN] Failed to load room:", err);
        setIsFetchingRoom(false);
      }
    };

    loadRoom();
  }, [cleanCode]);

  // Parse currently selected squad member
  const parsedMember: SquadMember | null = useMemo(() => {
    if (!selectedValue || selectedValue === "__custom__") return null;
    try {
      return JSON.parse(selectedValue);
    } catch {
      return null;
    }
  }, [selectedValue]);

  const totalRosterStudents = useMemo(() => {
    return squads.reduce((acc, sq) => acc + sq.students.length, 0);
  }, [squads]);

  // Dynamic button label & enabled calculation
  const effectiveName = parsedMember ? parsedMember.name : customName.trim();
  const isButtonEnabled = Boolean(cleanCode.length === 4 && effectiveName.length > 0 && !loading);

  const buttonText = useMemo(() => {
    if (loading) return "CONNECTING TO BRIDGE...";
    if (cleanCode.length !== 4) return "ENTER 4-DIGIT ROOM CODE";
    if (parsedMember) return `CONNECT AS ${parsedMember.name.toUpperCase()} →`;
    if (customName.trim()) return `CONNECT AS ${customName.trim().toUpperCase()} →`;
    if (totalRosterStudents > 0) return "SELECT YOUR OPERATOR ABOVE";
    return "ENTER YOUR CALLSIGN";
  }, [loading, cleanCode, parsedMember, customName, totalRosterStudents]);

  // Handle Join Action
  const handleJoin = async () => {
    if (!isButtonEnabled || loading) return;

    setLoading(true);
    setError("");

    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate(40); } catch (e) {}
      }

      let studentId = "";
      let studentName = "";
      let teamId: string | undefined = undefined;
      let teamName: string | undefined = undefined;

      if (parsedMember) {
        studentId = parsedMember.id;
        studentName = parsedMember.name;
        teamId = parsedMember.teamId;
        teamName = parsedMember.teamName;
      } else {
        studentName = customName.trim();
        studentId = localStorage.getItem(`studentId_${cleanCode}`) || `guest_${Date.now()}`;
      }

      // 1. Register with backend room state
      try {
        await fetch("/api/room/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: cleanCode,
            id: studentId,
            name: studentName,
            teamId,
            teamName,
          }),
        });
      } catch (postErr) {
        console.warn("[JOIN] POST /api/room/join warning:", postErr);
      }

      // 2. Persist in localStorage
      localStorage.setItem(`studentId_${cleanCode}`, studentId);
      localStorage.setItem(`studentName_${cleanCode}`, studentName);
      localStorage.setItem("globalStudentId", studentId);
      localStorage.setItem("globalStudentName", studentName);

      // 3. Navigate into controller cockpit
      router.push(`/play/${cleanCode}`);

      // Fail-safe immediate redirect for mobile browsers
      setTimeout(() => {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith(`/play/${cleanCode}`)) {
          window.location.href = `/play/${cleanCode}`;
        }
      }, 300);
    } catch (err: any) {
      setError(err?.message || "Failed to connect to room. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      {/* Tactical Logo */}
      <div className={styles.logo}>
        <div className={styles.logoDot} />
        COMMAND BRIDGE // OPERATOR LINK
      </div>

      <h1 className={styles.title}>CHOOSE OPERATOR</h1>
      <p className={styles.subtitle}>Select your identity to connect to game</p>

      <form
        className={styles.nameWrap}
        onSubmit={(e) => {
          e.preventDefault();
          handleJoin();
        }}
      >
        {/* Field 1: 4-Digit Room Code */}
        <div className={styles.codeWrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className={styles.fieldLabel}>4-Digit Room Code</label>
            {roomData ? (
              <span style={{ fontSize: "11px", color: "var(--team-green, #BEEF00)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                ● ROOM {cleanCode} DETECTED
              </span>
            ) : roomNotFound ? (
              <span style={{ fontSize: "10px", color: "var(--alert-red, #ff4444)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                ROOM {cleanCode} NOT FOUND
              </span>
            ) : isFetchingRoom ? (
              <span style={{ fontSize: "11px", color: "var(--cyan)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                SCANNING SQUADS...
              </span>
            ) : null}
          </div>
          <input
            type="text"
            className={styles.codeInput}
            maxLength={4}
            placeholder="XXXX"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
            autoComplete="off"
            autoCapitalize="characters"
          />
        </div>

        {/* Field 2: Squads Dropdown & Callsign Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className={styles.fieldLabel}>Select Your Squad & Name</label>
            {totalRosterStudents > 0 && (
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
                {totalRosterStudents} Operators Active
              </span>
            )}
          </div>

          {/* Primary Dropdown if squads exist */}
          {totalRosterStudents > 0 ? (
            <select
              className={styles.nameSelect}
              value={isCustomMode ? "__custom__" : selectedValue}
              onChange={(e) => {
                const val = e.target.value;
                setError("");
                if (val === "__custom__") {
                  setIsCustomMode(true);
                  setSelectedValue("__custom__");
                } else {
                  setIsCustomMode(false);
                  setSelectedValue(val);
                }
              }}
            >
              <option value="">── CHOOSE YOUR OPERATOR ({totalRosterStudents}) ──</option>
              {squads.map((sq) => (
                <optgroup key={sq.id} label={`── ${sq.name.toUpperCase()} ──`}>
                  {sq.students.map((s) => {
                    const optVal: SquadMember = {
                      id: s.id,
                      name: s.name,
                      teamId: sq.id,
                      teamName: sq.name,
                      color: sq.color,
                    };
                    return (
                      <option key={s.id} value={JSON.stringify(optVal)}>
                        {s.name}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
              <optgroup label="── GUEST / CUSTOM ──">
                <option value="__custom__">✍️ Enter Custom Nickname...</option>
              </optgroup>
            </select>
          ) : isFetchingRoom ? (
            <div style={{ padding: "16px", background: "var(--surface)", border: "2px solid var(--border-subtle)", textAlign: "center", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
              LOADING SQUADS FOR ROOM {cleanCode}...
            </div>
          ) : null}

          {/* Custom Nickname Input: shown if no roster loaded OR user explicitly picked custom */}
          {(isCustomMode || totalRosterStudents === 0) && !isFetchingRoom && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: totalRosterStudents > 0 ? "8px" : "0" }}>
              <input
                type="text"
                className={styles.codeInput}
                placeholder="Enter your nickname..."
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleJoin();
                  }
                }}
                style={{
                  fontSize: "18px",
                  letterSpacing: "normal",
                  textAlign: "left",
                  padding: "14px 16px",
                }}
                autoFocus={isCustomMode || totalRosterStudents === 0}
                autoComplete="name"
              />
              {totalRosterStudents > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(false);
                    setSelectedValue("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "11px",
                    textAlign: "right",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ← Back to Squad List
                </button>
              )}
            </div>
          )}
        </div>

        {/* Squad Preview Card */}
        {parsedMember && (
          <div
            className={styles.teamPreview}
            style={{
              marginTop: "8px",
              border: `1.5px solid ${parsedMember.color}50`,
              background: `${parsedMember.color}12`,
            }}
          >
            <div
              className={styles.teamPreviewDot}
              style={{
                background: parsedMember.color,
                boxShadow: `0 0 10px ${parsedMember.color}`,
              }}
            />
            <div className={styles.teamPreviewInfo}>
              <span className={styles.teamPreviewLabel}>Assigned Squad</span>
              <span
                className={styles.teamPreviewName}
                style={{ color: parsedMember.color }}
              >
                {parsedMember.teamName}
              </span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.joinBtn}
          disabled={!isButtonEnabled || loading}
          onClick={handleJoin}
          style={{
            marginTop: "16px",
            ...(isButtonEnabled && !loading
              ? {
                  background: parsedMember?.color || "var(--command-orange, #FF5D00)",
                  color: "#0f172a",
                  boxShadow: `0 8px 30px ${parsedMember?.color || "rgba(255, 93, 0, 0.35)"}60`,
                  cursor: "pointer",
                }
              : {}),
          }}
        >
          {buttonText}
        </button>
      </form>

      {/* Class badge */}
      <div className={styles.classBadge} style={{ marginTop: "24px" }}>
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
