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
    <div className={`h-full ${pinging ? 'carousel-pinging' : ''}`}>
    <div className="flex items-center h-full px-2 gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {benchPlayers.length === 0 ? (
        <p className="text-xs text-gray-400 px-2">All players are on the ice</p>
      ) : (
        benchPlayers.map((player) => (
          <AvatarTile key={player.id} player={player} readOnly={readOnly} />
        ))
      )}
    </div>
    </div>
  );
}
