'use client';

import { AvatarTile } from './AvatarTile';
import type { RosterPlayer } from '@/lib/types';

interface BenchCarouselProps {
  players: RosterPlayer[];
  assignedPlayerIds: Set<string>;
  absentPlayerIds: Set<string>;
}

export function BenchCarousel({ players, assignedPlayerIds, absentPlayerIds }: BenchCarouselProps) {
  const benchPlayers = players.filter(
    (p) => p.is_active && !p.is_goalie && !absentPlayerIds.has(p.id) && !assignedPlayerIds.has(p.id)
  );

  return (
    <div className="flex items-center h-full px-2 gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {benchPlayers.length === 0 ? (
        <p className="text-xs text-gray-400 px-2">All players are on the ice</p>
      ) : (
        benchPlayers.map((player) => (
          <AvatarTile key={player.id} player={player} />
        ))
      )}
    </div>
  );
}
