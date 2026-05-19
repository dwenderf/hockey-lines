'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDragState } from '@/hooks/useDragState';
import { PositionDotGrid } from '@/components/lines/PositionDotGrid';
import type { RosterPlayer } from '@/lib/types';

interface AvatarTileProps {
  player: RosterPlayer;
}

export function AvatarTile({ player }: AvatarTileProps) {
  const { isEditMode, setEditMode, selectedPlayerId, setSelectedPlayerId, isTouchDevice } = useDragState();

  // Drag is desktop-only. On touch, players are placed via tap-to-place.
  const { setNodeRef, transform, isDragging } = useDraggable({
    id: `roster-${player.id}`,
    data: { type: 'roster-player', playerId: player.id },
    disabled: isTouchDevice,
  });

  const isSelected = selectedPlayerId === player.id;

  const style: React.CSSProperties = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    width: '76px',
    height: '76px',
    flexShrink: 0,
  };

  function handleClick() {
    if (isTouchDevice) {
      // Any tap enters edit mode and selects the player (or deselects if already selected).
      setEditMode(true);
      setSelectedPlayerId(isSelected ? null : player.id);
    } else {
      if (!isEditMode) return;
      setSelectedPlayerId(isSelected ? null : player.id);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={`avatar-tile flex flex-col items-center justify-start rounded-lg border-2 p-1.5 select-none transition-all ${
        isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } ${
        isDragging ? 'opacity-30' : ''
      } ${
        isSelected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400 ring-offset-1'
          : 'border-gray-200 bg-white'
      }`}
    >
      <p
        className="text-center text-xs font-medium leading-tight w-full"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}
      >
        {player.name}
      </p>
      <PositionDotGrid positions={player.positions} />
    </div>
  );
}
