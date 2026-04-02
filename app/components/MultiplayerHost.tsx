"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "./MultiplayerHost.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { X, Users, Link2, MonitorPlay } from "lucide-react";

export default function MultiplayerHost({ gameMode }: { gameMode: string }) {
  const { currentTeams, classes, activeClassId } = useClassroomStore();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const startSession = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      const activeClass = classes.find(c => c.id === activeClassId);
      const studentMap = activeClass ? activeClass.students.map(s => ({ id: s.id, name: s.name, type: "student" })) : [];
      const teamMap = currentTeams.map(t => ({ id: t.id, name: t.name, type: "team" }));
      
      const payloadRoster = [...studentMap, ...teamMap];

      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameMode, activeRoster: payloadRoster })
      });
      const data = await res.json();
      if (res.ok) {
        setRoomCode(data.code);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const endSession = async () => {
    if (!roomCode) return setIsOpen(false);
    try {
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode, action: "end_session", payload: {} })
      });
    } catch (e) {
      console.error(e);
    }
    setRoomCode(null);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!roomCode) return;
    const source = new EventSource(`/api/room/stream?code=${roomCode}`);
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.students) {
          setRoster(data.students);
        }
      } catch (err) {}
    };
    return () => source.close();
  }, [roomCode]);

  if (!isOpen) {
    return (
      <button 
         className={styles.triggerBtn} 
         onClick={startSession}
      >
        <MonitorPlay size={20} /> Host Live Multiplayer
      </button>
    );
  }

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?code=${roomCode}` : '';

  return (
    <div className={styles.overlay}>
       <div className={styles.modal}>
          <button className={styles.closeBtn} onClick={endSession}><X /></button>
          
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>Live Session Active</h2>
          
          {loading ? (
             <p>Spinning up Serverless Node...</p>
          ) : (
             <div className={styles.grid}>
                <div className={styles.qrCol}>
                   <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', display: 'inline-block' }}>
                     <QRCodeSVG value={joinUrl} size={200} />
                   </div>
                   <div className={styles.codeBox}>{roomCode}</div>
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
          
          <button className={styles.endBtn} onClick={endSession}>
            End Live Session
          </button>
       </div>
    </div>
  )
}
