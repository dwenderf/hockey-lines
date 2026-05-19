'use client';

import { useState, useCallback, useMemo } from 'react';
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
import { useTeams } from '@/hooks/useTeams';
import { useGames } from '@/hooks/useGames';
import { usePlayers } from '@/hooks/usePlayers';
import { useForwardSlots } from '@/hooks/useForwardSlots';
import { useDefenseSlots } from '@/hooks/useDefenseSlots';
import { useGameAbsences } from '@/hooks/useGameAbsences';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { DragStateContext } from '@/hooks/useDragState';
import { LinesBoard } from '@/components/lines/LinesBoard';
import { CollisionDialog } from '@/components/lines/CollisionDialog';
import { RosterPanel } from '@/components/roster/RosterPanel';
import { BenchCarousel } from '@/components/roster/BenchCarousel';
import { GameSelector } from '@/components/games/GameSelector';
import { AddGameForm } from '@/components/games/AddGameForm';
import { PlayerChip } from '@/components/lines/PlayerChip';
import { Button } from '@/components/ui/Button';
import type { SlotRef, DraggableData, DroppableData } from '@/lib/types';

interface CollisionState {
  incomingPlayerId: string;
  occupantId: string;
  targetSlotRef: SlotRef;
  /** null when incoming player is from the bench carousel (no swap possible) */
  sourceSlotRef: SlotRef | null;
}

