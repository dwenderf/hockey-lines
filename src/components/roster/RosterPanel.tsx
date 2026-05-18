'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { RosterPlayer as RosterPlayerComponent } from './RosterPlayer';
import { AddPlayerForm } from './AddPlayerForm';
import { PlayerSearch } from './PlayerSearch';
import { PreferenceEditor } from '@/components/preferences/PreferenceEditor';
import type { RosterPlayer, Position, Preference } from '@/lib/types';

interface RosterPanelProps {
  players: RosterPlayer[];
  assignedPlayerIds: Set<string>;
  absentPlayerIds?: Set<string>;
  teamId?: string;
  readOnly?: boolean;
  onAdd?: (name: string, isGoalie: boolean) => void;
  onAddExisting?: (playerId: string) => void;
  onDeactivate?: (rosterId: string) => void;
  onMarkAbsent?: (playerId: string) => void;
  onMarkAvailable?: (playerId: string) => void;
  onUpdatePreference?: (rosterId: string, pos: Position, pref: Exclude<Preference, 'unset'> | null) => void;
}

export function RosterPanel({
  players,
  assignedPlayerIds,
  absentPlayerIds,
  teamId,
  readOnly,
  onAdd,
  onAddExisting,
  onDeactivate,
  onMarkAbsent,
  onMarkAvailable,
  onUpdatePreference,
}: RosterPanelProps) {
  const [addMode, setAddMode] = useState<'search' | 'new'>('search');
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: 'roster-dropzone',
    data: { type: 'roster' },
    disabled: readOnly,
  });

  const active = players.filter((p) => p.is_active);
  const inactive = players.filter((p) => !p.is_active);
  const outThisGame = absentPlayerIds ? active.filter((p) => absentPlayerIds.has(p.id)) : [];
  const skaters = active.filter((p) => !p.is_goalie && !absentPlayerIds?.has(p.id));
  const goalies = active.filter((p) => p.is_goalie && !absentPlayerIds?.has(p.id));

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
              onMarkAbsent={onMarkAbsent ? () => onMarkAbsent(p.id) : undefined}
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
                  onMarkAbsent={onMarkAbsent ? () => onMarkAbsent(p.id) : undefined}
                  onDeactivate={onDeactivate ? () => onDeactivate(p.roster_id) : undefined}
                />
              ))}
            </div>
          </>
        )}

        {outThisGame.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-amber-500">
              Out this game ({outThisGame.length})
            </p>
            <div className="space-y-1.5">
              {outThisGame.map((p) => (
                <RosterPlayerComponent
                  key={p.id}
                  player={p}
                  isAssigned={false}
                  isAbsent
                  readOnly={readOnly}
                  onMarkAvailable={onMarkAvailable ? () => onMarkAvailable(p.id) : undefined}
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

      {!readOnly && (onAdd || onAddExisting) && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Add Player</p>
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setAddMode('search')}
                className={`rounded px-2 py-0.5 ${addMode === 'search' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Search
              </button>
              <button
                onClick={() => setAddMode('new')}
                className={`rounded px-2 py-0.5 ${addMode === 'new' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                New
              </button>
            </div>
          </div>
          {addMode === 'search' && teamId && onAddExisting ? (
            <PlayerSearch teamId={teamId} onAdd={onAddExisting} />
          ) : addMode === 'new' && onAdd ? (
            <AddPlayerForm onAdd={onAdd} />
          ) : null}
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
