'use client';

import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDragState } from '@/hooks/useDragState';
import { PlayerChip } from './PlayerChip';
import { SLOT_DRAG_COLORS, getPrefBorderColor, getPrefTintStyle } from '@/lib/constants';
import type { RosterPlayer, SlotRef, Preference } from '@/lib/types';

interface PositionSlotProps {
  slotRef: SlotRef;
  player: RosterPlayer | null;
  readOnly?: boolean;
  playersById: Map<string, RosterPlayer>;
  onRemove?: () => void;
  onTapSlot?: () => void;
  onEditPlayer?: (player: RosterPlayer) => void;
  showDots?: boolean;
}

export function PositionSlot({ slotRef, player, readOnly, playersById, onRemove, onTapSlot, onEditPlayer, showDots }: PositionSlotProps) {
  const { activeDragPlayerId, absentPlayerIds, isTouchDevice, isEditMode, selectedPlayerId } = useDragState();

  const draggingAbsent = activeDragPlayerId ? absentPlayerIds.has(activeDragPlayerId) : false;

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotRef.slotId}-${slotRef.position}`,
    data: { type: 'slot', slotRef },
    disabled: readOnly || draggingAbsent,
  });

  // ── Landing flash ────────────────────────────────────────────────────
  const [justPlaced, setJustPlaced] = useState(false);
  const prevPlayerIdRef = useRef<string | undefined>(undefined);
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevPlayerIdRef.current = player?.id;
      return;
    }
    if (player && player.id !== prevPlayerIdRef.current) {
      setJustPlaced(true);
      prevPlayerIdRef.current = player.id;
      const t = setTimeout(() => setJustPlaced(false), 900);
      return () => clearTimeout(t);
    }
    if (!player) prevPlayerIdRef.current = undefined;
  }, [player?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Target detection (touch/tap-to-place) ────────────────────────────
  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) : null;
  const isOwnSlot     = !!selectedPlayerId && selectedPlayerId === player?.id;
  // All slots are targets when a player is selected (not just preferred/acceptable)
  const isTarget      = !readOnly && isEditMode && !!selectedPlayerId && !isOwnSlot;
  const pref: Preference = (selectedPlayer?.positions[slotRef.position] as Preference) ?? 'unset';

  // ── Desktop drag colors ──────────────────────────────────────────────
  let dragColorClass = '';
  let dragBorderColor = '';
  let dragTintStyle: React.CSSProperties = {};
  if (activeDragPlayerId && !readOnly && !draggingAbsent) {
    const activePlayer = playersById.get(activeDragPlayerId);
    if (activePlayer?.is_active) {
      const activePref: Preference = (activePlayer.positions[slotRef.position] as Preference) ?? 'unset';
      dragColorClass = SLOT_DRAG_COLORS[activePref];
      dragBorderColor = getPrefBorderColor(activePref);
      dragTintStyle = getPrefTintStyle(activePref);
    }
  }

  function handleClick(e: React.MouseEvent) {
    if (readOnly) return;
    if (isEditMode && selectedPlayerId && onTapSlot) {
      e.stopPropagation();
      onTapSlot();
    }
  }

  // ── Slot wrapper styling ─────────────────────────────────────────────
  const minH    = isTouchDevice ? 'min-h-[76px]' : 'min-h-[3rem]';
  const pointer = isTarget && !readOnly ? 'cursor-pointer' : '';

  // Base/override style built incrementally
  let wrapperClass = `relative flex ${minH} min-w-0 w-full items-center rounded-md transition-all p-0 ${pointer}`;
  let wrapperStyle: React.CSSProperties = {};

  if (isOver && activeDragPlayerId) {
    // Drag is hovering over this slot
    wrapperClass += ' border-2 border-dashed scale-105';
    wrapperStyle = { borderColor: dragBorderColor, ...dragTintStyle };
  } else if (activeDragPlayerId && !readOnly && !draggingAbsent) {
    // Drag is active but not hovering here — show preference hint
    wrapperClass += ' border-2 border-dashed';
    wrapperStyle = { borderColor: dragBorderColor, ...dragTintStyle };
    if (player) {
      // Occupied: subtle tint only (chip provides its own opacity via prop)
      wrapperStyle = { ...dragTintStyle };
      wrapperClass += ' border-0'; // reset border — chip border handles it
    }
  } else if (isTarget && !player) {
    // Touch target — empty slot: tint + dashed preference-colored border
    wrapperClass += ' border-2 border-dashed p-1';
    wrapperStyle = { borderColor: getPrefBorderColor(pref), ...getPrefTintStyle(pref) };
  } else if (isTarget && player) {
    // Touch target — occupied slot: dashed preference border (chip handles opacity)
    wrapperClass += ' border-2 border-dashed p-1';
    wrapperStyle = { borderColor: getPrefBorderColor(pref) };
  } else if (player) {
    // No selection active — chip is the only visual
    wrapperClass += ' border-0 bg-transparent';
  } else {
    // Default empty slot
    wrapperClass += ' border-2 border-dashed p-1';
    wrapperStyle = { borderColor: 'var(--border)' };
  }

  // Determine if the chip inside should be dimmed
  const chipShouldDim = !!selectedPlayerId && !isOwnSlot && !!player && !isOver;
  const isActiveDrag  = !!activeDragPlayerId && !draggingAbsent;
  const chipDim       = (isTarget || isActiveDrag) && chipShouldDim;

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`${wrapperClass} ${player && justPlaced ? 'just-placed' : ''}`}
      style={wrapperStyle}
    >
      {player ? (
        <PlayerChip
          key={player.id}
          player={player}
          fromSlot={slotRef}
          readOnly={readOnly}
          onRemove={onRemove}
          onEditPlayer={onEditPlayer ? () => onEditPlayer(player) : undefined}
          showDots={showDots}
          dimmed={chipDim}
          preferenceClass={
            player.is_active
              ? undefined // chip uses inline styles now
              : undefined
          }
          slotPref={(player.positions[slotRef.position] as Preference) ?? 'unset'}
        />
      ) : (
        <span className="relative z-10 w-full text-center text-xs select-none" style={{ color: 'var(--text-secondary)' }}>—</span>
      )}
    </div>
  );
}
