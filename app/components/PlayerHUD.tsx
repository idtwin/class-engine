import React from 'react';
import styles from './PlayerHUD.module.css';
import { getNextRankProgress, getRankForXp } from '@/utils/ranks';
import RankIcon from './RankIcon';
import Link from 'next/link';

interface PlayerHUDProps {
  name: string;
  xp: number;
  accuracy?: number;
  studentId?: string;
  children?: React.ReactNode;
}

export default function PlayerHUD({ name, xp, accuracy = 0, studentId, children }: PlayerHUDProps) {
  const currentRank = getRankForXp(xp);
  const { nextRank, progressPercent, xpNeeded } = getNextRankProgress(xp);

  return (
    <div className={styles.hudContainer} data-tier={currentRank.tier}>
      <div className={styles.hudBgDecor} />
      
      {/* Top Banner with Rank */}
      <div className={styles.rankBanner}>
        <div className={styles.rankBadge}>
          <div className={styles.rankBadgeInner}>
            <RankIcon tier={currentRank.tier} stars={currentRank.stars as any} size={48} />
          </div>
        </div>
        <div className={styles.rankInfo}>
          <div className={`${styles.rankTitle} ${styles['tier' + currentRank.tier]}`}>
            {currentRank.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={styles.playerName}>{name}</div>
            
            {!!studentId && (
               <Link href={`/profile/${studentId}`} className={styles.profileLink}>
                 VIEW RECORD
               </Link>
            )}
          </div>
        </div>
      </div>

      {/* Level XP Bar */}
      <div className={styles.xpCard}>
        <div className={styles.xpHeader}>
          <span className={styles.xpTotal}>{xp.toLocaleString()} XP</span>
          {nextRank && (
            <span className={styles.xpNext}>{xpNeeded.toLocaleString()} XP to {nextRank.label}</span>
          )}
        </div>
        <div className={styles.xpBarTrack}>
          <div className={styles.xpBarFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Lifetime Acc</div>
          <div className={styles.statValue}>{Math.round(accuracy)}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Status</div>
          <div className={styles.statValue} style={{ color: '#00e87a' }}>Online</div>
        </div>
      </div>
      
      {children}
      
      <div className={styles.waitingLabel}>
        <div className={styles.spinner} />
        Awaiting Game Initialization...
      </div>
    </div>
  );
}
