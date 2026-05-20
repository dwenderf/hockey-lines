import type React from 'react';
import type { Position, Preference } from './types';

export const FORWARD_POSITIONS: Position[] = ['LW', 'C', 'RW'];
export const DEFENSE_POSITIONS: Position[] = ['LD', 'RD'];

export const PREFERENCE_COLORS: Record<Preference, string> = {
  preferred: 'bg-green-100 border-green-500 text-green-800',
  acceptable: 'bg-blue-100 border-blue-500 text-blue-800',
  refused: 'bg-red-100 border-red-500 text-red-800',
  unset: 'bg-gray-100 border-gray-300 text-gray-500',
};

/** CSS var for a preference's dot/border color, matching the theme token. */
export function getPrefBorderColor(pref: Preference | undefined): string {
  const map: Record<string, string> = {
    preferred:  'var(--dot-preferred)',
    acceptable: 'var(--dot-acceptable)',
    refused:    'var(--dot-avoid)',
    unset:      'var(--dot-unset)',
  };
  return map[pref ?? 'unset'] ?? 'var(--dot-unset)';
}

/** Inline style for the whisper tint background on a slot, keyed by preference. */
export function getPrefTintStyle(pref: Preference | undefined): React.CSSProperties {
  const map: Record<string, string> = {
    preferred:  'var(--pref-tint-preferred)',
    acceptable: 'var(--pref-tint-acceptable)',
    refused:    'var(--pref-tint-avoid)',
    unset:      'var(--pref-tint-unset)',
  };
  return { backgroundColor: map[pref ?? 'unset'] ?? 'var(--pref-tint-unset)' };
}

/**
 * Returns the Tailwind border + background classes for an assigned player chip.
 * Used on desktop; on touch the slot-wrapper handles preference coloring.
 */
export function getChipClass(pref: Preference, _position: Position): string {
  if (pref === 'refused')    return 'border-red-400';
  if (pref === 'unset')      return 'border-[var(--border)]';
  if (pref === 'preferred')  return 'border-green-400';
  /* acceptable */           return 'border-blue-400';
}

/** @deprecated Use getChipClass(pref, position) instead */
export const CHIP_PREFERENCE_COLORS: Record<Preference, string> = {
  preferred:  'bg-green-50 border-green-400',
  acceptable: 'bg-blue-50 border-blue-400',
  refused:    'bg-red-50 border-red-400',
  unset:      'bg-gray-50 border-gray-300',
};

export const SLOT_DRAG_COLORS: Record<Preference, string> = {
  preferred:  'ring-2 ring-[var(--dot-preferred)]',
  acceptable: 'ring-2 ring-[var(--dot-acceptable)]',
  refused:    'ring-2 ring-[var(--dot-avoid)]',
  unset:      'ring-2 ring-[var(--dot-unset)]',
};

export const POSITION_TO_COLUMN: Record<Position, string> = {
  LW: 'lw_player_id',
  C: 'c_player_id',
  RW: 'rw_player_id',
  LD: 'ld_player_id',
  RD: 'rd_player_id',
};
