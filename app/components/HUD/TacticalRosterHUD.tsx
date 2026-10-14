"use client";

import React, { useState, useEffect } from 'react';
import { useClassroomStore } from '@/app/store/useClassroomStore';
import { usePathname } from 'next/navigation';
import styles from './TacticalRosterHUD.module.css';

type HudState = 'retracted' | 'mini' | 'full';

const TEAM_COLORS = ['#00e87a', '#00c8f0', '#ffc843', '#ff4d8f', '#b06eff', '#ff7d3b', '#e2e8f0'];

const HIDDEN_PATHS = ['/login', '/setup', '/mockup'];

export default function TacticalRosterHUD() {
    const pathname = usePathname();
    const { 
        currentTeams, 
        updateTeamScore, 
        updateTeamName, 
        classes, 
        activeClassId 
    } = useClassroomStore();
    
    const [hudState, setHudState] = useState<HudState>('retracted');
    const [isMouseInArea, setIsMouseInArea] = useState(false);
    const [expandedTeams, setExpandedTeams] = useState<string[]>([]);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
    const [floatingPoints, setFloatingPoints] = useState<{ id: number, teamId: string, amount: number }[]>([]);

    // Hide on specific paths
    if (HIDDEN_PATHS.some(path => pathname.startsWith(path))) return null;

    const toggleTeam = (id: string) => {
        if (editingTeamId || editingScoreId) return;
        setExpandedTeams(prev => 
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        );
    };

    const handleManualScore = (teamId: string, delta: number) => {
        updateTeamScore(teamId, delta);
        if (delta > 0) {
            const id = Date.now();
            setFloatingPoints(prev => [...prev, { id, teamId, amount: delta }]);
            setTimeout(() => setFloatingPoints(prev => prev.filter(p => p.id !== id)), 1000);
        }
    };

    const activeClass = classes.find(c => c.id === activeClassId);

    return (
        <div 
            className={styles.sidebar}
            style={{ 
                width: hudState === 'full' ? '320px' : hudState === 'mini' ? '120px' : '0px',
                transform: (isMouseInArea || hudState !== 'retracted') ? 'translateX(0)' : 'translateX(-100%)',
                background: 'rgba(13, 15, 18, 0.75)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                boxShadow: '4px 0 30px rgba(0, 0, 0, 0.5)',
                borderRight: '1px solid rgba(0, 255, 213, 0.15)'
            }}
            onMouseMove={(e) => setIsMouseInArea(e.clientX < 400)}
            onMouseLeave={() => setIsMouseInArea(false)}
        >
            <div 
                className={styles.pullTab} 
                onClick={() => setHudState(hudState === 'retracted' ? 'mini' : hudState === 'mini' ? 'full' : 'retracted')}
                style={{ opacity: (isMouseInArea || hudState !== 'retracted') ? 1 : 0 }}
            >
                <div style={{ 
                    transform: (hudState === 'full') ? 'rotate(180deg)' : 'rotate(0deg)', 
                    transition: '0.4s' 
                }}>
                    ▶
                </div>
            </div>

            <div className={styles.scrollArea}>
                <div style={{ marginBottom: '40px', padding: '0 12px', textAlign: hudState === 'mini' ? 'center' : 'left' }}>
                    <div style={{ fontFamily: 'Syne', fontSize: hudState === 'mini' ? '12px' : '20px', fontWeight: 800, color: 'white' }}>
                        {hudState === 'mini' ? (activeClass?.name.substring(0, 4) || 'ARENA') : (activeClass?.name || 'CLASSROOM ARENA')}
                    </div>
                </div>

                {currentTeams.map((team) => {
                    const isExpanded = expandedTeams.includes(team.id);
                    const color = team.color || '#00FFD5';
                    const xp = team.score % 100; // Local XP logic for visual flair
                    const level = Math.floor(team.score / 100) + 1;

                    return (
                        <div 
                            key={team.id} 
                            className={styles.teamItem} 
                            style={{ borderLeftColor: color, width: hudState === 'mini' ? '96px' : '272px', '--team-color': color } as any}
                            onClick={() => toggleTeam(team.id)}
                        >
                            <div className={styles.teamHeader} style={{ display: hudState === 'full' ? 'flex' : 'none' }}>
                                {editingTeamId === team.id ? (
                                    <input 
                                        className={styles.editInput} 
                                        style={{ '--team-color': color } as any}
                                        value={team.name} 
                                        autoFocus 
                                        onClick={(e) => e.stopPropagation()} 
                                        onChange={(e) => updateTeamName(team.id, e.target.value)} 
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingTeamId(null)} 
                                        onBlur={() => setEditingTeamId(null)} 
                                    />
                                ) : (
                                    <span className={styles.teamName} onDoubleClick={(e) => { e.stopPropagation(); setEditingTeamId(team.id); }}>
                                        {team.name} ✎
                                    </span>
                                )}
                                <span className={styles.lvlBadge} style={{ color }}>LVL {level}</span>
                            </div>

                            <div className={styles.scoreContainer}>
                                {editingScoreId === team.id ? (
                                    <input 
                                        className={styles.editInput} 
                                        type="number"
                                        style={{ '--team-color': color } as any}
                                        value={team.score} 
                                        autoFocus 
                                        onClick={(e) => e.stopPropagation()} 
                                        onChange={(e) => updateTeamScore(team.id, parseInt(e.target.value) - team.score)} 
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingScoreId(null)} 
                                        onBlur={() => setEditingScoreId(null)} 
                                    />
                                ) : (
                                    <div 
                                        className={styles.score} 
                                        style={{ fontSize: hudState === 'full' ? '32px' : '22px', textAlign: hudState === 'mini' ? 'center' : 'left' }}
                                        onDoubleClick={(e) => { e.stopPropagation(); setEditingScoreId(team.id); }}
                                    >
                                        {team.score}
                                    </div>
                                )}
                                <div className={styles.adjusters} onClick={(e) => e.stopPropagation()}>
                                    <button className={styles.adjBtn} style={{ '--team-color': color } as any} onClick={() => handleManualScore(team.id, -10)}>-</button>
                                    <button className={styles.adjBtn} style={{ '--team-color': color } as any} onClick={() => handleManualScore(team.id, 10)}>+</button>
                                </div>
                            </div>

                            <div className={`${styles.roster} ${isExpanded ? styles.rosterExpanded : styles.rosterCollapsed}`} style={{ display: hudState === 'full' ? 'flex' : 'none' }}>
                                {team.students.map(student => (
                                    <div key={student.id} className={styles.studentName}>{student.name}</div>
                                ))}
                            </div>

                            <div className={styles.xpTrack} style={{ display: hudState === 'full' ? 'block' : 'none' }}>
                                <div className={styles.xpFill} style={{ width: `${xp}%`, background: color, boxShadow: `0 0 8px ${color}` }}></div>
                            </div>

                            {floatingPoints.filter(p => p.teamId === team.id).map(p => (
                                <div key={p.id} className={styles.floatPoint} style={{ color }}>+{p.amount}</div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
