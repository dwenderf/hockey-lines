export type Position = 'LW' | 'C' | 'RW' | 'LD' | 'RD';
export type Preference = 'preferred' | 'acceptable' | 'refused' | 'unset';

export interface Team {
  id: string;
  name: string;
}

// Identity only — name and goalie flag
export interface Player {
  id: string;
  name: string;
  is_goalie: boolean;
}

// Team-specific attributes for a player
export interface RosterEntry {
  id: string;
  team_id: string;
  player_id: string;
  positions: Partial<Record<Position, Exclude<Preference, 'unset'>>>;
  player_level: 1 | 2 | 3 | 4 | 5 | null;  // captain-only; never render on public view
  is_team_admin: boolean;
  is_active: boolean;
}

// Flattened view used throughout the UI (player joined with their roster entry)
export interface RosterPlayer extends Player {
  roster_id: string;
  team_id: string;
  positions: Partial<Record<Position, Exclude<Preference, 'unset'>>>;
  player_level: 1 | 2 | 3 | 4 | 5 | null;
  is_team_admin: boolean;
  is_active: boolean;
}

export interface GameAbsence {
  id: string;
  game_id: string;
  player_id: string;
}

export interface Game {
  id: string;
  team_id: string;
  opponent: string;
  is_home: boolean;
  starts_at: string;
}

export interface ForwardLineSlot {
  id: string;
  game_id: string;
  line_number: 1 | 2 | 3 | 4;
  lw_player_id: string | null;
  c_player_id: string | null;
  rw_player_id: string | null;
}

export interface DefenseLineSlot {
  id: string;
  game_id: string;
  line_number: 1 | 2 | 3 | 4;
  ld_player_id: string | null;
  rd_player_id: string | null;
}

export interface SlotRef {
  table: 'forward_line_slots' | 'defense_line_slots';
  slotId: string;
  column: string;
  position: Position;
}

export type DraggableData =
  | { type: 'roster-player'; playerId: string }
  | { type: 'slot-player'; playerId: string; fromSlot: SlotRef };

export type DroppableData =
  | { type: 'slot'; slotRef: SlotRef }
  | { type: 'roster' }
  | { type: 'inactive-section' };
