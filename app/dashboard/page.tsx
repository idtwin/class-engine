"use client";

import React, { useState, useMemo, useEffect } from "react";
import styles from "./dashboard.module.css";
import { useClassroomStore, SessionEntry, ClassData, Student } from "../store/useClassroomStore";
import RankIcon from "../components/RankIcon";
import Link from "next/link";
import { getRankForXp } from "@/utils/ranks";

const MOCK_TIME_RANGES = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

export default function Dashboard() {
  const {
    classes,
    sessionHistory,
    removeClass
  } = useClassroomStore();

  const [activeDrillId, setActiveDrillId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("month");
  const [mounted, setMounted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isGlobalLeaderboard, setIsGlobalLeaderboard] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Leaderboard
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoadingLeaderboard(true);
      try {
        const activeClass = classes.find((c) => c.id === activeDrillId);
        const url = isGlobalLeaderboard 
          ? '/api/xp/leaderboard?limit=5' 
          : `/api/xp/leaderboard?limit=5&class_name=${encodeURIComponent(activeClass?.name || '')}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
          // Reconcile with local names
          const reconciled = data.leaderboard.map((entry: any) => {
            const student = classes
              .flatMap(c => c.students)
              .find(s => s.id === entry.student_id);
            
            return {
              ...entry,
              name: student?.name || `OPERATIVE ${entry.student_id.slice(0, 4)}`,
              gender: student?.gender || 'male',
              tier: student?.tier || getRankForXp(entry.total_xp).tier,
              rank: student?.rank || getRankForXp(entry.total_xp).stars
            };
          });
          setLeaderboard(reconciled);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoadingLeaderboard(false);
      }
    }
    
    if (mounted) fetchLeaderboard();
  }, [mounted, isGlobalLeaderboard, activeDrillId, classes]);

  // --- Selectors ---
  
  const filteredHistory = useMemo(() => {
    // Basic time filtering logic (simplified for demo)
    return sessionHistory;
  }, [sessionHistory]);

  const activeClass = useMemo(() => 
    classes.find(c => c.id === activeDrillId) || classes[0], 
  [classes, activeDrillId]);

  const overallStats = useMemo(() => {
    if (filteredHistory.length === 0) return { sessions: 0, acc: 0, topGame: "N/A", mostActive: "N/A" };
    
    const totalAcc = filteredHistory.reduce((acc, s) => acc + s.accuracy, 0);
    const gameCounts = filteredHistory.reduce((acc, s) => {
      acc[s.gameType] = (acc[s.gameType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const classCounts = filteredHistory.reduce((acc, s) => {
      acc[s.classId] = (acc[s.classId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topGame = Object.entries(gameCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || "N/A";
    const mostActiveId = Object.entries(classCounts).sort((a,b) => b[1] - a[1])[0]?.[0];
    const mostActiveName = classes.find(c => c.id === mostActiveId)?.name || "N/A";

    return {
      sessions: filteredHistory.length,
      acc: Math.round(totalAcc / filteredHistory.length),
      topGame,
      mostActive: mostActiveName
    };
  }, [filteredHistory, classes]);

  const classCards = useMemo(() => {
    return classes.map(c => {
      const history = filteredHistory.filter(s => s.classId === c.id);
      const acc = history.length ? Math.round(history.reduce((a,b) => a + b.accuracy, 0) / history.length) : 0;
      const energy = history.length ? Math.round(history.reduce((a,b) => a + b.energy, 0) / history.length) : 0;
      
      return {
        ...c,
        sessionCount: history.length,
        avgAcc: acc,
        avgEnergy: energy > 80 ? "High" : energy > 50 ? "Mid" : "Low",
        trend: acc > 70 ? "Improving" : "Stable"
      };
    });
  }, [classes, filteredHistory]);

  const drillStats = useMemo(() => {
    if (!activeClass) return [];
    const history = filteredHistory.filter(s => s.classId === activeClass.id);
    const gameGroups = history.reduce((acc, s) => {
      acc[s.gameType] = acc[s.gameType] || { count: 0, totalAcc: 0, totalEnergy: 0 };
      acc[s.gameType].count++;
      acc[s.gameType].totalAcc += s.accuracy;
      acc[s.gameType].totalEnergy += s.energy;
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(gameGroups).map(([name, data]: [string, any]) => ({
      name,
      count: data.count,
      acc: Math.round(data.totalAcc / data.count),
      energy: Math.round(data.totalEnergy / data.count)
    })).sort((a,b) => b.acc - a.acc);
  }, [activeClass, filteredHistory]);

  return (
    <div className={styles.page}>
      <div className={styles.headerBanner} />
      {/* Header */}
      <div className={styles.pageHeader}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className={styles.breadcrumb}>SYSTEM // <span>Analytics</span></div>
          <h1 className={styles.headerTitle}>Commander Dashboard</h1>
        </div>
        <div className={styles.headerControls} style={{ position: 'relative', zIndex: 2 }}>
          <select 
            className={styles.timeSelect} 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
          >
            {MOCK_TIME_RANGES.map(range => (
              <option key={range.id} value={range.id}>{range.label}</option>
            ))}
          </select>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => window.print()}>↓ Report</button>
        </div>
      </div>

      <div className={styles.view}>
        {/* Overview Stats */}
        <div className={styles.sectionTitle}>Global Intelligence — {MOCK_TIME_RANGES.find(r => r.id === timeRange)?.label}</div>
      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewCardGlow} style={{ background: "var(--cyan)" }}></div>
          <div className={styles.overviewLabel}>Sessions Played</div>
          <div className={styles.overviewVal} style={{ color: "var(--cyan)" }}>{overallStats.sessions}</div>
          <div className={styles.overviewSub}>Live tracking active</div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewCardGlow} style={{ background: "var(--green)" }}></div>
          <div className={styles.overviewLabel}>Avg Confidence</div>
          <div className={styles.overviewVal} style={{ color: "var(--green)" }}>{overallStats.acc}%</div>
          <div className={styles.overviewSub}>Across all modules</div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewCardGlow} style={{ background: "var(--yellow)" }}></div>
          <div className={styles.overviewLabel}>Preferred Engine</div>
          <div className={styles.overviewVal} style={{ color: "var(--yellow)", fontSize: "20px" }}>{overallStats.topGame}</div>
          <div className={styles.overviewSub}>Highest deployment rate</div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewCardGlow} style={{ background: "var(--purple)" }}></div>
          <div className={styles.overviewLabel}>Peak Performance</div>
          <div className={styles.overviewVal} style={{ color: "var(--purple)", fontSize: "20px" }}>{overallStats.mostActive}</div>
          <div className={styles.overviewSub}>Highest engagement</div>
        </div>
      </div>

      {/* Classes Overview */}
      <div className={styles.sectionTitle}>Active Command Clusters</div>
      <div className={styles.classOverviewGrid}>
        {classCards.slice(0, 3).map(card => (
          <div 
            key={card.id} 
            className={`${styles.classCard} ${activeDrillId === card.id ? styles.classCardActive : ""}`} 
            onClick={() => setActiveDrillId(card.id)}
          >
            <div className={styles.classCardHeader}>
              <div>
                <div className={styles.className}>{card.name}</div>
                <div className={styles.classMeta}>{card.students.length} students · {card.category}</div>
              </div>
              <div className={styles.classTrendBadge} style={{ 
                background: card.trend === "Improving" ? "rgba(0,232,122,0.1)" : "rgba(255,200,67,0.1)", 
                color: card.trend === "Improving" ? "var(--green)" : "var(--yellow)" 
              }}>
                {card.trend}
              </div>
            </div>
            <div className={styles.classCardBody}>
              <div className={styles.classStatsRow}>
                <div className={styles.classStat}>
                  <div className={styles.classStatVal} style={{ color: "var(--cyan)" }}>{card.sessionCount}</div>
                  <div className={styles.classStatLabel}>Cycles</div>
                </div>
                <div className={styles.classStat}>
                  <div className={styles.classStatVal} style={{ color: "var(--green)" }}>{card.avgAcc}%</div>
                  <div className={styles.classStatLabel}>Sync</div>
                </div>
                <div className={styles.classStat}>
                  <div className={styles.classStatVal} style={{ color: "var(--orange)" }}>{card.avgEnergy}</div>
                  <div className={styles.classStatLabel}>Output</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drill Down */}
      {activeClass && (
        <>
          <div className={styles.sectionTitle}>Drill Down — {activeClass.name}</div>
          <div className={styles.drillPanel}>
            <div className={styles.drillHeader}>
              <div>
                <div className={styles.drillTitle}>{activeClass.name} Performance matrix</div>
                <div className={styles.drillSub}>{activeClass.students.length} Students · Cycle Analysis</div>
              </div>
            </div>
            <div className={styles.drillBody}>
              <div className={styles.chartWrap}>
                <div className={styles.chartTitle}>Sync rate by System</div>
                <div className={styles.barChart}>
                  {drillStats.length > 0 ? drillStats.slice(0, 6).map((bar, i) => (
                    <div key={bar.name} className={styles.barCol}>
                      <div className={styles.barVal}>{bar.acc}%</div>
                      <div 
                        className={styles.barFill} 
                        style={{ height: `${bar.acc}%`, background: `var(--t${i+1})` }}
                      ></div>
                      <div className={styles.barLabel}>{bar.name}</div>
                    </div>
                  )) : (
                    <div className={styles.aiText} style={{ padding: "40px", textAlign: "center", width: "100%" }}>
                      No session data found for this class. Select another cluster or seed demo data.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div className={styles.chartTitle}>Top Performers (System Sync)</div>
                <table className={styles.gameTable}>
                  <thead>
                    <tr><th>Identity</th><th>Cycles</th><th>Parity</th></tr>
                  </thead>
                  <tbody>
                    {activeClass.students.slice(0, 5).map((s, i) => (
                      <tr key={s.id}>
                        <td>
                            <Link href={`/profile/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                            <div className={styles.tableAvatar}>
                              <img 
                                src={s.gender === 'female' ? '/images/avatar_girl.png' : '/images/avatar_boy.png'} 
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              </div>
                            <span style={{ fontWeight: 700 }}>{s.name}</span>
                            </Link>
                        </td>
                        <td style={{ color: "var(--muted)" }}>
                          {mounted ? Math.floor(Math.random() * 10) + 5 : "--"} Cycles
                        </td>
                        <td>
                          <span style={{ color: "var(--green)", fontWeight: 700 }}>
                            {mounted ? 80 + Math.floor(Math.random() * 15) : "--"}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Hall of Fame / Leaderboard Section */}
          <div className={styles.sectionTitle}>
            Strategic Hall of Fame — {isGlobalLeaderboard ? "Global Rankings" : `Top in ${activeClass.name}`}
          </div>
          <div className={styles.leaderboardContainer}>
            <div className={styles.leaderboardHeader}>
              <div className={styles.leaderboardIcon}>🏆</div>
              <div style={{ flex: 1 }}>
                <div className={styles.leaderboardTitle}>Top Performers</div>
                <div className={styles.leaderboardSub}>Aggregated XP metrics from current deployment cycles</div>
              </div>
              <div className={styles.toggleWrap}>
                <button 
                  className={`${styles.toggleBtn} ${isGlobalLeaderboard ? styles.toggleBtnActive : ""}`}
                  onClick={() => setIsGlobalLeaderboard(true)}
                >
                  GLOBAL
                </button>
                <button 
                  className={`${styles.toggleBtn} ${!isGlobalLeaderboard ? styles.toggleBtnActive : ""}`}
                  onClick={() => setIsGlobalLeaderboard(false)}
                >
                  CLUSTER
                </button>
              </div>
            </div>

            <div className={styles.leaderboardGrid}>
              {loadingLeaderboard ? (
                <div className={styles.loadingPulse}>Acquiring signal...</div>
              ) : leaderboard.length === 0 ? (
                <div className={styles.emptyLeaderboard}>Awaiting deployment data...</div>
              ) : (
                leaderboard.map((entry, index) => (
                  <Link 
                    key={entry.student_id} 
                    href={`/profile/${entry.student_id}`}
                    className={styles.leaderboardRow}
                  >
                    <div className={styles.leaderboardRank}>
                      {index === 0 ? "➊" : index === 1 ? "➋" : index === 2 ? "➌" : (index + 1)}
                    </div>
                    <div className={styles.leaderboardAvatar}>
                      <img 
                        src={entry.gender === 'female' ? '/images/avatar_girl.png' : '/images/avatar_boy.png'} 
                        alt=""
                      />
                    </div>
                    <div className={styles.leaderboardInfo}>
                      <div className={styles.leaderboardName}>{entry.name}</div>
                      <div className={styles.leaderboardClass}>{entry.class_name}</div>
                    </div>
                    <div className={styles.leaderboardBadge}>
                      <RankIcon tier={entry.tier} stars={entry.rank} size={28} />
                    </div>
                    <div className={styles.leaderboardXp}>
                      <div className={styles.xpVal}>{(entry.total_xp || 0).toLocaleString()}</div>
                      <div className={styles.xpLabel}>XP</div>
                    </div>
                    <div 
                      className={styles.leaderboardProgressBar} 
                      style={{ 
                        "--progress": `${Math.min(100, (entry.total_xp / (leaderboard[0]?.total_xp || 1)) * 100)}%`,
                        "--color": index === 0 ? "var(--team-green)" : index === 1 ? "var(--cyan)" : index === 2 ? "var(--yellow)" : "rgba(255,255,255,0.2)"
                      } as any}
                    />
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Session Journal */}
      <div className={styles.sectionTitle}>Neural Log — All Clusters</div>
      <div className={styles.journalList}>
        <div className={`${styles.journalRow} ${styles.journalRowHeader}`}>
          <div className={styles.journalHeaderLabel}>System</div>
          <div className={styles.journalHeaderLabel}>Cluster</div>
          <div className={styles.journalHeaderLabel}>Date</div>
          <div className={styles.journalHeaderLabel}>Output</div>
          <div className={styles.journalHeaderLabel}>Sync</div>
        </div>
        {filteredHistory.length > 0 ? filteredHistory.slice(0, 8).map((session) => (
          <div key={session.id} className={styles.journalRow}>
            <div className={styles.journalGame}>{session.gameType}</div>
            <div className={styles.journalClass}>{session.className}</div>
            <div className={styles.journalDate}>{new Date(session.timestamp).toLocaleDateString()}</div>
            <div className={styles.journalScore} style={{ color: "var(--green)" }}>{session.totalScore.toLocaleString()}</div>
            <div className={styles.journalAcc} style={{ color: "var(--cyan)" }}>{session.accuracy}%</div>
          </div>
        )) : (
          <div className={styles.journalRow} style={{ justifyContent: "center", color: "var(--muted)" }}>
            Awaiting session deployment...
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
