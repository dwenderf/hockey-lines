'use client';

import type { RosterPlayer } from '@/lib/types';

interface CollisionDialogProps {
  incomingPlayer: RosterPlayer;
  occupantPlayer: RosterPlayer;
  /** Swap is only available when the incoming player is already assigned to another slot */
  canSwap: boolean;
  onReplace: () => void;
  onSwap: () => void;
  onCancel: () => void;
}

export function CollisionDialog({
  incomingPlayer,
  occupantPlayer,
  canSwap,
  onReplace,
  onSwap,
  onCancel,
}: CollisionDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Context header */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm text-gray-500 text-center">
            <span className="font-semibold text-gray-900">{occupantPlayer.name}</span>
            {' '}is already in this slot
          </p>
        </div>

        {/* Action buttons — all neutral, no CTA highlight so user must read before tapping */}
        <div className="flex flex-col px-4 pb-4 gap-2">
          <button
            onClick={onReplace}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Replace {occupantPlayer.name} with {incomingPlayer.name}
          </button>

          {canSwap && (
            <button
              onClick={onSwap}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Swap {occupantPlayer.name} ↔ {incomingPlayer.name}
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
