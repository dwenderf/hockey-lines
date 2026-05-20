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
  onEditPlayer?: () => void;
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

/** Returns the display label: "#11 Brett N." or just the display_name */
function playerLabel(player: RosterPlayer): { first: string; second: string } {
  const displayName = player.display_name || player.name;
  const prefix = player.jersey_number ? `#${player.jersey_number} ` : '';
  const full = prefix + displayName;
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

function EditBadge({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      aria-label="Edit player"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      style={{
        position: 'absolute',
        top: -10,
        right: -10,
        padding: 10,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        zIndex: 20,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: 'var(--edit-badge-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        <span style={{ color: 'var(--edit-badge-icon)' }}>✎</span>
      </div>
    </button>
  );
}

export function PlayerChip({ player, fromSlot, readOnly, onRemove, onEditPlayer, isOverlay, slotPref, dimmed, showDots }: PlayerChipProps) {
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

  // Border color for selected vs normal
  const selectedBorderColor = 'var(--selected-border)';
  const defaultBorderColor  = slotPref === 'preferred'  ? 'var(--dot-preferred)'
    : slotPref === 'acceptable' ? 'var(--dot-acceptable)'
    : slotPref === 'refused'    ? 'var(--dot-avoid)'
    : 'var(--border)';

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
          opacity: dimmed ? 0.75 : 1 };

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

        {/* Edit badge — only on selected chip */}
        {isSelected && onEditPlayer && (
          <EditBadge onClick={(e) => { e.stopPropagation(); onEditPlayer(); }} />
        )}

        {/* × remove badge */}
        {showRemove && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove!(); }}
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-base font-bold shadow-md z-10 select-none"
            style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-page)', lineHeight: 1 }}
          >
            ×
          </button>
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
        opacity: dimmed ? 0.75 : 1 };

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

      {/* Edit badge on selected desktop chips */}
      {isSelected && isInSlot && onEditPlayer && (
        <EditBadge onClick={(e) => { e.stopPropagation(); onEditPlayer(); }} />
      )}

      <p
        className={`text-xs font-medium leading-tight text-center w-full ${inactive ? 'line-through' : ''}`}
        style={{ ...nameClamp, color: inactive ? 'var(--text-secondary)' : undefined }}
      >
        {first}
        {second && <><br />{second}</>}
        {inactive && <span className="ml-1 not-italic" style={{ color: 'var(--text-secondary)' }}>(inactive)</span>}
      </p>

      {showRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove!(); }}
          className="absolute top-0.5 right-0.5 hover:opacity-70 leading-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          ×
        </button>
      )}

      <div className={`transition-opacity duration-200 ${showDesktopDots ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        <PositionDotGrid positions={player.positions} />
      </div>
    </div>
  );
}
