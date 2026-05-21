'use client';

import { useState } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { PlayerTile } from './PlayerTile';
import { PlayerEditModal } from '@/components/lines/PlayerEditModal';
import type { RosterPlayer } from '@/lib/types';

interface RosterTabProps {
  teamId: string;
  isCaptain: boolean;
}

export function RosterTab({ teamId, isCaptain }: RosterTabProps) {
  const { players, loading, refreshPlayers } = usePlayers(teamId);
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const activePlayers = players.filter((p) => p.is_active && !p.is_goalie);
  const inactivePlayers = players.filter((p) => !p.is_active);
  const activeSkaterCount = activePlayers.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p style={{ color: 'var(--text-secondary)' }}>Loading roster…</p>
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-2xl mx-auto">
      {/* Section header */}
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        Skaters ({activeSkaterCount})
      </p>

      {/* Active players */}
      <div className="flex flex-col gap-2">
        {activePlayers.map((player) => (
          <PlayerTile
            key={player.roster_id}
            player={player}
            isCaptain={isCaptain}
            onClick={isCaptain ? () => setEditingPlayer(player) : undefined}
          />
        ))}
        {activePlayers.length === 0 && (
          <p className="py-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            No skaters yet
          </p>
        )}
      </div>

      {/* Inactive players */}
      {inactivePlayers.length > 0 && (
        <>
          <p
            className="text-xs font-semibold uppercase tracking-wider mt-5 mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Inactive ({inactivePlayers.length})
          </p>
          <div className="flex flex-col gap-2">
            {inactivePlayers.map((player) => (
              <PlayerTile
                key={player.roster_id}
                player={player}
                isCaptain={isCaptain}
                onClick={isCaptain ? () => setEditingPlayer(player) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {/* Add Player tile — captain only */}
      {isCaptain && (
        <button
          type="button"
          onClick={() => setShowAddPlayer(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium"
          style={{
            border: '2px dashed var(--border)',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
        >
          + Add player
        </button>
      )}

      {/* Edit player modal */}
      {editingPlayer && (
        <PlayerEditModal
          player={editingPlayer}
          teamId={teamId}
          onClose={() => setEditingPlayer(null)}
          onSaved={() => {
            setEditingPlayer(null);
            refreshPlayers();
          }}
        />
      )}

      {/* Add player modal */}
      {showAddPlayer && (
        <PlayerEditModal
          teamId={teamId}
          onClose={() => setShowAddPlayer(false)}
          onSaved={() => {
            setShowAddPlayer(false);
            refreshPlayers();
          }}
        />
      )}
    </div>
  );
}
