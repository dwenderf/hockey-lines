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
import { DragStateContext } from '@/hooks/useDragState';
import { LinesBoard } from '@/components/lines/LinesBoard';
import { RosterPanel } from '@/components/roster/RosterPanel';
import { GameSelector } from '@/components/games/GameSelector';
import { AddGameForm } from '@/components/games/AddGameForm';
import { PlayerChip } from '@/components/lines/PlayerChip';
import { Button } from '@/components/ui/Button';
import type { SlotRef, DraggableData, DroppableData } from '@/lib/types';

export default function ManagePage() {
  const { teams, selectedTeamId, setSelectedTeamId } = useTeams();
  const { games, selectedGameId, setSelectedGameId, addGame } = useGames(selectedTeamId);
  const { players, addPlayer, addExistingPlayer, deactivatePlayer, updatePreference, updateLevel } = usePlayers(selectedTeamId);
  const { absentPlayerIds, markAbsent, markAvailable } = useGameAbsences(selectedGameId);
  const { slots: forwardSlots, updateSlot: updateForwardSlot, addLine: addForwardLine } = useForwardSlots(selectedGameId);
  const { slots: defenseSlots, updateSlot: updateDefenseSlot, addLine: addDefenseLine } = useDefenseSlots(selectedGameId);

  const [activeDragPlayerId, setActiveDragPlayerId] = useState<string | null>(null);
  const [showAddGame, setShowAddGame] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  // Build a map: playerId -> SlotRef (where they are currently placed)
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

      if (dropData.type === 'roster') {
        // Remove from source slot if dragged from a slot
        if (dragData.type === 'slot-player') {
          updateSlotByRef(dragData.fromSlot, null);
        }
        return;
      }

      if (dropData.type === 'slot') {
        const targetRef = dropData.slotRef;
        // Find who is currently in target slot
        const currentOccupantId = [...placementMap.entries()].find(
          ([, ref]) => ref.slotId === targetRef.slotId && ref.column === targetRef.column
        )?.[0] ?? null;

        if (currentOccupantId === playerId) return; // no-op: same player, same slot

        if (dragData.type === 'slot-player') {
          const fromRef = dragData.fromSlot;
          if (currentOccupantId) {
            // Swap
            updateSlotByRef(fromRef, currentOccupantId);
          } else {
            // Vacate source slot
            updateSlotByRef(fromRef, null);
          }
        }
        // Place dragged player into target
        updateSlotByRef(targetRef, playerId);
      }
    },
    [placementMap, updateSlotByRef]
  );

  const handleRemoveFromSlot = useCallback(
    (slotRef: SlotRef) => {
      updateSlotByRef(slotRef, null);
    },
    [updateSlotByRef]
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const activePlayer = activeDragPlayerId ? playersById.get(activeDragPlayerId) : null;

  return (
    <DragStateContext.Provider value={{ activeDragPlayerId }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-screen flex-col bg-gray-100">
          {/* Header */}
          <header className="border-b border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-gray-900">Hockey Lines</h1>
                {teams.length > 1 && (
                  <>
                    <span className="text-gray-300">|</span>
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
                  </>
                )}
                {teams.length === 1 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm font-medium text-gray-700">{teams[0].name}</span>
                  </>
                )}
                <span className="text-gray-300">|</span>
                <GameSelector
                  games={games}
                  selectedGameId={selectedGameId}
                  onSelect={setSelectedGameId}
                />
                <Button variant="secondary" onClick={() => setShowAddGame(true)}>
                  + Game
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <a href="/" target="_blank" className="text-xs text-blue-500 hover:underline">
                  Public view ↗
                </a>
                <Button variant="ghost" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {/* Main */}
          <div className="flex flex-1 overflow-hidden">
            {/* Roster sidebar */}
            <aside className="w-64 shrink-0 overflow-hidden border-r border-gray-200 bg-white p-3 flex flex-col">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Roster</h2>
              <div className="flex-1 overflow-hidden">
                <RosterPanel
                  players={players}
                  assignedPlayerIds={assignedPlayerIds}
                  absentPlayerIds={absentPlayerIds}
                  teamId={selectedTeamId ?? undefined}
                  onAdd={addPlayer}
                  onAddExisting={addExistingPlayer}
                  onDeactivate={deactivatePlayer}
                  onMarkAbsent={markAbsent}
                  onMarkAvailable={markAvailable}
                  onUpdatePreference={updatePreference}
                />
              </div>
            </aside>

            {/* Lines board */}
            <main className="flex-1 overflow-y-auto p-6">
              {selectedGameId ? (
                <LinesBoard
                  forwardSlots={forwardSlots}
                  defenseSlots={defenseSlots}
                  players={players}
                  onRemoveFromSlot={handleRemoveFromSlot}
                  onAddForwardLine={addForwardLine}
                  onAddDefenseLine={addDefenseLine}
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
