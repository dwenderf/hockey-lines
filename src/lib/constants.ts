import type { Position, Preference } from './types';

export const FORWARD_POSITIONS: Position[] = ['LW', 'C', 'RW'];
export const DEFENSE_POSITIONS: Position[] = ['LD', 'RD'];

export const PREFERENCE_COLORS: Record<Preference, string> = {
  preferred: 'bg-green-100 border-green-500 text-green-800',
  acceptable: 'bg-blue-100 border-blue-500 text-blue-800',
  refused: 'bg-red-100 border-red-500 text-red-800',
  unset: 'bg-gray-100 border-gray-300 text-gray-500',
};

export const CHIP_PREFERENCE_COLORS: Record<Preference, string> = {
  preferred:  'bg-green-50 border-green-400',
  acceptable: 'bg-blue-50 border-blue-400',
  refused:    'bg-red-50 border-red-400',
  unset:      'bg-white border-gray-300',
};

export const SLOT_DRAG_COLORS: Record<Preference, string> = {
  preferred: 'ring-2 ring-green-500 bg-green-50',
  acceptable: 'ring-2 ring-blue-500 bg-blue-50',
  refused: 'ring-2 ring-red-400 bg-red-50',
  unset: 'ring-2 ring-gray-300 bg-gray-50',
};

export const POSITION_TO_COLUMN: Record<Position, string> = {
  LW: 'lw_player_id',
  C: 'c_player_id',
  RW: 'rw_player_id',
  LD: 'ld_player_id',
  RD: 'rd_player_id',
};
