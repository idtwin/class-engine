"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClassroomStore } from "../../store/useClassroomStore";
import RankIcon from "../../components/RankIcon";
import { getRankForXp, getNextRankProgress } from "@/utils/ranks";
import styles from "./profile.module.css";

/**
 * Student Career Profile Page
 * Cinematic "Military Grade" ID card with XP timeline and performance stats.
 */
export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { classes } = useClassroomStore();
  
  const [xpEvents, setXpEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Find student in any class
  const student = useMemo(() => {
    for (const c of classes) {
      const s = c.students.find((st) => st.id === id);
      if (s) return { ...s, className: c.name };
    }
    return null;
  }, [classes, id]);

  // Fetch XP timeline from Supabase
  useEffect(() => {
    async function fetchHistory() {
      if (!id) return;
      try {
        const res = await fetch(`/api/xp/totals?class_name=all&student_id=${id}`);
        // We'll actually want a detailed events list here instead of just totals.
        // For now, let's use the totals API or create a new events API if needed.
        // Actually, let's just fetch from the xp_events table if possible.
        // I'll create a quick helper API for this if it doesn't exist.
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    if (mounted && id) fetchHistory();
  }, [mounted, id]);

  if (!student) {
    return (
      <div className={styles.notFound}>
        <div className={styles.errorCode}>ERROR 404</div>
        <div className={styles.errorText}>OPERATIVE NOT FOUND IN SYSTEM</div>
        <button className={styles.backBtn} onClick={() => router.back()}>RETURN TO COMMAND</button>
      </div>
    );
  }

  const rankInfo = getRankForXp(student.xp || 0);
  const nextRank = getNextRankProgress(student.xp || 0);

  return (
    <div className={styles.profilePage}>
      <div className={styles.header}>
        <button className={styles.breadcrumb} onClick={() => router.back()}>
          <span>&lt;</span> RETURN TO STATION // <span>{student.name}</span>
        </button>
        <div className={styles.idLabel}>SERVICE RECORD // AUTHENTICATED</div>
      </div>

      <div className={styles.mainGrid}>
        {/* LEFT: ID CARD */}
        <div className={styles.idCard}>
          <div className={styles.cardGlow} />
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Personnel ID // {student.id.slice(0, 8).toUpperCase()}</div>
            <div className={styles.cardStatus}>ACTIVE</div>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatarFrame} />
              <img 
                src={student.gender === 'female' ? '/images/avatar_girl.png' : '/images/avatar_boy.png'} 
                alt={student.name} 
                className={styles.avatarImg}
              />
              <div className={styles.rankBadgeOver}>
                <RankIcon tier={rankInfo.tier} stars={rankInfo.stars} size={48} />
              </div>
            </div>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>NAME</div>
                <div className={styles.infoVal}>{student.name}</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>TIER</div>
                <div className={styles.infoVal} style={{ color: "var(--cyan)" }}>{rankInfo.tier.toUpperCase()}</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>DESIGNATION</div>
                <div className={styles.infoVal}>
                  {rankInfo.tier.toUpperCase()} {rankInfo.stars === 1 ? 'BRONZE' : rankInfo.stars === 2 ? 'SILVER' : rankInfo.stars === 3 ? 'GOLD' : 'PLATINUM'}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.footerBarcode} />
            <div className={styles.footerText}>ESL_ARENA_CORE_OS_V2.0</div>
          </div>
        </div>

        {/* RIGHT: XP & STATS */}
        <div className={styles.detailsColumn}>
          {/* XP PROGRESS */}
          <div className={styles.statPanel}>
            <div className={styles.panelHeader}>Experience Progress</div>
            <div className={styles.xpSummary}>
              <div className={styles.xpBig}>{(student.xp || 0).toLocaleString()}</div>
              <div className={styles.xpTotalLabel}>TOTAL XP EARNED</div>
            </div>
            
            <div className={styles.progressBarWrap}>
              <div className={styles.progressLabels}>
                <span>{rankInfo.tier.toUpperCase()} {rankInfo.stars === 1 ? 'BRONZE' : rankInfo.stars === 2 ? 'SILVER' : rankInfo.stars === 3 ? 'GOLD' : 'PLATINUM'}</span>
                <span>{nextRank.nextRank ? (`${nextRank.nextRank.tier} ${nextRank.nextRank.stars === 1 ? 'BRONZE' : nextRank.nextRank.stars === 2 ? 'SILVER' : nextRank.nextRank.stars === 3 ? 'GOLD' : 'PLATINUM'}`).toUpperCase() : "MAX RANK"}</span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${nextRank.progressPercent}%` }} 
                />
              </div>
              <div className={styles.progressSub}>
                {nextRank.nextRank 
                  ? `${nextRank.xpNeeded.toLocaleString()} XP remaining to next promotion` 
                  : "Maximum clearance achieved"}
              </div>
            </div>
          </div>

          {/* ACTIVITY FEED (Placeholder for now) */}
          <div className={styles.statPanel}>
            <div className={styles.panelHeader}>Service History</div>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Session Participation</div>
                  <div className={styles.timelineDesc}>Automatic sync with cluster: {student.className}</div>
                  <div className={styles.timelineDate}>REAL-TIME LOG ACTIVE</div>
                </div>
              </div>
              {/* Future: Map real XP events here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
