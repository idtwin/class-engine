"use client";

import React, { useState } from 'react';

interface Student {
    name: string;
    role: 'CAPTAIN' | 'ANALYST' | 'SCOUT' | 'DEFENDER';
    xp: number;
}

interface Team {
    name: string;
    score: number;
    color: string;
    crestUrl: string;
    students: Student[];
    level: number;
    osr: number;
    isLeader: boolean;
}

const INITIAL_TEAMS: Team[] = [
    { 
        name: 'ALPHA SQUAD', score: 1240, color: '#00FFD5', isLeader: false,
        crestUrl: '/squad_alpha_crest_1776949168354.png',
        students: [
            { name: 'John Doe', role: 'CAPTAIN', xp: 850 },
            { name: 'Jane Smith', role: 'SCOUT', xp: 420 },
            { name: 'Mike Ross', role: 'ANALYST', xp: 120 }
        ], level: 4, osr: 88 
    },
    { 
        name: 'BRAVO UNIT', score: 980, color: '#FF3131', isLeader: false,
        crestUrl: '/squad_bravo_crest_1776949187121.png',
        students: [
            { name: 'Sarah Connor', role: 'DEFENDER', xp: 330 },
            { name: 'Kyle Reese', role: 'CAPTAIN', xp: 610 }
        ], level: 3, osr: 72 
    },
    { 
        name: 'CHARLIE TEAM', score: 1500, color: '#00B2FF', isLeader: true,
        crestUrl: '/squad_charlie_crest_1776949207103.png',
        students: [
            { name: 'Ibrahim Khalil', role: 'CAPTAIN', xp: 900 },
            { name: 'Maryam Rashid', role: 'ANALYST', xp: 450 },
            { name: 'Khaled Aziz', role: 'SCOUT', xp: 300 }
        ], level: 5, osr: 91 
    },
    { 
        name: 'DELTA STRIKE', score: 720, color: '#FFD700', isLeader: false,
        crestUrl: '/squad_delta_crest_1776949227183.png',
        students: [
            { name: 'Arthur Dent', role: 'SCOUT', xp: 210 },
            { name: 'Ford Prefect', role: 'DEFENDER', xp: 150 }
        ], level: 2, osr: 65 
    },
];

