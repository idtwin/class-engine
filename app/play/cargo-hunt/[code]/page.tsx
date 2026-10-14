"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { useClassroomStore } from "@/app/store/useClassroomStore";
import styles from "./cargo.module.css";

export default function CargoHuntHUD() {
  const params = useParams();
  const code = params.code as string;
  const [room, setRoom] = useState<any>(null);
  const [currentXp, setCurrentXp] = useState(100);
  const supabase = createClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { currentTeams, updateTeamScore } = useClassroomStore();
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync Supabase room.teams score back to useClassroomStore
  useEffect(() => {
    if (room?.teams && currentTeams && currentTeams.length > 0) {
      room.teams.forEach((rt: any) => {
        const storeTeam = currentTeams.find(t => t.id === rt.id);
        if (storeTeam && rt.score !== undefined) {
          const delta = rt.score - storeTeam.score;
          if (delta !== 0) {
            updateTeamScore(rt.id, delta);
          }
        }
      });
    }
  }, [room?.teams]);


  const syncSquads = async () => {
    if (!currentTeams || currentTeams.length === 0) {
      alert("CRITICAL_ERROR: NO_TEAMS_IN_LOCAL_STORE.\n\nPlease go to SQUAD_OPS and ensure teams are generated.");
      return;
    }
    
    setIsSyncing(true);
    try {
      const res = await fetch("/api/room/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code, 
          action: "sync_teams", 
          payload: { teams: currentTeams } 
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(`SYNC_FAILED: ${err.error || "UNKNOWN_ERROR"}`);
      } else {
        alert("SQUAD_SYNC_SUCCESSFUL. CHECK_PHONE_NOW.");
      }
    } catch (e: any) {
      alert(`SYNC_NETWORK_ERROR: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };


  useEffect(() => {
    const channel = supabase

      .channel(`room_${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_rooms", filter: `code=eq.${code}` },
        (payload: any) => {
          setRoom(payload.new.state);
        }
      )
      .subscribe();

    fetchRoom();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [code]);

  const fetchRoom = async () => {
    const { data } = await supabase
      .from("live_rooms")
      .select("state")
      .eq("code", code)
      .single();
    if (data) setRoom(data.state);
  };

  // XP Decay Logic
  useEffect(() => {
    if (room?.cargoItem && room?.startTime) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - room.startTime) / 1000;
        const decayRate = 1.5; // XP lost per second
        const newXp = Math.max(10, Math.floor(100 - (elapsed * decayRate)));
        setCurrentXp(newXp);
      }, 1000);
    }
  }, [room?.cargoItem, room?.startTime]);

  if (!room) return <div className={styles.loading}>INITIALIZING_SYSTEM...</div>;

  return (
    <div className={styles.arena}>
      <div className={styles.gridOverlay} />
      
      <div className={styles.topBar}>
        <div className={styles.missionInfo}>
          <span className={styles.label}>MISSION_CODE:</span>
          <span className={styles.value}>{code}</span>
        </div>
        <div className={styles.gameTitle}>CARGO_HUNT_v1.0_ALPHA</div>
        <div className={styles.status}>
          <button className={styles.syncBtn} onClick={syncSquads} disabled={isSyncing}>
            {isSyncing ? "SYNCING..." : "SYNC_SQUADS"}
          </button>
          <span className={styles.pulse} /> LIVE_FEED
        </div>
      </div>

      <div className={styles.mainDisplay}>
        <div className={styles.radarContainer}>
          <div className={styles.radarCircle} />
          <div className={styles.radarSweep} />
          <div className={styles.xpRing} style={{ 
            background: `conic-gradient(#ff6600 ${currentXp}%, transparent 0)` 
          }} />
          <div className={styles.xpValue}>
            <div className={styles.xpNumber}>{currentXp}</div>
            <div className={styles.xpLabel}>ESTIMATED_XP</div>
          </div>
        </div>

        <div className={styles.targetCard}>
          <div className={styles.targetLabel}>OBJECTIVE_IDENTIFIED:</div>
          <div className={styles.targetName}>{room.cargoItem || "AWAITING_COMMAND"}</div>
          <div className={styles.targetSubtext}>SEARCH_ZONE: CLASSROOM_ALPHA</div>
        </div>
      </div>

      <div className={styles.squadTrackers}>
        {room.teams?.map((team: any, idx: number) => (
          <div key={team.id} className={styles.squadCard} style={{"--accent": idx === 0 ? "#00f2ff" : "#ff0066"} as any}>
            <div className={styles.squadHeader}>
              <span className={styles.squadName}>{team.name}</span>
              <span className={styles.squadScore}>{team.score || 0}</span>
            </div>
            <div className={styles.squadProgress} />
          </div>
        ))}
        
        {/* Tactical Remote Sync QR */}
        <div className={styles.qrContainer}>
          <div className={styles.qrLabel}>REMOTE_SYNC</div>
          <div className={styles.qrWrapper}>
            <QRCodeSVG 
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/remote?code=${code}`}
              size={110}
              bgColor="transparent"
              fgColor="#ff6600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
