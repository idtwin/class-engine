"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './GameLauncherDrawer.module.css';
import { useClassroomStore } from '../store/useClassroomStore';
import { X, Play, Zap, Flame, Target, Trophy, Sparkles, HelpCircle, Layers, Grid, Compass, Radio } from 'lucide-react';

interface GameItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  route: string;
  badge: string;
}

const GAMES: GameItem[] = [
  {
    id: "chain-reaction",
    title: "Chain Reaction",
    desc: "Collaborative word association & connection puzzle arena.",
    icon: "⚡",
    route: "/chain-reaction",
    badge: "RECOMMENDED"
  },
  {
    id: "jeopardy",
    title: "Jeopardy Arena",
    desc: "Classic high-stakes category grid with custom question boards.",
    icon: "🏆",
    route: "/jeopardy",
    badge: "POPULAR"
  },
  {
    id: "rapid-fire",
    title: "Rapid Fire",
    desc: "Fast-paced timed countdown questions for high energy.",
    icon: "🔥",
    route: "/rapid-fire",
    badge: "FAST PACED"
  },
  {
    id: "wheel",
    title: "Wheel of Fortune",
    desc: "Spin the wheel for phrase reveals and mystery point multipliers.",
    icon: "🎡",
    route: "/wheel",
    badge: "ARCADE"
  },
  {
    id: "fix-it",
    title: "Fix It",
    desc: "Grammar & vocabulary error detection and correction.",
    icon: "🛠️",
    route: "/fix-it",
    badge: "SKILL BUILDER"
  },
  {
    id: "odd-one-out",
    title: "Odd One Out",
    desc: "Identify non-matching words and explain logical connections.",
    icon: "🎯",
    route: "/odd-one-out",
    badge: "CRITICAL THINKING"
  },
  {
    id: "wyr",
    title: "Would You Rather",
    desc: "Classroom debate and opinion justification game.",
    icon: "🤔",
    route: "/wyr",
    badge: "DEBATE"
  },
  {
    id: "story",
    title: "Story Generator",
    desc: "Collaborative narrative building with random prompts.",
    icon: "📖",
    route: "/story",
    badge: "CREATIVE"
  },
  {
    id: "reveal",
    title: "Mystery Reveal",
    desc: "Tile-by-tile image & prompt reveal guesser.",
    icon: "🖼️",
    route: "/reveal",
    badge: "VISUAL"
  },
  {
    id: "cargo-hunt",
    title: "Cargo Hunt",
    desc: "Multiplayer phone controller supply drop hunt.",
    icon: "📦",
    route: "/cargo-hunt",
    badge: "MULTIPLAYER"
  },
  {
    id: "hotseat",
    title: "Hotseat",
    desc: "Front-of-class fast descriptor guessing.",
    icon: "🪑",
    route: "/hotseat",
    badge: "INTERACTIVE"
  }
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GameLauncherDrawer({ open, onClose }: Props) {
  const router = useRouter();
  const { currentTeams, classes, activeClassId, setActiveRoomCode } = useClassroomStore();
  const [isLaunching, setIsLaunching] = useState(false);

  if (!open) return null;

  const handleLaunch = async (game: GameItem) => {
    setIsLaunching(true);
    try {
      const activeClass = classes.find(c => c.id === activeClassId) || classes[0];
      const studentMap = activeClass ? activeClass.students.map(s => ({
        id: s.id,
        name: s.name,
        class_name: activeClass.name,
        type: "student"
      })) : [];

      const colors = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];
      const teamsPayload = (currentTeams.length > 0 ? currentTeams : []).map((t, i) => ({
        id: t.id,
        name: t.name,
        color: t.color || colors[i % colors.length],
        students: (t.students || []).map(s => ({
          id: s.id,
          name: typeof s === 'string' ? s : s.name
        }))
      }));

      const teamMap = currentTeams.map(t => ({ id: t.id, name: t.name, type: "team" }));
      const payloadRoster = [...studentMap, ...teamMap];

      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameMode: game.id,
          activeRoster: payloadRoster,
          teams: teamsPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.code) {
          setActiveRoomCode(data.code);
          onClose();
          router.push(`${game.route}?code=${data.code}`);
          return;
        }
      }
    } catch (e) {
      console.warn("[GameLauncherDrawer] Auto-room create warn:", e);
    } finally {
      setIsLaunching(false);
    }

    // Direct fallback navigation
    onClose();
    router.push(game.route);
  };


  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>SELECT ARENA GAME</h2>
            <div className={styles.subtitle}>SQUADS ARE LOCKED & READY FOR DEPLOYMENT</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.gameList}>
          {GAMES.map((game) => (
            <div
              key={game.id}
              className={styles.gameCard}
              onClick={() => handleLaunch(game)}
            >
              <div className={styles.gameIcon}>{game.icon}</div>
              <div className={styles.gameInfo}>
                <div className={styles.gameTitle}>{game.title}</div>
                <div className={styles.gameDesc}>{game.desc}</div>
                <div className={styles.gameMeta}>
                  <Zap size={12} /> {game.badge}
                </div>
              </div>
              <div className={styles.launchIcon}>
                <Play size={20} fill="#00FFD5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
