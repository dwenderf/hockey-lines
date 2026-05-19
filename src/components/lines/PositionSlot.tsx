'use client';

import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDragState } from '@/hooks/useDragState';
import { PlayerChip } from './PlayerChip';
import { SLOT_DRAG_COLORS, getChipClass } from '@/lib/constants';
import type { RosterPlayer, SlotRef, Preference } from '@/lib/types';

interface PositionSlotProps {
  slotRef: SlotRef;
  player: RosterPlayer | null;
  readOnly?: boolean;
  playersById: Map<string, RosterPlayer>;
  onRemove?: () => void;
  onTapSlot?: () => void;
  showDots?: boolean;
}

export function PositionSlot({ slotRef, player, readOnly, playersById, onRemove, onTapSlot, showDots }: PositionSlotProps) {
  const { activeDragPlayerId, absentPlayerIds, isTouchDevice, isEditMode, selectedPlayerId } = useDragState();

  const draggingAbsent = activeDragPlayerId ? absentPlayerIds.has(activeDragPlayerId) : false;

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotRef.slotId}-${slotRef.position}`,
    data: { type: 'slot', slotRef },
    disabled: readOnly || draggingAbsent,
  });

  // ── Landing flash ────────────────────────────────────────────────────
  // Fire when a *different* player arrives in this slot (skip initial page load).
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

  // ── Target detection ────────────────────────────────────────────────
  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) : null;
  const highlightPref  = selectedPlayer?.positions[slotRef.position];
  const isOwnSlot      = !!selectedPlayerId && selectedPlayerId === player?.id;
  const baseCondition  = !readOnly && isEditMode && !!selectedPlayerId && !isOwnSlot;

  const isValidTarget   = baseCondition && (highlightPref === 'preferred' || highlightPref === 'acceptable');
  const isRefusedTarget = baseCondition && highlightPref === 'refused';
  const isPreferred     = highlightPref === 'preferred';
  // Empty targets → pulsing background layer (text stays static).
  // Occupied targets → steady ring (no animation to avoid flashing chip content).
  const isEmptyPulse    = (isValidTarget || isRefusedTarget) && !player;
  const isOccupiedRing  = (isValidTarget || isRefusedTarget) && !!player;

  // Color tokens driven by preference tier (matches dot grid colors):
  //   preferred → green, acceptable → blue, refused → red
  const pulseLayerClass = isEmptyPulse
    ? (isRefusedTarget
      ? 'absolute inset-0 rounded-md border-2 border-dashed border-red-400 bg-red-50 animate-pulse pointer-events-none'
      : isPreferred
        ? 'absolute inset-0 rounded-md border-2 border-dashed border-green-400 bg-green-50 animate-pulse pointer-events-none'
        : 'absolute inset-0 rounded-md border-2 border-dashed border-blue-400 bg-blue-50 animate-pulse pointer-events-none')
    : '';

  // Dashed border (not solid ring) so it doesn't stack visually with the chip's own border-2.
  const occupiedDashColor = isOccupiedRing
    ? (isRefusedTarget ? 'border-red-400' : isPreferred ? 'border-green-400' : 'border-blue-400')
    : '';

  function handleClick(e: React.MouseEvent) {
    if (readOnly) return;
    if (isEditMode && selectedPlayerId && onTapSlot) {
      e.stopPropagation();
      onTapSlot();
    }
  }

  // ── Desktop drag colors ──────────────────────────────────────────────
  let dragColorClass = '';
  if (activeDragPlayerId && !readOnly && !draggingAbsent) {
    const activePlayer = playersById.get(activeDragPlayerId);
    if (activePlayer?.is_active) {
      const pref: Preference = activePlayer.positions[slotRef.position] ?? 'unset';
      dragColorClass = SLOT_DRAG_COLORS[pref];
    }
  }

  // ── Slot wrapper styling ─────────────────────────────────────────────
  // Priority: drag feedback > occupied ring > empty pulse layer > occupied transparent > empty dashed
  const specialState = isOver || !!dragColorClass;
  const slotBorder = specialState
    ? (isOver
      ? `border-2 border-gray-300 scale-105 ${dragColorClass || 'bg-gray-50'}`
      : `border-0 ${dragColorClass}`)
    : isOccupiedRing
    ? `border-2 border-dashed bg-transparent ${occupiedDashColor}`  // dashed so it doesn't stack with chip border
    : player
    ? 'border-0 bg-transparent'          // chip is the only visual element
    : isEmptyPulse
    ? 'border-0 bg-transparent'          // absolute pulse layer provides visuals
    : 'border-2 border-dashed border-gray-200 bg-white';

  // p-0 everywhere except dashed slots (empty + occupied targets) and drag-feedback states
  const outerPad = specialState ? 'p-1'
    : isOccupiedRing ? 'p-1'             // breathing room between dashed border and chip
    : (!player && !isEmptyPulse) ? 'p-1' // normal dashed empty needs breathing room
    : 'p-0';

  const minH    = isTouchDevice ? 'min-h-[76px]' : 'min-h-[3rem]';
  const pointer = (isValidTarget || isRefusedTarget) && !readOnly ? 'cursor-pointer' : '';

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`relative flex ${minH} min-w-0 w-full items-center rounded-md transition-all ${outerPad} ${slotBorder} ${pointer} ${player && justPlaced ? 'just-placed' : ''}`}
    >
      {/* Pulsing background layer — only for EMPTY targets so text never flashes */}
      {isEmptyPulse && (
        <div className={pulseLayerClass} aria-hidden="true" />
      )}

      {player ? (
        <PlayerChip
          key={player.id}
          player={player}
          fromSlot={slotRef}
          readOnly={readOnly}
          onRemove={onRemove}
          showDots={showDots}
          preferenceClass={
            player.is_active
              ? getChipClass(player.positions[slotRef.position] ?? 'unset', slotRef.position)
              : undefined
          }
        />
      ) : (
        <span className="relative z-10 w-full text-center text-xs text-gray-300 select-none">—</span>
      )}
    </div>
  );
}
