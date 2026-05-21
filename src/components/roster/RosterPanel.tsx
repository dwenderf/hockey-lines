'use client';

import { useDroppable } from '@dnd-kit/core';
import { useDragState } from '@/hooks/useDragState';

import { RosterPlayer as RosterPlayerComponent } from './RosterPlayer';
import type { RosterPlayer, Position, Preference } from '@/lib/types';

interface RosterPanelProps {
  players: RosterPlayer[];
  assignedPlayerIds: Set<string>;
  absentPlayerIds?: Set<string>;
  readOnly?: boolean;
  onUpdatePreference?: (rosterId: string, pos: Position, pref: Exclude<Preference, 'unset'> | null) => void;
  onEditPlayer?: (player: RosterPlayer) => void;
}

export function RosterPanel({
  players,
  assignedPlayerIds,
  absentPlayerIds,
  readOnly,
  onUpdatePreference,
  onEditPlayer,
}: RosterPanelProps) {

  const { activeDragPlayerId } = useDragState();
  const activeDragPlayer = activeDragPlayerId ? players.find((p) => p.id === activeDragPlayerId) : null;
  const draggingInactive = activeDragPlayer ? !activeDragPlayer.is_active : false;
  const draggingAbsent = activeDragPlayerId ? absentPlayerIds?.has(activeDragPlayerId) ?? false : false;

  const { setNodeRef, isOver } = useDroppable({
    id: 'roster-dropzone',
    data: { type: 'roster' },
    // Re-enabled for absent players: the whole panel becomes the drop target
    disabled: readOnly || draggingInactive,
  });

  const { setNodeRef: setInactiveRef, isOver: isOverInactive } = useDroppable({
    id: 'inactive-zone',
    data: { type: 'inactive-section' },
    // Disable for absent AND inactive — neither belongs here
    disabled: readOnly || draggingAbsent || draggingInactive,
  });

  const { setNodeRef: setSkatersRef, isOver: isOverSkaters } = useDroppable({
    id: 'skaters-section',
    data: { type: 'skaters-section' },
    // Disable for absent: roster-dropzone handles it as one large target
    disabled: readOnly || draggingAbsent,
  });

  const { setNodeRef: setOutRef, isOver: isOverOut } = useDroppable({
    id: 'out-this-game',
    data: { type: 'out-this-game' },
    disabled: readOnly || absentPlayerIds === undefined || draggingInactive,
  });

  const active = players.filter((p) => p.is_active);
  const inactive = players.filter((p) => !p.is_active);
  const outThisGame = absentPlayerIds ? active.filter((p) => absentPlayerIds.has(p.id)) : [];
  const skaters = active.filter((p) => !p.is_goalie && !absentPlayerIds?.has(p.id) && !assignedPlayerIds.has(p.id));
  const goalies = active.filter((p) => p.is_goalie && !absentPlayerIds?.has(p.id));

  return (
    <div className="flex flex-col gap-4 h-full">
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-lg border-2 p-3 transition-colors ${
          isOver && draggingAbsent ? 'border-green-400 bg-green-50' : isOver && !draggingInactive ? 'border-blue-400 bg-blue-50' : 'border-dashed'
        }`}
        style={!(isOver) ? { borderColor: 'var(--border)', backgroundColor: 'var(--bg-page)' } : undefined}
      >
        <div
          ref={setSkatersRef}
          className={`rounded-lg border-2 p-1 transition-colors ${
            isOverSkaters && !draggingAbsent ? 'border-green-400 bg-green-50' : 'border-transparent'
          }`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--dot-preferred)' }}>
            Skaters ({skaters.length})
          </p>
          <div className="space-y-1.5">
            {skaters.map((p) => (
              <RosterPlayerComponent
                key={p.id}
                player={p}
                isAssigned={assignedPlayerIds.has(p.id)}
                readOnly={readOnly}
                onEdit={onEditPlayer ? () => onEditPlayer(p) : undefined}
              />
            ))}
            {skaters.length === 0 && (
              <p className="py-4 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>No skaters yet</p>
            )}
          </div>
        </div>

        {goalies.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Goalies ({goalies.length})
            </p>
            <div className="space-y-1.5">
              {goalies.map((p) => (
                <RosterPlayerComponent
                  key={p.id}
                  player={p}
                  isAssigned={assignedPlayerIds.has(p.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </>
        )}

        {absentPlayerIds !== undefined && (
          <div
            ref={setOutRef}
            className={`mt-4 rounded-lg border-2 p-1 transition-colors ${
              isOverOut && !draggingInactive ? 'border-amber-400 bg-amber-50' : 'border-transparent'
            }`}
          >
            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${isOverOut && !draggingInactive ? 'text-amber-600' : 'text-amber-500'}`}>
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
                />
              ))}
              {outThisGame.length === 0 && (
                <p className="py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>No players marked out</p>
              )}
            </div>
          </div>
        )}

        <div
          ref={setInactiveRef}
          className={`mt-4 rounded-lg border-2 transition-colors ${
            isOverInactive && !draggingAbsent && !draggingInactive ? 'border-red-300 bg-red-50' : 'border-dashed border-transparent'
          }`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Inactive ({inactive.length})
            {!readOnly && <span className="ml-1 font-normal normal-case">— drag here to deactivate</span>}
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
            {inactive.length === 0 && (
              <p className="py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>No inactive players</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
