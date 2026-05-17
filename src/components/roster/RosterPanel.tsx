'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { RosterPlayer } from './RosterPlayer';
import { AddPlayerForm } from './AddPlayerForm';
import { PreferenceEditor } from '@/components/preferences/PreferenceEditor';
import type { Player, Position, Preference } from '@/lib/types';

interface RosterPanelProps {
  players: Player[];
  assignedPlayerIds: Set<string>;
  readOnly?: boolean;
  onAdd?: (name: string, isGoalie: boolean) => void;
  onRemove?: (playerId: string) => void;
  onUpdatePreference?: (playerId: string, pos: Position, pref: Exclude<Preference, 'unset'> | null) => void;
}

export function RosterPanel({
  players,
  assignedPlayerIds,
  readOnly,
  onAdd,
  onRemove,
  onUpdatePreference,
}: RosterPanelProps) {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: 'roster-dropzone',
    data: { type: 'roster' },
    disabled: readOnly,
  });

  const skaters = players.filter((p) => !p.is_goalie);
  const goalies = players.filter((p) => p.is_goalie);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto rounded-lg border-2 p-3 transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-200 bg-gray-50'
        }`}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Skaters ({skaters.length})
        </p>
        <div className="space-y-1.5">
          {skaters.map((p) => (
            <RosterPlayer
              key={p.id}
              player={p}
              isAssigned={assignedPlayerIds.has(p.id)}
              readOnly={readOnly}
              onEdit={onUpdatePreference ? () => setEditingPlayer(p) : undefined}
              onRemove={onRemove ? () => onRemove(p.id) : undefined}
            />
          ))}
          {skaters.length === 0 && (
            <p className="py-4 text-center text-xs text-gray-400">No skaters yet</p>
          )}
        </div>

        {goalies.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Goalies ({goalies.length})
            </p>
            <div className="space-y-1.5">
              {goalies.map((p) => (
                <RosterPlayer
                  key={p.id}
                  player={p}
                  isAssigned={assignedPlayerIds.has(p.id)}
                  readOnly={readOnly}
                  onRemove={onRemove ? () => onRemove(p.id) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {!readOnly && onAdd && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Add Player</p>
          <AddPlayerForm onAdd={onAdd} />
        </div>
      )}

      {editingPlayer && onUpdatePreference && (
        <PreferenceEditor
          player={editingPlayer}
          open={true}
          onClose={() => setEditingPlayer(null)}
          onUpdate={(pos, pref) => {
            onUpdatePreference(editingPlayer.id, pos, pref);
            setEditingPlayer((prev) =>
              prev
                ? {
                    ...prev,
                    positions: pref === null
                      ? Object.fromEntries(Object.entries(prev.positions).filter(([k]) => k !== pos))
                      : { ...prev.positions, [pos]: pref },
                  }
                : null
            );
          }}
        />
      )}
    </div>
  );
}
