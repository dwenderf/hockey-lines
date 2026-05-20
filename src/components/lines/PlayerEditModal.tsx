'use client';

interface PlayerEditModalProps {
  playerId: string;
  playerName: string;
  onClose: () => void;
}

export function PlayerEditModal({ playerName, onClose }: PlayerEditModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-0 sm:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md overflow-hidden shadow-2xl rounded-t-2xl sm:rounded-2xl"
        style={{ backgroundColor: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2
            className="font-display text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {playerName}
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none p-1"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Placeholder body */}
        <div className="px-5 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
          Player editing coming soon.
        </div>
      </div>
    </div>
  );
}
