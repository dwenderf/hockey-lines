'use client';

import { useEffect, useRef, useState } from 'react';
import { AvatarTile } from './AvatarTile';
import type { RosterPlayer } from '@/lib/types';

interface BenchCarouselProps {
  players: RosterPlayer[];
  assignedPlayerIds: Set<string>;
  absentPlayerIds: Set<string>;
  readOnly?: boolean;
}

export function BenchCarousel({ players, assignedPlayerIds, absentPlayerIds, readOnly }: BenchCarouselProps) {
  const benchPlayers = players.filter(
    (p) => p.is_active && !p.is_goalie && !absentPlayerIds.has(p.id) && !assignedPlayerIds.has(p.id)
  );

  // Amber ping on the container when a player returns to the bench
  const [pinging, setPinging] = useState(false);
  const prevCountRef = useRef(benchPlayers.length);
  const isFirstRef = useRef(true);
  useEffect(() => {
    if (isFirstRef.current) { isFirstRef.current = false; prevCountRef.current = benchPlayers.length; return; }
    if (benchPlayers.length > prevCountRef.current) {
      setPinging(true);
      setTimeout(() => setPinging(false), 1000);
    }
    prevCountRef.current = benchPlayers.length;
  }, [benchPlayers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      {/* Zone label */}
      <p
        className="shrink-0 px-2 pt-1"
        style={{
          fontSize: 10,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        Bench
      </p>

      {/* Scrollable tile row with fade mask */}
      <div
        className={`flex-1 overflow-hidden ${pinging ? 'carousel-pinging' : ''}`}
        style={{
          maskImage: benchPlayers.length > 0
            ? 'linear-gradient(to right, black 85%, transparent 100%)'
            : undefined,
          WebkitMaskImage: benchPlayers.length > 0
            ? 'linear-gradient(to right, black 85%, transparent 100%)'
            : undefined,
        }}
      >
        <div className="flex items-center h-full px-2 gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {benchPlayers.length === 0 ? (
            <div className="flex items-center gap-1.5 px-2 w-full justify-center" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              <span>✓</span>
              <span>All players are on the ice</span>
            </div>
          ) : (
            benchPlayers.map((player) => (
              <AvatarTile key={player.id} player={player} readOnly={readOnly} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
