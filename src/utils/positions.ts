import type { Position, Preference } from '@/lib/types';

const CYCLE: (Exclude<Preference, 'unset'> | null)[] = ['preferred', 'acceptable', 'refused', null];

export function cyclePositions(
  positions: Partial<Record<Position, Exclude<Preference, 'unset'>>>,
  pos: Position
): Partial<Record<Position, Exclude<Preference, 'unset'>>> {
  const cur = positions[pos] ?? null;
  const idx = CYCLE.indexOf(cur);
  const next = CYCLE[(idx + 1) % CYCLE.length];
  const updated = { ...positions };
  if (next === null) {
    delete updated[pos];
  } else {
    updated[pos] = next;
  }
  return updated;
}
