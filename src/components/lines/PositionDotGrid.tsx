import type { Position } from '@/lib/types';

const FORWARD_POSITIONS: Position[] = ['LW', 'C', 'RW'];
const DEFENSE_POSITIONS: Position[] = ['LD', 'RD'];

const PREF_TO_VAR: Record<string, string> = {
  preferred:  'var(--dot-preferred)',
  acceptable: 'var(--dot-acceptable)',
  refused:    'var(--dot-avoid)',
};

interface PositionDotGridProps {
  positions: Partial<Record<Position, string>>;
}

export function PositionDotGrid({ positions }: PositionDotGridProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 mt-1">
      <div className="flex gap-1">
        {FORWARD_POSITIONS.map((pos) => (
          <div
            key={pos}
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: PREF_TO_VAR[positions[pos] ?? ''] ?? 'var(--dot-unset)' }}
          />
        ))}
      </div>
      <div className="flex gap-1">
        {DEFENSE_POSITIONS.map((pos) => (
          <div
            key={pos}
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: PREF_TO_VAR[positions[pos] ?? ''] ?? 'var(--dot-unset)' }}
          />
        ))}
      </div>
    </div>
  );
}