export default function ManagePage() {
  const { teams, selectedTeamId, setSelectedTeamId } = useTeams();
  const { games, selectedGameId, setSelectedGameId, addGame, publishGame, unpublishGame } = useGames(selectedTeamId);
  const { players, updatePreference } = usePlayers(selectedTeamId);
  const { absentPlayerIds, markAbsent, markAvailable } = useGameAbsences(selectedGameId);
  const { slots: forwardSlots, updateSlot: updateForwardSlot, addLine: addForwardLine } = useForwardSlots(selectedGameId);
  const { slots: defenseSlots, updateSlot: updateDefenseSlot, addLine: addDefenseLine } = useDefenseSlots(selectedGameId);

  const [activeDragPlayerId, setActiveDragPlayerId] = useState<string | null>(null);
  const [collision, setCollision] = useState<CollisionState | null>(null);
  const [showAddGame, setShowAddGame] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isTouchDevice = useIsTouchDevice();

  const selectedGame = games.find((g) => g.id === selectedGameId) ?? null;

  const copyGameLink = () => {
    if (!selectedGameId) return;
    navigator.clipboard.writeText(`${window.location.origin}/game/${selectedGameId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  function exitEditMode() {
    setIsEditMode(false);
    setSelectedPlayerId(null);
  }

  // Touch devices use tap-to-place (no drag). PointerSensor handles mouse/trackpad drag on desktop.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const placementMap = useMemo(() => {
    const map = new Map<string, SlotRef>();
    for (const slot of forwardSlots) {
      const cols = [
        { col: 'lw_player_id', pos: 'LW' as const },
        { col: 'c_player_id', pos: 'C' as const },
        { col: 'rw_player_id', pos: 'RW' as const },
      ];
      for (const { col, pos } of cols) {
        const pid = slot[col as keyof typeof slot] as string | null;
        if (pid) map.set(pid, { table: 'forward_line_slots', slotId: slot.id, column: col, position: pos });
      }
    }
    for (const slot of defenseSlots) {
      const cols = [
        { col: 'ld_player_id', pos: 'LD' as const },
        { col: 'rd_player_id', pos: 'RD' as const },
      ];
      for (const { col, pos } of cols) {
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
        // Clear from slot first if assigned
        if (placementMap.has(playerId)) {
          updateSlotByRef(placementMap.get(playerId)!, null);
        }
        markAbsent(playerId);
        return;
      }

      if (dropData.type === 'skaters-section') {
        if (player && !player.is_active) {
          // reactivatePlayer removed — roster admin handles this
        } else if (absentPlayerIds.has(playerId)) {
          markAvailable(playerId);
        }
        return;
      }

      if (dropData.type === 'out-this-game') {
        if (player?.is_active && !absentPlayerIds.has(playerId)) {
          // Clear from slot first if assigned
          if (placementMap.has(playerId)) {
            updateSlotByRef(placementMap.get(playerId)!, null);
          }
          markAbsent(playerId);
        }
        return;
      }

      if (dropData.type === 'inactive-section') {
        // Deactivate removed — roster admin handles this
        return;
      }

      if (dropData.type === 'roster') {
        if (!player?.is_active) return;
        if (absentPlayerIds.has(playerId)) {
          markAvailable(playerId);
          return;
        }
        if (dragData.type === 'slot-player') {
          updateSlotByRef(dragData.fromSlot, null);
        }
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
          // Collision — show dialog instead of overwriting.
          // Source slot is NOT cleared yet; dialog actions will handle it.
          setCollision({
            incomingPlayerId: playerId,
            occupantId: currentOccupantId,
            targetSlotRef: targetRef,
            sourceSlotRef: dragData.type === 'slot-player' ? dragData.fromSlot : null,
          });
          return;
        }

        // Empty target — proceed immediately.
        if (dragData.type === 'slot-player') {
          updateSlotByRef(dragData.fromSlot, null);
        }
        updateSlotByRef(targetRef, playerId);
      }
    },
    [placementMap, updateSlotByRef, playersById, assignedPlayerIds, absentPlayerIds, markAbsent, markAvailable]
  );

  const handleRemoveFromSlot = useCallback(
    (slotRef: SlotRef) => {
      updateSlotByRef(slotRef, null);
    },
    [updateSlotByRef]
  );

  const handleTapToPlace = useCallback(
    (slotRef: SlotRef) => {
      if (!selectedPlayerId) return;
      const player = playersById.get(selectedPlayerId);
      if (!player?.is_active || absentPlayerIds.has(selectedPlayerId)) return;

      const sourceSlotRef = placementMap.get(selectedPlayerId) ?? null;

      // Find the current occupant of the target slot (if any).
      const targetOccupantId = [...placementMap.entries()].find(
        ([, ref]) => ref.slotId === slotRef.slotId && ref.column === slotRef.column
      )?.[0] ?? null;

      if (targetOccupantId === selectedPlayerId) {
        // Tapping own slot — deselect without moving.
        setIsEditMode(false);
        setSelectedPlayerId(null);
        return;
      }

      if (targetOccupantId) {
        // Collision — pause and ask the user what to do.
        setCollision({
          incomingPlayerId: selectedPlayerId,
          occupantId: targetOccupantId,
          targetSlotRef: slotRef,
          sourceSlotRef,
        });
        return; // keep edit mode + selection alive until dialog resolves
      }

      // Empty target — proceed immediately.
      if (sourceSlotRef) {
        updateSlotByRef(sourceSlotRef, null);
      }
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
    // Clear from slot first if assigned
    if (placementMap.has(selectedPlayerId)) {
      updateSlotByRef(placementMap.get(selectedPlayerId)!, null);
    }
    markAbsent(selectedPlayerId);
    setIsEditMode(false);
    setSelectedPlayerId(null);
  }, [selectedPlayerId, playersById, absentPlayerIds, placementMap, updateSlotByRef, markAbsent]);

  // ── Collision dialog handlers ─────────────────────────────────────────
  const handleCollisionReplace = useCallback(() => {
    if (!collision) return;
    const { incomingPlayerId, targetSlotRef, sourceSlotRef } = collision;
    if (sourceSlotRef) updateSlotByRef(sourceSlotRef, null); // vacate source
    updateSlotByRef(targetSlotRef, incomingPlayerId);        // occupant evicted to bench
    setCollision(null);
    setIsEditMode(false);
    setSelectedPlayerId(null);
  }, [collision, updateSlotByRef]);

  const handleCollisionSwap = useCallback(() => {
    if (!collision || !collision.sourceSlotRef) return;
    const { incomingPlayerId, occupantId, targetSlotRef, sourceSlotRef } = collision;
    updateSlotByRef(sourceSlotRef, occupantId);   // occupant moves to incoming's old slot
    updateSlotByRef(targetSlotRef, incomingPlayerId);
    setCollision(null);
    setIsEditMode(false);
    setSelectedPlayerId(null);
  }, [collision, updateSlotByRef]);

  const handleCollisionCancel = useCallback(() => {
    setCollision(null);
    // Touch: keep edit mode + selection so the user can tap a different slot.
    // Desktop: no selection state exists, nothing to preserve.
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

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
          className="flex h-screen flex-col bg-gray-100"
          onClick={(e) => {
            if (isEditMode && e.target === e.currentTarget) exitEditMode();
          }}
        >
          {/* Header */}
          <header className="border-b border-gray-200 bg-white shadow-sm relative">
            {/* Row 1: team name / team selector, action buttons */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                {teams.length > 1 ? (
                  <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTeamId(t.id)}
                        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors shrink-0 ${
                          selectedTeamId === t.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <h1 className="text-lg font-bold text-gray-900 truncate">
                    {teams[0]?.name ?? ''}
                  </h1>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                  {/* Desktop-only logout */}
                <Button variant="ghost" onClick={handleLogout} className="mobile-hide">
                  Logout
                </Button>
                {/* Mobile-only ⋯ menu */}
                <button
                  onClick={() => setShowMobileMenu((v) => !v)}
                  className="mobile-show hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 text-lg leading-none"
                >
                  ⋯
                </button>
              </div>
            </div>

            {/* Row 2: game selector + desktop secondary controls */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <GameSelector
                  games={games}
                  selectedGameId={selectedGameId}
                  onSelect={setSelectedGameId}
                />
                {/* Desktop-only: + Game button */}
                <Button variant="secondary" onClick={() => setShowAddGame(true)} className="mobile-hide shrink-0">
                  + Game
                </Button>
              </div>
              {/* Desktop-only publish controls */}
              <div className="flex items-center gap-2 shrink-0 mobile-hide">
                {selectedGame && (
                  selectedGame.is_published ? (
                    <>
                      <Button variant="secondary" onClick={copyGameLink}>
                        {copied ? 'Copied!' : 'Copy link'}
                      </Button>
                      <Button variant="ghost" onClick={() => unpublishGame(selectedGame.id)}>
                        Unpublish
                      </Button>
                    </>
                  ) : (
                    <Button variant="primary" onClick={() => publishGame(selectedGame.id)}>
                      Publish lines
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Mobile overflow dropdown menu */}
            {showMobileMenu && (
              <div className="mobile-show hidden absolute right-3 top-12 z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                <button
                  onClick={() => { setShowAddGame(true); setShowMobileMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  + Add Game
                </button>
                {selectedGame && (
                  selectedGame.is_published ? (
                    <>
                      <button
                        onClick={() => { copyGameLink(); setShowMobileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {copied ? 'Copied!' : 'Copy link'}
                      </button>
                      <button
                        onClick={() => { unpublishGame(selectedGame.id); setShowMobileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Unpublish
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { publishGame(selectedGame.id); setShowMobileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 font-medium hover:bg-gray-50"
                    >
                      Publish lines
                    </button>
                  )
                )}
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            )}
          </header>

          {/* Main */}
          <div
            className="manage-layout flex flex-1 overflow-hidden"
            onClick={(e) => {
              if (isEditMode && e.target === e.currentTarget) exitEditMode();
            }}
          >
            {/* Roster sidebar (desktop only) */}
            <aside className="roster-sidebar w-64 shrink-0 overflow-hidden border-r border-gray-200 bg-white p-3 flex flex-col">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Roster</h2>
              <div className="flex-1 overflow-hidden">
                <RosterPanel
                  players={players}
                  assignedPlayerIds={assignedPlayerIds}
                  absentPlayerIds={absentPlayerIds}
                  onUpdatePreference={updatePreference}
                />
              </div>
            </aside>

            {/* Lines board */}
            <main className="lines-main flex-1 overflow-y-auto p-6">
              {selectedGameId ? (
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
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-lg">No game selected</p>
                    <p className="text-sm">Create a game to start building lines</p>
                    <Button className="mt-4" onClick={() => setShowAddGame(true)}>+ Add Game</Button>
                  </div>
                </div>
              )}
            </main>

            {/* Bench carousel (mobile/touch only — hidden by default, shown via CSS) */}
            <div className="bench-carousel-wrapper hidden">
              <BenchCarousel
                players={players}
                assignedPlayerIds={assignedPlayerIds}
                absentPlayerIds={absentPlayerIds}
              />
            </div>
          </div>
        </div>

        {/* DragOverlay needs an explicit width — w-full collapses in a portal with no parent constraint */}
        <DragOverlay dropAnimation={null}>
          {activePlayer ? (
            <div style={{ width: '180px' }}>
              <PlayerChip player={activePlayer} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Collision resolution dialog — rendered outside DndContext so it's never obscured */}
      {collision && (() => {
        const incoming = playersById.get(collision.incomingPlayerId);
        const occupant = playersById.get(collision.occupantId);
        if (!incoming || !occupant) return null;
        return (
          <CollisionDialog
            incomingPlayer={incoming}
            occupantPlayer={occupant}
            canSwap={collision.sourceSlotRef !== null}
            onReplace={handleCollisionReplace}
            onSwap={handleCollisionSwap}
            onCancel={handleCollisionCancel}
          />
        );
      })()}

      <AddGameForm
        open={showAddGame}
        onClose={() => setShowAddGame(false)}
        onAdd={addGame}
      />
    </DragStateContext.Provider>
  );
}
