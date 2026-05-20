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

  const { setNodeRef, transform, isDragging } = useDraggable({
    id: `roster-${player.id}`,
    data: { type: 'roster-player', playerId: player.id },
    disabled: isTouchDevice || readOnly,
  });

  const isSelected  = selectedPlayerId === player.id;
  const otherSelected = !!selectedPlayerId && !isSelected;

  const style: React.CSSProperties = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    width: '76px',
    height: '76px',
    flexShrink: 0,
  };

  function handleClick() {
    if (readOnly) return;
    if (isTouchDevice) {
      setEditMode(true);
      setSelectedPlayerId(isSelected ? null : player.id);
    } else {
      if (!isEditMode) return;
      setSelectedPlayerId(isSelected ? null : player.id);
    }
  }

  const tileStyle: React.CSSProperties = isSelected
    ? { borderColor: 'var(--selected-border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }
    : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
        opacity: otherSelected ? 0.75 : 1 };

  const displayName = player.display_name || player.name;
  const i = displayName.indexOf(' ');
  const first  = i === -1 ? displayName : displayName.slice(0, i);
  const second = i === -1 ? '' : displayName.slice(i + 1);

  const finalStyle: React.CSSProperties = {
    ...style,
    ...tileStyle,
    ...(isSelected ? { outline: '2px solid var(--selected-border)', outlineOffset: '2px' } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={finalStyle}
      onClick={handleClick}
      className={`avatar-tile flex flex-col items-center justify-start rounded-lg border-2 p-1.5 select-none transition-all ${
        isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-30' : ''}`}
    >
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
        {first}
        {second && <><br />{second}</>}
      </p>
      <div className={`transition-opacity duration-200 ${!!selectedPlayerId || !!activeDragPlayerId ? 'opacity-100' : 'opacity-0'}`}>
        <PositionDotGrid positions={player.positions} />
      </div>
    </div>
  );
}
