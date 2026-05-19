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

function splitName(name: string): [string, string] {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return [parts[0], ''];
  const last = parts.pop()!;
  return [parts.join(' '), last];
}

export function AvatarTile({ player }: AvatarTileProps) {
  const { isEditMode, setEditMode, selectedPlayerId, setSelectedPlayerId } = useDragState();

  const { setNodeRef, transform, isDragging } = useDraggable({
    id: `roster-${player.id}`,
    data: { type: 'roster-player', playerId: player.id },
  });

  const longPress = useLongPress({ onLongPress: () => setEditMode(true) });

  const isSelected = selectedPlayerId === player.id;
  const [firstName, lastName] = splitName(player.name);

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

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
      className={`avatar-tile flex-shrink-0 flex flex-col items-center justify-start rounded-lg border-2 p-1.5 w-14 cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging ? 'opacity-30' : ''
      } ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <span className="text-center text-xs font-medium leading-tight w-full break-words">
        {firstName}
      </span>
      {lastName && (
        <span className="text-center text-xs font-medium leading-tight w-full break-words">
          {lastName}
        </span>
      )}
      <PositionDotGrid positions={player.positions} />
    </div>
  );
}
