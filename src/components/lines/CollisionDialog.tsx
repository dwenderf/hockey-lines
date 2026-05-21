'use client';

import type { RosterPlayer, Position, Preference } from '@/lib/types';

interface CollisionDialogProps {
  incomingPlayer: RosterPlayer;
  occupantPlayer: RosterPlayer;
  targetPosition: Position;
  /** Swap is only available when the incoming player is already assigned to another slot */
  canSwap: boolean;
  onReplace: () => void;
  onSwap: () => void;
  onCancel: () => void;
}

function prefDotColor(pref: Preference | undefined): string {
  if (pref === 'preferred')  return 'var(--dot-preferred)';
  if (pref === 'acceptable') return 'var(--dot-acceptable)';
  if (pref === 'refused')    return 'var(--dot-avoid)';
  return 'var(--dot-unset)';
}

function PlayerPreviewCard({
  player,
  targetPosition,
  highlight,
}: {
  player: RosterPlayer;
  targetPosition: Position;
  highlight: boolean;
}) {
  const pref = (player.positions[targetPosition] as Preference) ?? 'unset';
  const displayName = player.display_name || player.name;
  const jersey = player.jersey_number ?? '-';
  const label = `${jersey} ${displayName}`;

  return (
    <div
      className="flex-1 rounded-xl border-2 p-2 flex flex-col items-center gap-1 min-w-0"
      style={{
        borderColor: highlight ? 'var(--accent)' : 'var(--border)',
        backgroundColor: 'var(--surface)',
      }}
    >
      <p
        className="text-xs font-semibold text-center leading-tight w-full truncate"
        style={{ color: 'var(--text-primary)' }}
      >
        {label}
      </p>
      <div className="flex items-center gap-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: prefDotColor(pref) }}
        />
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {targetPosition}
        </span>
      </div>
    </div>
  );
}

export function CollisionDialog({
  incomingPlayer,
  occupantPlayer,
  targetPosition,
  canSwap,
  onReplace,
  onSwap,
  onCancel,
}: CollisionDialogProps) {
  const incomingName = incomingPlayer.display_name || incomingPlayer.name;
  const occupantName = occupantPlayer.display_name || occupantPlayer.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Place {incomingName}?
          </p>
        </div>

        {/* Player comparison cards */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <PlayerPreviewCard player={incomingPlayer} targetPosition={targetPosition} highlight />
          <span className="text-lg shrink-0" style={{ color: 'var(--text-secondary)' }}>⇄</span>
          <PlayerPreviewCard player={occupantPlayer} targetPosition={targetPosition} highlight={false} />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col px-4 pb-4 gap-2">
          {canSwap && (
            <button
              onClick={onSwap}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-page)' }}
            >
              Swap positions
            </button>
          )}

          <button
            onClick={onReplace}
            className="w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
          >
            Move {occupantName} to bench
          </button>

          <button
            onClick={onCancel}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
