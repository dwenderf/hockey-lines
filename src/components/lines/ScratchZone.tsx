'use client';

import { useDroppable } from '@dnd-kit/core';
import { useDragState } from '@/hooks/useDragState';
import type { RosterPlayer } from '@/lib/types';

interface ScratchZoneProps {
  scratchedPlayers: RosterPlayer[];
  onReturnFromScratch: (playerId: string) => void;
  onTapScratch?: () => void;
}

export function ScratchZone({ scratchedPlayers, onReturnFromScratch, onTapScratch }: ScratchZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'scratch-zone',
    data: { type: 'scratched-zone' },
  });

  const { isEditMode, selectedPlayerId } = useDragState();

  // In edit mode with a player selected, the zone becomes a tap target
  const isTapTarget = isEditMode && !!selectedPlayerId && !!onTapScratch;

  function handleClick(e: React.MouseEvent) {
    if (isTapTarget) {
      e.stopPropagation();
      onTapScratch!();
    }
  }

  return (
    <div className="mt-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-600">Out This Game</h2>
      <div
        ref={setNodeRef}
        onClick={handleClick}
        className={`min-h-[4rem] rounded-lg border-2 border-dashed p-2 transition-colors ${
          isTapTarget
            ? 'border-amber-500 bg-amber-100 cursor-pointer'
            : isOver
            ? 'border-amber-400 bg-amber-50'
            : 'border-amber-200 bg-amber-50/40'
        }`}
      >
        {scratchedPlayers.length === 0 ? (
          <p className="py-2 text-center text-xs text-amber-400">
            {isTapTarget ? 'Tap to scratch selected player' : 'Drag players here to scratch'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {scratchedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-1 rounded border border-amber-200 bg-white px-2 py-1 text-sm opacity-50"
              >
                <span className="font-medium">{player.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onReturnFromScratch(player.id); }}
                  className="text-gray-400 hover:text-red-500 leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            {isTapTarget && (
              <p className="w-full text-center text-xs text-amber-500 pt-1">Tap to scratch selected player</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