export default function ArenaLeagueSandbox() {
  const [teams] = useState(INITIAL_TEAMS);

  return (
    <div style={{ background: '#05070A', minHeight: '100vh', overflow: 'hidden', color: 'white', fontFamily: 'JetBrains Mono', position: 'relative' }}>
      {/* Background Graphic */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url("/arena_tactical_bg_1776948251796.png")', backgroundSize: 'cover', opacity: 0.1, pointerEvents: 'none', zIndex: 0 }}></div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Syne:wght@700;800&display=swap');
        
        :root {
            --cyan: #00FFD5;
            --magenta: #ff2e88;
            --gold: #FFD700;
            --border: rgba(0, 255, 213, 0.2);
        }

        .main-layout {
            display: grid;
            grid-template-columns: 380px 1fr 380px;
            height: 100vh;
            padding-top: 80px;
            z-index: 1;
            position: relative;
        }

        .column {
            padding: 30px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 40px;
            border-right: 1px solid var(--border);
        }

        .section-title {
            font-family: 'Syne'; font-size: 11px; letter-spacing: 4px; color: var(--cyan);
            margin-bottom: 25px; display: flex; align-items: center; gap: 10px;
        }
        .section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

        .role-icon {
            font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 2px;
            margin-right: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
        }

        .trophy-container {
            background: radial-gradient(circle at center, rgba(0, 255, 213, 0.1), transparent);
            border: 1px solid var(--border);
            padding: 40px; text-align: center; position: relative;
            backdrop-filter: blur(20px);
            box-shadow: inset 0 0 50px rgba(0, 255, 213, 0.05);
        }

        .trophy-img {
            width: 180px; margin: 0 auto;
            filter: drop-shadow(0 0 20px var(--gold));
            animation: float 4s ease-in-out infinite, flicker 5s linear infinite;
            mix-blend-mode: screen;
        }

        @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(2deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }

        @keyframes flicker {
            0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
            20%, 24%, 55% { opacity: 0.8; }
        }

        .hype-box {
            background: linear-gradient(to bottom, rgba(255, 46, 136, 0.1), transparent);
            border-left: 3px solid var(--magenta);
            padding: 20px; font-style: italic; font-size: 13px; line-height: 1.6;
        }

        .point-pill {
            font-size: 10px; padding: 4px 10px; background: rgba(0,0,0,0.4); border: 1px solid var(--border);
            color: var(--cyan); border-radius: 10px;
        }

        .crest-container {
            position: relative;
            width: 60px; height: 60px;
            display: flex; align-items: center; justify-content: center;
            border: 1px solid rgba(255,255,255,0.05);
            background: rgba(0,0,0,0.2);
        }

        .crest-img {
            width: 80%; height: 80%; 
            filter: drop-shadow(0 0 8px var(--team-color));
            z-index: 2;
            mask-image: radial-gradient(circle, black 60%, transparent 100%);
            mix-blend-mode: screen;
        }

        .crest-bracket {
            position: absolute; width: 8px; height: 8px;
            border: 1px solid var(--team-color); opacity: 0.5;
        }
        .cb-tl { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
        .cb-tr { top: -2px; right: -2px; border-left: 0; border-bottom: 0; }
        .cb-bl { bottom: -2px; left: -2px; border-right: 0; border-top: 0; }
        .cb-br { bottom: -2px; right: -2px; border-left: 0; border-top: 0; }

        .finalize-btn {
            margin-top: auto;
            background: transparent;
            border: 1px solid var(--border);
            color: var(--cyan);
            padding: 15px;
            font-family: 'Syne';
            font-weight: 800;
            font-size: 11px;
            letter-spacing: 3px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .finalize-btn:hover {
            background: rgba(0, 255, 213, 0.05);
            border-color: var(--cyan);
            color: white;
            box-shadow: 0 0 20px rgba(0, 255, 213, 0.1);
        }

        .finalize-btn::before {
            content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 255, 213, 0.2), transparent);
            transition: 0.5s;
        }
        .finalize-btn:hover::before { left: 100%; }
      `}</style>

      {/* TOP NAV */}
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '80px', background: 'rgba(5, 7, 10, 0.95)', borderBottom: '1px solid var(--border)', zIndex: 1100, display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Syne', fontSize: '16px', letterSpacing: '5px' }}>ARENA_LEAGUE // SEASON_01_DAY_08</div>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 20px', border: '1px solid var(--border)', fontSize: '10px', letterSpacing: '2px' }}>SEASON_LOCK: 06D 14H 22M</div>
      </header>

      <div className="main-layout">
        {/* LEFT COLUMN: SQUAD INTEL & ROLES */}
        <div className="column">
            <div>
                <div className="section-title">SQUAD_HERALDRY</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {teams.map(team => (
                        <div key={team.name} style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                                <div className="crest-container" style={{ '--team-color': team.color } as any}>
                                    <div className="crest-bracket cb-tl"></div>
                                    <div className="crest-bracket cb-tr"></div>
                                    <div className="crest-bracket cb-bl"></div>
                                    <div className="crest-bracket cb-br"></div>
                                    <img src={team.crestUrl} className="crest-img" alt={team.name} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: team.color }}>{team.name}</div>
                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>OSR: {team.osr} // LVL: {team.level}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {team.students.map(s => (
                                    <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                        <span><span className="role-icon" style={{ color: team.color }}>{s.role}</span> {s.name}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>{s.xp} XP</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* CENTER COLUMN: THE TROPHY ROOM & STANDINGS */}
        <div className="column" style={{ borderRight: 'none', padding: '40px' }}>
            <div className="trophy-container">
                <div style={{ fontSize: '10px', letterSpacing: '8px', color: 'var(--gold)', marginBottom: '20px' }}>SEASON_LEADING_SQUAD</div>
                <img src="/arena_trophy_gold_1776948914488.png" className="trophy-img" alt="Trophy" />
                <div style={{ fontFamily: 'Syne', fontSize: '32px', color: 'white', marginTop: '20px' }}>CHARLIE TEAM</div>
                <div style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '5px' }}>RANK #1 // PRESTIGE_TIER</div>
            </div>

            <div style={{ marginTop: '40px' }}>
                <div className="section-title">TOURNAMENT_STANDINGS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[...teams].sort((a,b) => b.score - a.score).map((team, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <img src={team.crestUrl} style={{ width: '30px', height: '30px' }} alt="" />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 800 }}>{team.name}</div>
                                <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', marginTop: '4px', width: '100%' }}>
                                    <div style={{ height: '100%', background: team.color, width: `${(team.score/2000)*100}%` }}></div>
                                </div>
                            </div>
                            <div className="point-pill">+{400 - (i * 100)} PTS</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: HYPE-MAN RECAP & LOGS */}
        <div className="column" style={{ borderRight: 'none', background: 'rgba(5, 7, 10, 0.8)' }}>
            <div>
                <div className="section-title">AI_HYPE_RECAP</div>
                <div className="hype-box">
                    "Listen up OPERATIVES! SQUAD CHARLIE is dominating the rankings, but SQUAD BRAVO just closed the gap with that last performance! <span style={{ color: 'var(--magenta)' }}>KYLE REESE</span>—your leadership today as Captain was critical. SQUAD ALPHA, your Scout is carrying the team! 6 days left. SECURE YOUR LEGACY!"
                </div>
            </div>

            <div>
                <div className="section-title">ACTIVITY_LOG</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>19:42 // MATCH_ENDED // ALPHA_VICTORY</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>19:15 // GAME_SYNC // HOT_SEAT_ALPHA</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>18:50 // SESSION_INIT // ARENA_ONLINE</div>
                </div>
            </div>

            <button className="finalize-btn">
                <span style={{ opacity: 0.5 }}>[</span>
                FINALIZE_MATCH_DATA
                <span style={{ opacity: 0.5 }}>]</span>
            </button>
        </div>
      </div>
    </div>
  );
}
