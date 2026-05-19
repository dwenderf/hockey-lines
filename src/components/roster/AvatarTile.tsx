'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDragState } from '@/hooks/useDragState';
import { PositionDotGrid } from '@/components/lines/PositionDotGrid';
import type { RosterPlayer } from '@/lib/types';

interface AvatarTileProps {
  player: RosterPlayer;
  readOnly?: boolean;
}

export function AvatarTile({ player, readOnly }: AvatarTileProps) {
  const { isEditMode, setEditMode, selectedPlayerId, setSelectedPlayerId, isTouchDevice, activeDragPlayerId } = useDragState();

  // Drag is desktop-only. On touch, players are placed via tap-to-place. Always disabled in read-only view.
  const { setNodeRef, transform, isDragging } = useDraggable({
    id: `roster-${player.id}`,
    data: { type: 'roster-player', playerId: player.id },
    disabled: isTouchDevice || readOnly,
  });

  const isSelected = selectedPlayerId === player.id;

  const style: React.CSSProperties = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    width: '76px',
    height: '76px',
    flexShrink: 0,
  };

  function handleClick() {
    if (readOnly) return;
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
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* 2-line max with ellipsis on overflow — matches grid chip layout */}
      <p
        className="text-center text-xs font-medium leading-tight w-full"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-all',
        }}
      >
        {(() => {
          const i = player.name.indexOf(' ');
          if (i === -1) return player.name;
          return <>{player.name.slice(0, i)}<br />{player.name.slice(i + 1)}</>;
        })()}
      </p>
      {/* Hidden until a player is selected OR a drag is active */}
      <div className={`transition-opacity duration-200 ${!!selectedPlayerId || !!activeDragPlayerId ? 'opacity-100' : 'opacity-0'}`}>
        <PositionDotGrid positions={player.positions} />
      </div>
    </div>
  );
}
