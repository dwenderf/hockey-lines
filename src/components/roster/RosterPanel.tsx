'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { RosterPlayer as RosterPlayerComponent } from './RosterPlayer';
import { AddPlayerForm } from './AddPlayerForm';
import { PreferenceEditor } from '@/components/preferences/PreferenceEditor';
import type { RosterPlayer, Position, Preference } from '@/lib/types';

interface RosterPanelProps {
  players: RosterPlayer[];
  assignedPlayerIds: Set<string>;
  readOnly?: boolean;
  onAdd?: (name: string, isGoalie: boolean) => void;
  onDeactivate?: (rosterId: string) => void;
  onUpdatePreference?: (rosterId: string, pos: Position, pref: Exclude<Preference, 'unset'> | null) => void;
}

export function RosterPanel({
  players,
  assignedPlayerIds,
  readOnly,
  onAdd,
  onDeactivate,
  onUpdatePreference,
}: RosterPanelProps) {
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: 'roster-dropzone',
    data: { type: 'roster' },
    disabled: readOnly,
  });

  const active = players.filter((p) => p.is_active);
  const inactive = players.filter((p) => !p.is_active);
  const skaters = active.filter((p) => !p.is_goalie);
  const goalies = active.filter((p) => p.is_goalie);

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
            <RosterPlayerComponent
              key={p.id}
              player={p}
              isAssigned={assignedPlayerIds.has(p.id)}
              readOnly={readOnly}
              onEdit={onUpdatePreference ? () => setEditingPlayer(p) : undefined}
              onDeactivate={onDeactivate ? () => onDeactivate(p.roster_id) : undefined}
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
                <RosterPlayerComponent
                  key={p.id}
                  player={p}
                  isAssigned={assignedPlayerIds.has(p.id)}
                  readOnly={readOnly}
                  onDeactivate={onDeactivate ? () => onDeactivate(p.roster_id) : undefined}
                />
              ))}
            </div>
          </>
        )}

        {inactive.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Inactive ({inactive.length})
            </p>
            <div className="space-y-1.5">
              {inactive.map((p) => (
                <RosterPlayerComponent
                  key={p.id}
                  player={p}
                  isAssigned={false}
                  readOnly={readOnly}
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
            onUpdatePreference(editingPlayer.roster_id, pos, pref);
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
