export type RankTier = "Hero" | "Legend" | "Immortal";

export interface RankInfo {
  tier: RankTier;
  stars: 1 | 2 | 3 | 4; // 1: Bronze, 2: Silver, 3: Gold, 4: Platinum
  minXp: number;
  label: string;
}

export const RANKS: RankInfo[] = [
  // HERO TIER
  { tier: "Hero",     stars: 1, minXp: 0,     label: "Hero Bronze" },
  { tier: "Hero",     stars: 2, minXp: 500,   label: "Hero Silver" },
  { tier: "Hero",     stars: 3, minXp: 1000,  label: "Hero Gold" },
  { tier: "Hero",     stars: 4, minXp: 1800,  label: "Hero Platinum" },

  // LEGEND TIER
  { tier: "Legend",   stars: 1, minXp: 3000,  label: "Legend Bronze" },
  { tier: "Legend",   stars: 2, minXp: 4500,  label: "Legend Silver" },
  { tier: "Legend",   stars: 3, minXp: 6200,  label: "Legend Gold" },
  { tier: "Legend",   stars: 4, minXp: 8200,  label: "Legend Platinum" },

  // IMMORTAL TIER
  { tier: "Immortal", stars: 1, minXp: 11000, label: "Immortal Bronze" },
  { tier: "Immortal", stars: 2, minXp: 14000, label: "Immortal Silver" },
  { tier: "Immortal", stars: 3, minXp: 18000, label: "Immortal Gold" },
  { tier: "Immortal", stars: 4, minXp: 22000, label: "Immortal Platinum" },
];

export function getRankForXp(xp: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXp) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRankProgress(xp: number): { nextRank: RankInfo | null, progressPercent: number, xpNeeded: number } {
  const currentLevelObj = getRankForXp(xp);
  const currentIndex = RANKS.findIndex(r => r.label === currentLevelObj.label);
  
  if (currentIndex === RANKS.length - 1) {
    return { nextRank: null, progressPercent: 100, xpNeeded: 0 };
  }
  
  const nextRank = RANKS[currentIndex + 1];
  const xpIntoLevel = xp - currentLevelObj.minXp;
  const levelSize = nextRank.minXp - currentLevelObj.minXp;
  const progressPercent = Math.min(100, Math.max(0, (xpIntoLevel / levelSize) * 100));
  
  return { 
    nextRank, 
    progressPercent,
    xpNeeded: nextRank.minXp - xp
  };
}
