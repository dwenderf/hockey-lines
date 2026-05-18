'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FORWARD_POSITIONS, DEFENSE_POSITIONS, PREFERENCE_COLORS } from '@/lib/constants';
import type { RosterPlayer, Position, Preference } from '@/lib/types';

const CYCLE: (Exclude<Preference, 'unset'> | null)[] = ['preferred', 'acceptable', 'refused', null];
const LABELS: Record<string, string> = {
  preferred: 'Preferred',
  acceptable: 'Acceptable',
  refused: 'Refused',
  unset: 'Unset',
};

interface PreferenceEditorProps {
  player: RosterPlayer;
  open: boolean;
  onClose: () => void;
  onUpdate: (position: Position, preference: Exclude<Preference, 'unset'> | null) => void;
}

export function PreferenceEditor({ player, open, onClose, onUpdate }: PreferenceEditorProps) {
  const currentFor = (pos: Position): Preference => player.positions[pos] ?? 'unset';

  const cycle = (pos: Position) => {
    const cur = player.positions[pos] ?? null;
    const idx = CYCLE.indexOf(cur);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    onUpdate(pos, next);
  };

  const colorFor = (pos: Position): string => PREFERENCE_COLORS[currentFor(pos)];

  const renderPositionButton = (pos: Position) => (
    <button
      key={pos}
      onClick={() => cycle(pos)}
      className={`flex items-center justify-between rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${colorFor(pos)}`}
    >
      <span>{pos}</span>
      <span>{LABELS[currentFor(pos)]}</span>
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title={`Positions — ${player.name}`}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Forwards</p>
          <div className="space-y-2">
            {FORWARD_POSITIONS.map(renderPositionButton)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Defense</p>
          <div className="space-y-2">
            {DEFENSE_POSITIONS.map(renderPositionButton)}
          </div>
        </div>
        <p className="text-xs text-gray-400">Click a position to cycle: Preferred → Acceptable → Refused → Unset</p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
