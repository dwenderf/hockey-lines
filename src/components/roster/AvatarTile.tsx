'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDragState } from '@/hooks/useDragState';
import { useLongPress } from '@/hooks/useLongPress';
import { PositionDotGrid } from '@/components/lines/PositionDotGrid';
import type { RosterPlayer } from '@/lib/types';

interface AvatarTileProps {
  player: RosterPlayer;
}

export function AvatarTile({ player }: AvatarTileProps) {
  const { isEditMode, setEditMode, selectedPlayerId, setSelectedPlayerId } = useDragState();

  const { setNodeRef, transform, isDragging } = useDraggable({
    id: `roster-${player.id}`,
    data: { type: 'roster-player', playerId: player.id },
  });

  const longPress = useLongPress({ onLongPress: () => setEditMode(true) });

  const isSelected = selectedPlayerId === player.id;

  const style: React.CSSProperties = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    width: '76px',
    height: '76px',
    flexShrink: 0,
  };

  function handleClick() {
    if (!isEditMode) return;
    setSelectedPlayerId(isSelected ? null : player.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      {...longPress}
      className={`avatar-tile flex flex-col items-center justify-start rounded-lg border-2 p-1.5 cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging ? 'opacity-30' : ''
      } ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
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
