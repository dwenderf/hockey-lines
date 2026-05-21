'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDragState } from '@/hooks/useDragState';
import { PositionDotGrid } from '@/components/lines/PositionDotGrid';
import type { RosterPlayer } from '@/lib/types';

interface AvatarTileProps {
  player: RosterPlayer;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function AvatarTile({ player, readOnly, onEdit }: AvatarTileProps) {
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
        opacity: otherSelected ? 0.5 : 1 };

  const first  = player.jersey_number ?? ' ';
  const second = player.display_name || player.name;

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
      className={`avatar-tile relative flex flex-col items-center justify-start rounded-lg border-2 p-1.5 select-none transition-all ${
        isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-30' : ''}`}
    >
      {/* Edit badge — top-left, shown when selected */}
      {isSelected && onEdit && (
        <button
          aria-label="Edit player"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            transform: 'translate(50%, -50%)',
            padding: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            zIndex: 20,
          }}
        >
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            lineHeight: 1,
          }}>
            <span style={{ color: 'white' }}>✎</span>
          </div>
        </button>
      )}
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
      <div className="transition-opacity duration-200 opacity-100">
        <PositionDotGrid positions={player.positions} />
      </div>
    </div>
  );
}
