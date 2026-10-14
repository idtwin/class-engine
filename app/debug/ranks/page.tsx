"use client";

import React from 'react';
import RankIcon from '../../components/RankIcon';
import { RANKS } from '@/utils/ranks';
import styles from '../../components/PlayerHUD.module.css';

export default function RankShowcase() {
  return (
    <div style={{ backgroundColor: '#07090f', color: '#fff', padding: '40px', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
        ESL Arena Rank Showcase
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
        {RANKS.map((rank, idx) => (
          <div 
            key={idx} 
            className={styles.hudContainer} 
            data-tier={rank.tier}
            style={{ 
              border: '1px solid #222', 
              borderRadius: '12px', 
              padding: '20px', 
              minHeight: 'auto',
              background: 'rgba(10, 15, 25, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              <RankIcon tier={rank.tier} stars={rank.stars} size={64} />
              <div>
                <div style={{ 
                  color: 'var(--tier-color)', 
                  fontWeight: 800, 
                  fontSize: '18px', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  {rank.label}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                  Unlocks at {rank.minXp} XP
                </div>
              </div>
            </div>

            {/* Mock progress bar to show theme colors */}
            <div style={{ height: '8px', background: '#111', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
              <div 
                className={styles.xpBarFill} 
                style={{ width: '65%' }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '60px', padding: '20px', border: '1px dashed #444', borderRadius: '8px', textAlign: 'center' }}>
        <p style={{ opacity: 0.7 }}>
          Visit <strong>http://localhost:3000/teams</strong> to see these badges on your actual student roster cards!
        </p>
      </div>
    </div>
  );
}
