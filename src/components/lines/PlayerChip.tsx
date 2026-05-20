'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDragState } from '@/hooks/useDragState';
import { PositionDotGrid } from './PositionDotGrid';
import type { RosterPlayer, SlotRef, Preference } from '@/lib/types';

interface PlayerChipProps {
  player: RosterPlayer;
  fromSlot?: SlotRef;
  readOnly?: boolean;
  onRemove?: () => void;
  isOverlay?: boolean;
  preferenceClass?: string;
  /** The player's preference for the slot they're in — drives the top bar color. */
  slotPref?: Preference;
  /** When true, render at 75% opacity (another player is selected). */
  dimmed?: boolean;
  /** Player view only: show dot grids via external toggle */
  showDots?: boolean;
}

const nameClamp: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-all',
};

const MOBILE_TILE_HEIGHT = 76;

function splitName(name: string): [string, string] {
  const i = name.indexOf(' ');
  return i === -1 ? [name, ''] : [name.slice(0, i), name.slice(i + 1)];
}

function playerLabel(player: RosterPlayer): { first: string; second: string } {
  const displayName = player.display_name || player.name;
  const jersey = player.jersey_number ?? ' ';
  const full = `${jersey} ${displayName}`;
  const [first, second] = splitName(full);
  return { first, second };
}

function PrefTopBar({ pref }: { pref: Preference }) {
  const colorVar = pref === 'preferred' ? 'var(--dot-preferred)'
    : pref === 'acceptable' ? 'var(--dot-acceptable)'
    : pref === 'refused'    ? 'var(--dot-avoid)'
    : 'var(--dot-unset)';
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderRadius: '6px 6px 0 0',
        backgroundColor: colorVar,
        transition: 'height 150ms ease',
      }}
    />
  );
}

function RemoveBadge({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      aria-label="Remove player"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 2,
        right: 2,
        padding: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        zIndex: 20,
      }}
    >
      <span style={{ color: 'var(--text-secondary)', fontSize: 18, lineHeight: 1, fontWeight: 'bold' }}>×</span>
    </button>
  );
}

export function PlayerChip({ player, fromSlot, readOnly, onRemove, isOverlay, slotPref, dimmed, showDots }: PlayerChipProps) {
  const { isTouchDevice, isEditMode, setEditMode, selectedPlayerId, setSelectedPlayerId, activeDragPlayerId } = useDragState();

  const draggableId = fromSlot
    ? `slot-${fromSlot.slotId}-${fromSlot.position}-${player.id}`
    : `roster-overlay-${player.id}`;

  const inactive   = !player.is_active;
  const isInSlot   = !!fromSlot && !isOverlay;
  const isSelected = selectedPlayerId === player.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: fromSlot
      ? { type: 'slot-player', playerId: player.id, fromSlot }
      : { type: 'roster-player', playerId: player.id },
    disabled: readOnly || isOverlay || inactive || isTouchDevice,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const showRemove = onRemove && !readOnly && !isOverlay && (!isTouchDevice || (isEditMode && isSelected));

  const selectedBorderColor = 'var(--selected-border)';
  const defaultBorderColor  = 'var(--border)';

  const { first, second } = playerLabel(player);

  // ── Mobile slot chip ─────────────────────────────────────────────────
  if (isTouchDevice && isInSlot && !isOverlay) {
    function handleTileTap(e: React.MouseEvent) {
      if (inactive) return;
      if (selectedPlayerId && selectedPlayerId !== player.id) return;
      e.stopPropagation();
      setEditMode(true);
      setSelectedPlayerId(isSelected ? null : player.id);
    }

    const chipStyle: React.CSSProperties = inactive
      ? { opacity: 0.6, borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }
      : isSelected
      ? { borderColor: selectedBorderColor, backgroundColor: 'var(--selected-bg)', color: 'var(--selected-text)', borderStyle: 'solid' }
      : { borderColor: defaultBorderColor, backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
          opacity: dimmed ? 0.5 : 1 };

    return (
      <div
        onClick={handleTileTap}
        className={`slot-tile relative flex flex-col items-center justify-center rounded-lg border-2 px-1.5 py-1 w-full select-none transition-all ${
          inactive ? '' : 'cursor-pointer'
        }`}
        style={{ height: `${MOBILE_TILE_HEIGHT}px`, ...chipStyle }}
      >
        {/* Preference top bar — always visible on filled chips */}
        {!inactive && <PrefTopBar pref={slotPref ?? 'unset'} />}

        {/* Yellow × badge — remove from slot */}
        {showRemove && (
          <RemoveBadge onClick={(e) => { e.stopPropagation(); onRemove!(); }} />
        )}

        <p className="text-xs font-medium leading-tight text-center w-full" style={nameClamp}>
          {first}
          {second && <><br />{second}</>}
        </p>

        <div
          className={`transition-opacity duration-200 ${
            !player.is_goalie && (!!showDots || (!readOnly && !!selectedPlayerId)) ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <PositionDotGrid positions={player.positions} />
        </div>
      </div>
    );
  }

  // ── Desktop / overlay chip ────────────────────────────────────────────
  const showDesktopDots = !isOverlay && !player.is_goalie && (!!showDots || (!readOnly && !!activeDragPlayerId));

  const desktopChipStyle: React.CSSProperties = inactive
    ? { opacity: 0.6, borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }
    : isSelected
    ? { borderColor: selectedBorderColor, backgroundColor: 'var(--selected-bg)', color: 'var(--selected-text)' }
    : { borderColor: defaultBorderColor, backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
        opacity: dimmed ? 0.5 : 1 };

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={!isOverlay ? { ...style, ...desktopChipStyle } : desktopChipStyle}
      className={`relative slot-tile flex flex-col gap-0.5 rounded-lg border-2 px-2 py-1.5 text-sm font-medium shadow-sm w-full select-none transition-all ${
        isDragging ? 'opacity-30' : ''
      } ${!readOnly && !isOverlay && !inactive ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isOverlay ? 'shadow-lg' : ''
      }`}
      {...(!readOnly && !isOverlay && !inactive ? { ...listeners, ...attributes } : {})}
    >
      {/* Preference top bar */}
      {!isOverlay && !inactive && isInSlot && <PrefTopBar pref={slotPref ?? 'unset'} />}

      {/* Yellow × badge — remove from slot */}
      {showRemove && (
        <RemoveBadge onClick={(e) => { e.stopPropagation(); onRemove!(); }} />
      )}

      <p
        className={`text-xs font-medium leading-tight text-center w-full ${inactive ? 'line-through' : ''}`}
        style={{ ...nameClamp, color: inactive ? 'var(--text-secondary)' : undefined }}
      >
        {first}
        {second && <><br />{second}</>}
        {inactive && <span className="ml-1 not-italic" style={{ color: 'var(--text-secondary)' }}>(inactive)</span>}
      </p>

      <div className={`transition-opacity duration-200 ${showDesktopDots ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        <PositionDotGrid positions={player.positions} />
      </div>
    </div>
  );
}
