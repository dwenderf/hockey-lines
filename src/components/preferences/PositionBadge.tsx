import { PREFERENCE_COLORS } from '@/lib/constants';
import type { Position, Preference } from '@/lib/types';

interface PositionBadgeProps {
  position: Position;
  preference: Preference;
}

export function PositionBadge({ position, preference }: PositionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${PREFERENCE_COLORS[preference]}`}
    >
      {position}
    </span>
  );
}
