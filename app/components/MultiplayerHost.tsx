"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import styles from "./MultiplayerHost.module.css";
import { useClassroomStore } from "../store/useClassroomStore";
import { X, Users, Link2, MonitorPlay } from "lucide-react";

const TEAM_COLORS = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];

export default function MultiplayerHost({ gameMode, forceShow = false }: { gameMode: string; forceShow?: boolean }) {
  const { currentTeams, classes, activeClassId, activeRoomCode, setActiveRoomCode } = useClassroomStore();
  const searchParams = useSearchParams();
  const urlCode = (searchParams.get("code") || "").trim().toUpperCase();

  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [localIp, setLocalIp] = useState<string>("");

  // Sync room code if present in URL without forcing blocking modal
  useEffect(() => {
    if (urlCode && urlCode.length === 4 && urlCode !== activeRoomCode) {
      setActiveRoomCode(urlCode);
    }
  }, [urlCode, activeRoomCode, setActiveRoomCode]);

  useEffect(() => {
    fetch("/api/network-ip")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ip) setLocalIp(data.ip);
      })
      .catch(() => {});
  }, []);

  const startSession = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      const activeClass = classes.find(c => c.id === activeClassId) || classes[0];
      const studentMap = activeClass ? activeClass.students.map(s => ({
        id: s.id,
        name: s.name,
        class_name: activeClass.name,
        type: "student"
      })) : [];

      let teamsPayload: any[] = [];
      if (currentTeams && currentTeams.length > 0) {
        teamsPayload = currentTeams.map((t, i) => ({
          id: t.id,
          name: t.name,
          color: t.color || TEAM_COLORS[i % TEAM_COLORS.length],
          students: (t.students || []).map(s => ({
            id: s.id,
            name: typeof s === 'string' ? s : s.name
          }))
        }));
      } else if (activeClass && activeClass.students.length > 0) {
        // Fallback: create 4 default squads from students if no teams rolled yet
        const count = 4;
        const generated = Array.from({ length: count }, (_, idx) => ({
          id: `squad_${idx + 1}`,
          name: `SQUAD ${["ALPHA", "BRAVO", "CHARLIE", "DELTA"][idx] || idx + 1}`,
          color: TEAM_COLORS[idx % TEAM_COLORS.length],
          students: [] as { id: string; name: string }[],
        }));
        activeClass.students.forEach((s, idx) => {
          generated[idx % count].students.push({ id: s.id, name: s.name });
        });
        teamsPayload = generated;
      }

      const teamMap = teamsPayload.map(t => ({ id: t.id, name: t.name, type: "team" }));
      const payloadRoster = [...studentMap, ...teamMap];

      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameMode, activeRoster: payloadRoster, teams: teamsPayload })
      });
      const data = await res.json();
      
      if (data?.code) {
        setActiveRoomCode(data.code);
      } else {
        console.warn("[ROOM_CREATE_WARN]", data);
        if (data?.error) {
          alert(`Notice: ${data.error}`);
        }
      }
    } catch (e: any) {
      console.warn("[SESSION_EXCEPTION]", e);
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
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "set_game_mode", payload: { gameMode } })
      });
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "update_status", payload: { status: "playing" } })
      });
      await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeRoomCode, action: "clear_answers", payload: {} })
      });
    } catch (e) {}
    setIsOpen(false);
  };

  // ── Bulletproof Realtime & Polling Presence ──
  useEffect(() => {
    if (!activeRoomCode) return;

    let channel: any = null;
    let pollTimer: any = null;

    // 1. Supabase Realtime Channel (Safely guarded)
    try {
      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();
      const topic = `room_presence_${activeRoomCode}_${Math.random().toString(36).substring(2, 7)}`;
      
      channel = supabase.channel(topic);
      channel
        .on('presence', { event: 'sync' }, () => {
          try {
            const presenceState = channel.presenceState();
            const activeStudents = Object.values(presenceState).flat().map((p: any) => ({
              id: p.user_id || p.id,
              name: p.name,
              online_at: p.online_at
            }));
            if (activeStudents.length > 0) {
              setRoster(prev => {
                const map = new Map<string, any>();
                prev.forEach(item => map.set(item.id || item.name, item));
                activeStudents.forEach(item => map.set(item.id || item.name, item));
                return Array.from(map.values());
              });
            }
          } catch (syncErr) {}
        })
        .subscribe();
    } catch (err) {
      console.warn("[MultiplayerHost] Presence setup warning:", err);
    }

    // 2. Periodic Roster Fetch Fallback
    const fetchRoster = async () => {
      try {
        const res = await fetch(`/api/room/get?code=${activeRoomCode}`);
        if (res.ok) {
          const json = await res.json();
          const state = json.state || json;
          if (state && Array.isArray(state.students)) {
            setRoster(prev => {
              const map = new Map<string, any>();
              prev.forEach(item => map.set(item.id || item.name, item));
              state.students.forEach((item: any) => map.set(item.id || item.name, item));
              return Array.from(map.values());
            });
          }
        }
      } catch (e) {}
    };

    fetchRoster();
    pollTimer = setInterval(fetchRoster, 2000);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (channel) {
        try {
          const { createClient } = require('@/utils/supabase/client');
          createClient().removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [activeRoomCode]);

  if (!isOpen) {
    return (
      <button 
         className={styles.triggerBtn} 
         onClick={() => activeRoomCode ? setIsOpen(true) : startSession()}
      >
        <MonitorPlay size={20} /> {activeRoomCode ? `Room ${activeRoomCode} (${roster.length})` : "Host Live Multiplayer"}
      </button>
    );
  }

  const siteUrl = typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${localIp || 'localhost'}:3000`
        : window.location.origin)
    : 'https://class-engine.vercel.app';
  const joinUrl = `${siteUrl}/join?code=${activeRoomCode}`;

  return (
    <div className={styles.overlay}>
       <div className={styles.modal}>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}><X /></button>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--cyan)', fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Session Active</h2>
          
          {loading ? (
             <p>Spinning up Serverless Node...</p>
          ) : (
             <div className={styles.grid}>
                <div className={styles.qrCol}>
                   <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', display: 'inline-block' }}>
                     <QRCodeSVG value={joinUrl} size={200} />
                   </div>
                   <div className={styles.codeBox}>{activeRoomCode}</div>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.8, fontSize: '12px', fontFamily: "var(--font-mono)" }}>
                     <Link2 size={16} /> <span>{joinUrl.replace('http://', '').replace('https://', '')}</span>
                   </div>
                </div>

                <div className={styles.rosterCol}>
                   <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}><Users size={14} /> Live Roster ({roster.length})</h3>
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
          
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
            <button className={styles.endBtn} onClick={endSession} style={{ flex: 1 }}>
              End Session
            </button>
            <button
              className={styles.endBtn}
              onClick={launchMatch}
              style={{
                flex: 2,
                background: '#00e87a',
                color: '#000',
                border: 'none',
                fontSize: '13px',
              }}
            >
              LAUNCH GAME 🚀
            </button>
          </div>
       </div>
    </div>
  );
}
