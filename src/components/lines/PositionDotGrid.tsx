import type { Position } from '@/lib/types';

const FORWARD_POSITIONS: Position[] = ['LW', 'C', 'RW'];
const DEFENSE_POSITIONS: Position[] = ['LD', 'RD'];

const DOT_COLORS: Record<string, string> = {
  preferred: 'bg-green-500',
  acceptable: 'bg-blue-500',
  refused: 'bg-red-400',
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
            className={`w-2.5 h-2.5 rounded-full ${positions[pos] ? DOT_COLORS[positions[pos]!] ?? 'bg-gray-300' : 'bg-gray-300'}`}
          />
        ))}
      </div>
      <div className="flex gap-1">
        {DEFENSE_POSITIONS.map((pos) => (
          <div
            key={pos}
            className={`w-2.5 h-2.5 rounded-full ${positions[pos] ? DOT_COLORS[positions[pos]!] ?? 'bg-gray-300' : 'bg-gray-300'}`}
          />
        ))}
      </div>
    </div>
  );
}
