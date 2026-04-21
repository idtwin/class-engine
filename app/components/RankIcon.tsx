import React from 'react';
import { RankTier } from '@/utils/ranks';

interface RankIconProps {
  tier: RankTier;
  stars: 1 | 2 | 3 | 4;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * RankIcon Component
 * Maps the new [Role] [Metallic] hierarchy to existing image assets.
 * Role (Tier) -> Shape asset suffix (_rival, _hero, _legend)
 * Metallic (Stars) -> Color asset prefix (bronze_, silver_, gold_, platinum_)
 */
export default function RankIcon({ tier, stars, size = 64, className, style }: RankIconProps) {
  // Mapping Metallic (Stars) to file prefix
  const metallicMap: Record<number, string> = {
    1: 'bronze',
    2: 'silver',
    3: 'gold',
    4: 'platinum'
  };
  
  // Mapping Role (Tier) to file suffix
  const roleFileMap: Record<string, string> = {
    'Hero': 'rival',
    'Legend': 'hero',
    'Immortal': 'legend'
  };

  const prefix = metallicMap[stars] || 'bronze';
  const suffix = roleFileMap[tier] || 'rival';
  const imagePath = `/ui/ranks/${prefix}_${suffix}.png`;

  // Scale normalization based on Role seniority
  const scaleMap: Record<string, number> = {
    'Hero': 1.0,
    'Legend': 1.25,
    'Immortal': 1.45
  };
  const scale = scaleMap[tier] || 1.0;

  return (
    <div 
      className={className}
      style={{ 
        width: size, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        overflow: 'visible',
        ...style
      }}
    >
      <img
        src={imagePath}
        alt={`${tier} ${prefix}`}
        style={{
          width: `${size * scale}px`,
          height: 'auto',
          maxWidth: 'none',
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.8))',
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2
        }}
      />
    </div>
  );
}
