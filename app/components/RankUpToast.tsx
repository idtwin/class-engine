"use client";

import { useEffect, useState, useRef } from "react";
import { useClassroomStore } from "../store/useClassroomStore";
import RankIcon from "./RankIcon";
import { getRankForXp } from "@/utils/ranks";
import type { RankInfo } from "@/utils/ranks";

interface RankUpEvent {
  id: string;
  studentName: string;
  newRank: RankInfo;
  prevRank: RankInfo;
}

/**
 * RankUpToast — mounts globally, watches the Zustand store for XP changes
 * that cross a rank threshold and plays a cinematic overlay card.
 */
export default function RankUpToast() {
  const [events, setEvents] = useState<RankUpEvent[]>([]);
  const prevXpMapRef = useRef<Record<string, { xp: number; rank: number; tier: string }>>({});

  const { classes, activeClassId } = useClassroomStore();

  useEffect(() => {
    const activeClass = classes.find((c) => c.id === activeClassId);
    if (!activeClass) return;

    activeClass.students.forEach((s) => {
      const prev = prevXpMapRef.current[s.id];
      const currentXp = s.xp ?? 0;

      if (prev) {
        const prevRankInfo = getRankForXp(prev.xp);
        const currRankInfo = getRankForXp(currentXp);

        // Rank-up detected: either tier or stars increased
        const rankChanged =
          currRankInfo.tier !== prevRankInfo.tier ||
          currRankInfo.stars !== prevRankInfo.stars;
        const xpIncreased = currentXp > prev.xp;

        if (rankChanged && xpIncreased) {
          const eventId = `${s.id}-${Date.now()}`;
          setEvents((prev) => [
            ...prev,
            {
              id: eventId,
              studentName: s.name,
              newRank: currRankInfo,
              prevRank: prevRankInfo,
            },
          ]);

          // Auto-dismiss after 4.5s
          setTimeout(() => {
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
          }, 4500);
        }
      }

      prevXpMapRef.current[s.id] = {
        xp: currentXp,
        rank: s.rank,
        tier: s.tier,
      };
    });
  }, [classes, activeClassId]);

  if (events.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "120px", // above ScoreboardOverlay
      right: "32px",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      pointerEvents: "none",
    }}>
      {events.map((ev) => (
        <RankUpCard key={ev.id} event={ev} />
      ))}
    </div>
  );
}

function RankUpCard({ event }: { event: RankUpEvent }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay for mount animation
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const tierColors: Record<string, string> = {
    Bronze: "#cd7f32",
    Silver: "#e2e8f0",
    Gold: "#ffc843",
    Platinum: "#b06eff",
  };
  const color = tierColors[event.newRank.tier] ?? "#00c8f0";

  return (
    <div style={{
      width: "320px",
      background: "rgba(7, 9, 15, 0.97)",
      border: `1px solid ${color}`,
      boxShadow: `0 0 40px ${color}55, 0 20px 60px rgba(0,0,0,0.8)`,
      padding: "0",
      overflow: "hidden",
      transform: visible ? "translateX(0) scale(1)" : "translateX(60px) scale(0.92)",
      opacity: visible ? 1 : 0,
      transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
      pointerEvents: "none",
      fontFamily: "var(--font-main, Syne), sans-serif",
    }}>
      {/* Top accent bar */}
      <div style={{
        height: "3px",
        background: `linear-gradient(90deg, ${color}, transparent)`,
        boxShadow: `0 0 12px ${color}`,
      }} />

      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Rank badge */}
        <div style={{
          width: "60px",
          height: "60px",
          flexShrink: 0,
          animation: "rankUpSpin 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          <RankIcon tier={event.newRank.tier} stars={event.newRank.stars} size={60} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* RANK UP label */}
          <div style={{
            fontFamily: "var(--font-mono, JetBrains Mono), monospace",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color,
            textTransform: "uppercase",
            marginBottom: "4px",
            animation: "rankUpPulse 1s ease-in-out infinite",
          }}>
            ⚡ RANK UP
          </div>

          {/* Student name */}
          <div style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "#dce8f5",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {event.studentName}
          </div>

          {/* Rank progression */}
          <div style={{
            fontFamily: "var(--font-mono, JetBrains Mono), monospace",
            fontSize: "10px",
            color: "rgba(220,232,245,0.5)",
            marginTop: "4px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            <span style={{ textDecoration: "line-through", opacity: 0.5 }}>
              {event.prevRank.label}
            </span>
            <span style={{ color, fontSize: "12px" }}>→</span>
            <span style={{ color, fontWeight: 700 }}>{event.newRank.label}</span>
          </div>
        </div>
      </div>

      {/* Progress bar fill animation */}
      <div style={{
        height: "2px",
        background: `rgba(255,255,255,0.05)`,
        margin: "0 20px 16px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          background: color,
          animation: "rankUpFill 4s linear forwards",
          width: "0%",
        }} />
      </div>

      <style>{`
        @keyframes rankUpSpin {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes rankUpPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes rankUpFill {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
