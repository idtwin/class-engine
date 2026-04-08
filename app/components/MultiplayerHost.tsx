"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "./MultiplayerHost.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { X, Users, Link2, MonitorPlay } from "lucide-react";

export default function MultiplayerHost({ gameMode }: { gameMode: string }) {
  const { currentTeams, classes, activeClassId, activeRoomCode, setActiveRoomCode, playMode } = useClassroomStore();
  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // In projector mode, hide the entire multiplayer UI
  if (playMode === 'projector') return null;

  const startSession = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      const activeClass = classes.find(c => c.id === activeClassId);
      const studentMap = activeClass ? activeClass.students.map(s => ({ id: s.id, name: s.name, type: "student" })) : [];
      const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4"];
      const teamsPayload = currentTeams.map((t, i) => ({
         id: t.id,
         name: t.name,
         color: colors[i % colors.length],
         students: t.students.map(s => ({ id: s.id, name: s.name }))
      }));
      
      const teamMap = currentTeams.map(t => ({ id: t.id, name: t.name, type: "team" }));

      const payloadRoster = [...studentMap, ...teamMap]; // kept for backwards compat backwards selection

      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameMode, activeRoster: payloadRoster, teams: teamsPayload })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRoomCode(data.code);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const endSession = async () => {
    if (!activeRoomCode) return setIsOpen(false);
    try {
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "end_session", payload: {} })
      });
    } catch (e) {
      console.error(e);
    }
    setActiveRoomCode(null);
    setIsOpen(false);
  };

  const launchMatch = async () => {
    if (!activeRoomCode) return;
    try {
      // Update gameMode first so phones switch to the correct controller
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "set_game_mode", payload: { gameMode } })
      });
      // Then set status to playing
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "update_status", payload: { status: "playing" } })
      });
      // Clear any stale answers/buzzes from previous game
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
      });
    } catch (e) {}
    setIsOpen(false);
  };

  // Poll room state every 1.5s instead of SSE — reliable on Vercel
  useEffect(() => {
    if (!activeRoomCode) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.students) {
            setRoster(data.students);
          }
        }
      } catch (err) {}
    };

    poll(); // immediate
    const intervalId = setInterval(poll, 1500);
    return () => clearInterval(intervalId);
  }, [activeRoomCode]);

  if (!isOpen) {
    return (
      <button 
         className={styles.triggerBtn} 
         onClick={() => activeRoomCode ? setIsOpen(true) : startSession()}
      >
        <MonitorPlay size={20} /> {activeRoomCode ? `Live Roster: ${roster.length}` : "Host Live Multiplayer"}
      </button>
    );
  }

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const siteUrl = isLocal ? 'https://class-engine.vercel.app' : (typeof window !== 'undefined' ? window.location.origin : '');
  const joinUrl = `${siteUrl}/join?code=${activeRoomCode}`;

  return (
    <div className={styles.overlay}>
       <div className={styles.modal}>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}><X /></button>
          
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>Live Session Active</h2>
          
          {loading ? (
             <p>Spinning up Serverless Node...</p>
          ) : (
             <div className={styles.grid}>
                <div className={styles.qrCol}>
                   <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', display: 'inline-block' }}>
                     <QRCodeSVG value={joinUrl} size={200} />
                   </div>
                   <div className={styles.codeBox}>{activeRoomCode}</div>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.7 }}>
                     <Link2 size={16} /> <span>{joinUrl.replace('http://', '').replace('https://', '')}</span>
                   </div>
                </div>

                <div className={styles.rosterCol}>
                   <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Users /> Live Roster ({roster.length})</h3>
                   <div className={styles.rosterList}>
                      {roster.map((s, i) => (
                        <div key={i} className={styles.rosterItem}>
                          <div className={styles.statusDot} />
                          {s.name}
                        </div>
                      ))}
                      {roster.length === 0 && (
                         <div style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>Waiting for connections...</div>
                      )}
                   </div>
                </div>
             </div>
          )}
          
          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            <button className={styles.endBtn} onClick={endSession} style={{ flex: 1 }}>
              End Session
            </button>
            <button className={styles.endBtn} onClick={launchMatch} style={{ flex: 2, background: 'var(--accent)', color: 'black' }}>
              LAUNCH GAME 🚀
            </button>
          </div>
       </div>
    </div>
  )
}
