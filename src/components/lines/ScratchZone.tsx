'use client';

import { useDroppable } from '@dnd-kit/core';
import type { RosterPlayer } from '@/lib/types';

interface ScratchZoneProps {
  scratchedPlayers: RosterPlayer[];
  onReturnFromScratch: (playerId: string) => void;
}

export function ScratchZone({ scratchedPlayers, onReturnFromScratch }: ScratchZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'scratch-zone',
    data: { type: 'scratched-zone' },
  });

  return (
    <div className="mt-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-600">Out This Game</h2>
      <div
        ref={setNodeRef}
        className={`min-h-[3rem] rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver ? 'border-amber-400 bg-amber-50' : 'border-amber-200 bg-amber-50/40'
        }`}
      >
        {scratchedPlayers.length === 0 ? (
          <p className="py-2 text-center text-xs text-amber-400">Drag players here to scratch</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {scratchedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-1 rounded border border-amber-200 bg-white px-2 py-1 text-sm opacity-50"
              >
                <span className="font-medium">{player.name}</span>
                <button
                  onClick={() => onReturnFromScratch(player.id)}
                  className="text-gray-400 hover:text-red-500 leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
