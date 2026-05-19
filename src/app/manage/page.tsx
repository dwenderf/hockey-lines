'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
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
import { RosterPanel } from '@/components/roster/RosterPanel';
import { BenchCarousel } from '@/components/roster/BenchCarousel';
import { GameSelector } from '@/components/games/GameSelector';
import { AddGameForm } from '@/components/games/AddGameForm';
import { PlayerChip } from '@/components/lines/PlayerChip';
import { Button } from '@/components/ui/Button';
import type { SlotRef, DraggableData, DroppableData } from '@/lib/types';

export default function ManagePage() {
  const { teams, selectedTeamId, setSelectedTeamId } = useTeams();
  const { games, selectedGameId, setSelectedGameId, addGame, publishGame, unpublishGame } = useGames(selectedTeamId);
  const { players, updatePreference } = usePlayers(selectedTeamId);
  const { absentPlayerIds, markAbsent, markAvailable } = useGameAbsences(selectedGameId);
  const { slots: forwardSlots, updateSlot: updateForwardSlot, addLine: addForwardLine } = useForwardSlots(selectedGameId);
  const { slots: defenseSlots, updateSlot: updateDefenseSlot, addLine: addDefenseLine } = useDefenseSlots(selectedGameId);

  const [activeDragPlayerId, setActiveDragPlayerId] = useState<string | null>(null);
  const [showAddGame, setShowAddGame] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
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

        if (dragData.type === 'slot-player') {
          const fromRef = dragData.fromSlot;
          if (currentOccupantId) {
            updateSlotByRef(fromRef, currentOccupantId);
          } else {
            updateSlotByRef(fromRef, null);
          }
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
      updateSlotByRef(slotRef, selectedPlayerId);
      setSelectedPlayerId(null);
    },
    [selectedPlayerId, updateSlotByRef]
  );

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
          className={`flex h-screen flex-col bg-gray-100 ${isEditMode ? 'edit-mode-active' : ''}`}
          onClick={(e) => {
            if (isEditMode && e.target === e.currentTarget) exitEditMode();
          }}
        >
          {/* Header */}
          <header className="border-b border-gray-200 bg-white shadow-sm">
            {/* Row 1: app title, team, edit mode done, logout */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-gray-900">Hockey Lines</h1>
                {teams.length > 1 && (
                  <div className="flex gap-1">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTeamId(t.id)}
                        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                          selectedTeamId === t.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
                {teams.length === 1 && (
                  <span className="text-sm font-medium text-gray-700">{teams[0].name}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditMode && (
                  <Button variant="primary" onClick={exitEditMode}>
                    Done
                  </Button>
                )}
                <Button variant="ghost" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
            {/* Row 2: game selector, add game, publish controls */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <GameSelector
                  games={games}
                  selectedGameId={selectedGameId}
                  onSelect={setSelectedGameId}
                />
                <Button variant="secondary" onClick={() => setShowAddGame(true)}>
                  + Game
                </Button>
              </div>
              <div className="flex items-center gap-2">
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

        <DragOverlay dropAnimation={null}>
          {activePlayer ? <PlayerChip player={activePlayer} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <AddGameForm
        open={showAddGame}
        onClose={() => setShowAddGame(false)}
        onAdd={addGame}
      />
    </DragStateContext.Provider>
  );
}
