'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { usePlayers } from '@/hooks/usePlayers';
import { useForwardSlots } from '@/hooks/useForwardSlots';
import { useDefenseSlots } from '@/hooks/useDefenseSlots';
import { useGameAbsences } from '@/hooks/useGameAbsences';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { DragStateContext } from '@/hooks/useDragState';
import { LinesBoard } from '@/components/lines/LinesBoard';
import { CollisionDialog } from '@/components/lines/CollisionDialog';
import { PlayerEditModal } from '@/components/lines/PlayerEditModal';
import { RosterPanel } from '@/components/roster/RosterPanel';
import { BenchCarousel } from '@/components/roster/BenchCarousel';
import { BackToTeam } from '@/components/BackToTeam';
import { formatOpponent } from '@/lib/formatOpponent';
import { PlayerChip } from '@/components/lines/PlayerChip';
import type { Game, SlotRef, DraggableData, DroppableData, RosterPlayer } from '@/lib/types';

function formatGameDate(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface CollisionState {
  incomingPlayerId: string;
  occupantId: string;
  targetSlotRef: SlotRef;
  /** null when the incoming player is from the bench (no swap possible) */
  sourceSlotRef: SlotRef | null;
}

interface CaptainGameViewProps {
  teamId: string;
  gameId: string;
  initialGame: Game;
  teamName: string;
}

export function CaptainGameView({ teamId, gameId, initialGame, teamName }: CaptainGameViewProps) {
  // Local game state — allows optimistic publish/unpublish updates
  const [game, setGame] = useState<Game>(initialGame);

  const { players } = usePlayers(teamId);
  const { absentPlayerIds, markAbsent, markAvailable } = useGameAbsences(gameId);
  const { slots: forwardSlots, updateSlot: updateForwardSlot, addLine: addForwardLine } = useForwardSlots(gameId);
  const { slots: defenseSlots, updateSlot: updateDefenseSlot, addLine: addDefenseLine } = useDefenseSlots(gameId);

  const [activeDragPlayerId, setActiveDragPlayerId] = useState<string | null>(null);
  const [collision, setCollision]                   = useState<CollisionState | null>(null);
  const [isEditMode, setIsEditMode]                 = useState(false);
  const [selectedPlayerId, setSelectedPlayerId]     = useState<string | null>(null);
  const [showDots, setShowDots]                     = useState(false);
  const [showDotMenu, setShowDotMenu]               = useState(false);
  const [editingPlayer, setEditingPlayer]           = useState<RosterPlayer | null>(null);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  const isTouchDevice = useIsTouchDevice();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const placementMap = useMemo(() => {
    const map = new Map<string, SlotRef>();
    for (const slot of forwardSlots) {
      for (const { col, pos } of [
        { col: 'lw_player_id', pos: 'LW' as const },
        { col: 'c_player_id',  pos: 'C'  as const },
        { col: 'rw_player_id', pos: 'RW' as const },
      ]) {
        const pid = slot[col as keyof typeof slot] as string | null;
        if (pid) map.set(pid, { table: 'forward_line_slots', slotId: slot.id, column: col, position: pos });
      }
    }
    for (const slot of defenseSlots) {
      for (const { col, pos } of [
        { col: 'ld_player_id', pos: 'LD' as const },
        { col: 'rd_player_id', pos: 'RD' as const },
      ]) {
        const pid = slot[col as keyof typeof slot] as string | null;
        if (pid) map.set(pid, { table: 'defense_line_slots', slotId: slot.id, column: col, position: pos });
      }
    }
    return map;
  }, [forwardSlots, defenseSlots]);

  const assignedPlayerIds = useMemo(() => new Set(placementMap.keys()), [placementMap]);

  const scratchedPlayers = useMemo(
    () => players.filter((p) => p.is_active && absentPlayerIds.has(p.id)),
    [players, absentPlayerIds]
  );

  // ── Slot mutations ─────────────────────────────────────────────────────
  const updateSlotByRef = useCallback(
    (slotRef: SlotRef, playerId: string | null) => {
      if (slotRef.table === 'forward_line_slots') {
        updateForwardSlot(slotRef.slotId, slotRef.column, playerId);
      } else {
        updateDefenseSlot(slotRef.slotId, slotRef.column, playerId);
      }
    },
    [updateForwardSlot, updateDefenseSlot]
  );

  // ── Publish / unpublish ────────────────────────────────────────────────
  const publishGame = useCallback(async () => {
    const supabase = createClient();
    await supabase.from('games').update({ is_published: true }).eq('id', gameId);
    setGame((g) => ({ ...g, is_published: true }));
  }, [gameId]);

  const unpublishGame = useCallback(async () => {
    const supabase = createClient();
    await supabase.from('games').update({ is_published: false }).eq('id', gameId);
    setGame((g) => ({ ...g, is_published: false }));
  }, [gameId]);

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    window.location.href = `/team/${teamId}`;
  }, [teamId]);

  useEffect(() => {
    if (!showDotMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) {
        setShowDotMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDotMenu]);

  // ── Edit mode helpers ──────────────────────────────────────────────────
  function exitEditMode() {
    setIsEditMode(false);
    setSelectedPlayerId(null);
  }

  // ── Drag handlers ──────────────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DraggableData;
    setActiveDragPlayerId(data.playerId);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragPlayerId(null);
      const { active, over } = event;
      if (!over) return;

      const dragData = active.data.current as DraggableData;
      const dropData = over.data.current as DroppableData;
      const playerId = dragData.playerId;
      const player = playersById.get(playerId);

      if (dropData.type === 'scratched-zone') {
        if (!player?.is_active || absentPlayerIds.has(playerId)) return;
        if (placementMap.has(playerId)) updateSlotByRef(placementMap.get(playerId)!, null);
        markAbsent(playerId);
        return;
      }

      if (dropData.type === 'skaters-section') {
        if (absentPlayerIds.has(playerId)) markAvailable(playerId);
        return;
      }

      if (dropData.type === 'out-this-game') {
        if (player?.is_active && !absentPlayerIds.has(playerId)) {
          if (placementMap.has(playerId)) updateSlotByRef(placementMap.get(playerId)!, null);
          markAbsent(playerId);
        }
        return;
      }

      if (dropData.type === 'inactive-section') return;

      if (dropData.type === 'roster') {
        if (!player?.is_active) return;
        if (absentPlayerIds.has(playerId)) { markAvailable(playerId); return; }
        if (dragData.type === 'slot-player') updateSlotByRef(dragData.fromSlot, null);
        return;
      }

      if (dropData.type === 'slot') {
        if (!player?.is_active || absentPlayerIds.has(playerId)) return;

        const targetRef = dropData.slotRef;
        const currentOccupantId = [...placementMap.entries()].find(
          ([, ref]) => ref.slotId === targetRef.slotId && ref.column === targetRef.column
        )?.[0] ?? null;

        if (currentOccupantId === playerId) return;

        if (currentOccupantId !== null) {
          setCollision({
            incomingPlayerId: playerId,
            occupantId: currentOccupantId,
            targetSlotRef: targetRef,
            sourceSlotRef: dragData.type === 'slot-player' ? dragData.fromSlot : null,
          });
          return;
        }

        if (dragData.type === 'slot-player') updateSlotByRef(dragData.fromSlot, null);
        updateSlotByRef(targetRef, playerId);
      }
    },
    [placementMap, updateSlotByRef, playersById, absentPlayerIds, markAbsent, markAvailable]
  );

  // ── Touch tap-to-place handlers ────────────────────────────────────────
  const handleRemoveFromSlot = useCallback(
    (slotRef: SlotRef) => {
      updateSlotByRef(slotRef, null);
      setSelectedPlayerId(null);
      setIsEditMode(false);
    },
    [updateSlotByRef]
  );

  const handleTapToPlace = useCallback(
    (slotRef: SlotRef) => {
      if (!selectedPlayerId) return;
      const player = playersById.get(selectedPlayerId);
      if (!player?.is_active || absentPlayerIds.has(selectedPlayerId)) return;

      const sourceSlotRef = placementMap.get(selectedPlayerId) ?? null;
      const targetOccupantId = [...placementMap.entries()].find(
        ([, ref]) => ref.slotId === slotRef.slotId && ref.column === slotRef.column
      )?.[0] ?? null;

      if (targetOccupantId === selectedPlayerId) {
        setIsEditMode(false);
        setSelectedPlayerId(null);
        return;
      }

      if (targetOccupantId) {
        setCollision({
          incomingPlayerId: selectedPlayerId,
          occupantId: targetOccupantId,
          targetSlotRef: slotRef,
          sourceSlotRef,
        });
        return;
      }

      if (sourceSlotRef) updateSlotByRef(sourceSlotRef, null);
      updateSlotByRef(slotRef, selectedPlayerId);
      setIsEditMode(false);
      setSelectedPlayerId(null);
    },
    [selectedPlayerId, playersById, absentPlayerIds, placementMap, updateSlotByRef]
  );

  const handleTapToScratch = useCallback(() => {
    if (!selectedPlayerId) return;
    const player = playersById.get(selectedPlayerId);
    if (!player?.is_active || absentPlayerIds.has(selectedPlayerId)) return;
    if (placementMap.has(selectedPlayerId)) updateSlotByRef(placementMap.get(selectedPlayerId)!, null);
    markAbsent(selectedPlayerId);
    setIsEditMode(false);
    setSelectedPlayerId(null);
  }, [selectedPlayerId, playersById, absentPlayerIds, placementMap, updateSlotByRef, markAbsent]);

  // ── Collision dialog handlers ──────────────────────────────────────────
  const handleCollisionReplace = useCallback(() => {
    if (!collision) return;
    const { incomingPlayerId, targetSlotRef, sourceSlotRef } = collision;
    if (sourceSlotRef) updateSlotByRef(sourceSlotRef, null);
    updateSlotByRef(targetSlotRef, incomingPlayerId);
    setCollision(null);
    setIsEditMode(false);
    setSelectedPlayerId(null);
  }, [collision, updateSlotByRef]);

  const handleCollisionSwap = useCallback(() => {
    if (!collision || !collision.sourceSlotRef) return;
    const { incomingPlayerId, occupantId, targetSlotRef, sourceSlotRef } = collision;
    updateSlotByRef(sourceSlotRef, occupantId);
    updateSlotByRef(targetSlotRef, incomingPlayerId);
    setCollision(null);
    setIsEditMode(false);
    setSelectedPlayerId(null);
  }, [collision, updateSlotByRef]);

  const handleCollisionCancel = useCallback(() => {
    setCollision(null);
    exitEditMode();
  }, []);

  const activePlayer = activeDragPlayerId ? playersById.get(activeDragPlayerId) : null;

  return (
    <DragStateContext.Provider value={{
      activeDragPlayerId,
      absentPlayerIds,
      isTouchDevice,
      isEditMode,
      setEditMode: setIsEditMode,
      selectedPlayerId,
      setSelectedPlayerId,
    }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex h-dvh flex-col"
          style={{ backgroundColor: 'var(--bg-page)' }}
          onClick={(e) => {
            if (isEditMode && e.target === e.currentTarget) exitEditMode();
          }}
        >
          {/* Header */}
          <header
            className="border-b shadow-sm relative"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {/* Row 1: BackToTeam + action controls */}
            <div className="flex items-center justify-between px-4 pt-2 pb-0">
              <BackToTeam teamId={teamId} teamName={teamName} />
              <div className="flex items-center gap-3 shrink-0 ml-2">
                {game.is_published ? (
                  <div className="relative" ref={dotMenuRef}>
                    <button
                      onClick={() => setShowDotMenu((v) => !v)}
                      className="px-2 py-1 rounded-md text-base leading-none"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      ···
                    </button>
                    {showDotMenu && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border shadow-lg py-1"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                      >
                        <button
                          onClick={() => { unpublishGame(); setShowDotMenu(false); }}
                          className="w-full text-left px-4 py-2 text-sm"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Unpublish
                        </button>
                        <button
                          onClick={() => { handleLogout(); setShowDotMenu(false); }}
                          className="w-full text-left px-4 py-2 text-sm"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={publishGame}
                      className="px-3 py-1.5 rounded-md text-sm font-medium text-white"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      Publish
                    </button>
                    <button
                      onClick={handleLogout}
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Log out
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Opponent + date */}
            <div className="px-4 pb-3 pt-1">
              <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatOpponent(game.opponent, game.is_home)}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {formatGameDate(game.starts_at)}
              </p>
            </div>
          </header>

          {/* Sub-header — Show Preferred Positions toggle */}
          <div
            className="border-b px-4 py-2 flex items-center justify-end flex-shrink-0"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
              <span>Show Preferred Positions</span>
              <button
                role="switch"
                aria-checked={showDots}
                onClick={() => setShowDots((v) => !v)}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none"
                style={{ backgroundColor: showDots ? 'var(--accent)' : 'var(--border)' }}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    showDots ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Main — roster sidebar + lines board */}
          <div
            className="manage-layout flex flex-1 overflow-hidden"
            onClick={(e) => {
              if (isEditMode && e.target === e.currentTarget) exitEditMode();
            }}
          >
            {/* Roster sidebar (desktop only) */}
            <aside
              className="roster-sidebar w-64 shrink-0 overflow-hidden border-r p-3 flex flex-col"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <h2
                className="mb-2 text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Roster
              </h2>
              <div className="flex-1 overflow-hidden">
                <RosterPanel
                  players={players}
                  assignedPlayerIds={assignedPlayerIds}
                  absentPlayerIds={absentPlayerIds}
                  onEditPlayer={setEditingPlayer}
                />
              </div>
            </aside>

            {/* Lines board */}
            <main className="lines-main flex-1 overflow-y-auto p-6">
              <LinesBoard
                forwardSlots={forwardSlots}
                defenseSlots={defenseSlots}
                players={players}
                scratchedPlayers={scratchedPlayers}
                onRemoveFromSlot={handleRemoveFromSlot}
                onAddForwardLine={addForwardLine}
                onAddDefenseLine={addDefenseLine}
                onTapSlot={handleTapToPlace}
                onReturnFromScratch={markAvailable}
                onTapScratch={handleTapToScratch}
                showDots={showDots}
              />
            </main>

            {/* Bench carousel (mobile only) */}
            <div className="bench-carousel-wrapper hidden" style={{ height: 110 }}>
              <BenchCarousel
                players={players}
                assignedPlayerIds={assignedPlayerIds}
                absentPlayerIds={absentPlayerIds}
                onEditPlayer={setEditingPlayer}
              />
            </div>
          </div>
        </div>

        {/* DragOverlay — needs explicit width, collapses in a portal without a parent constraint */}
        <DragOverlay dropAnimation={null}>
          {activePlayer ? (
            <div style={{ width: '180px' }}>
              <PlayerChip player={activePlayer} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Collision dialog — outside DndContext so it's never obscured */}
      {collision && (() => {
        const incoming = playersById.get(collision.incomingPlayerId);
        const occupant = playersById.get(collision.occupantId);
        if (!incoming || !occupant) return null;
        return (
          <CollisionDialog
            incomingPlayer={incoming}
            occupantPlayer={occupant}
            targetPosition={collision.targetSlotRef.position}
            canSwap={collision.sourceSlotRef !== null}
            onReplace={handleCollisionReplace}
            onSwap={handleCollisionSwap}
            onCancel={handleCollisionCancel}
          />
        );
      })()}

      {editingPlayer && (
        <PlayerEditModal
          player={editingPlayer}
          teamId={teamId}
          onClose={() => setEditingPlayer(null)}
          onSaved={() => setEditingPlayer(null)}
        />
      )}
    </DragStateContext.Provider>
  );
}
