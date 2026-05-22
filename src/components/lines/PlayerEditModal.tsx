'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { cyclePositions } from '@/utils/positions';
import { FORWARD_POSITIONS, DEFENSE_POSITIONS } from '@/lib/constants';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import type { Position, Preference, RosterPlayer } from '@/lib/types';

interface PlayerEditModalProps {
  player?: RosterPlayer;
  teamId: string;
  onClose: () => void;
  onSaved?: (updated: RosterPlayer) => void;
}

const PREF_LABELS: Record<string, string> = {
  preferred: 'Preferred',
  acceptable: 'Acceptable',
  refused: 'Refused',
  unset: 'Unset',
};

function getPrefStyle(pref: Exclude<Preference, 'unset'> | 'unset'): React.CSSProperties {
  if (pref === 'preferred') {
    return {
      backgroundColor: 'var(--pos-tile-preferred-bg)',
      color: 'var(--pos-tile-preferred-text)',
      borderColor: 'var(--pos-tile-preferred-text)',
    };
  }
  if (pref === 'acceptable') {
    return {
      backgroundColor: 'var(--pos-tile-acceptable-bg)',
      color: 'var(--pos-tile-acceptable-text)',
      borderColor: 'var(--pos-tile-acceptable-text)',
    };
  }
  if (pref === 'refused') {
    return {
      backgroundColor: 'var(--pos-tile-refused-bg)',
      color: 'var(--pos-tile-refused-text)',
      borderColor: 'var(--pos-tile-refused-text)',
    };
  }
  return {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    borderColor: 'var(--border)',
  };
}

function PositionTileGrid({
  positions,
  onChange,
}: {
  positions: Partial<Record<Position, Exclude<Preference, 'unset'>>>;
  onChange: (updated: Partial<Record<Position, Exclude<Preference, 'unset'>>>) => void;
}) {
  const renderTile = (pos: Position) => {
    const pref = positions[pos] ?? 'unset';
    const style = getPrefStyle(pref);
    return (
      <button
        key={pos}
        type="button"
        onClick={() => onChange(cyclePositions(positions, pos))}
        className="flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-3 py-2 min-w-[64px] transition-colors"
        style={style}
      >
        <span className="text-base font-bold">{pos}</span>
        <span className="text-xs">{PREF_LABELS[pref]}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 justify-center">
        {FORWARD_POSITIONS.map(renderTile)}
      </div>
      <div className="flex gap-2 justify-center">
        {DEFENSE_POSITIONS.map(renderTile)}
      </div>
    </div>
  );
}

function SkillChips({
  value,
  onChange,
}: {
  value: 1 | 2 | 3 | 4 | 5 | null;
  onChange: (v: 1 | 2 | 3 | 4 | 5 | null) => void;
}) {
  return (
    <div className="flex gap-2">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className="w-10 h-10 rounded-lg border-2 text-sm font-medium transition-colors"
          style={
            value === n
              ? { backgroundColor: 'var(--accent)', color: '#FFFFFF', borderColor: 'var(--accent)' }
              : { backgroundColor: 'transparent', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
          }
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function PlayerEditModal({ player, teamId, onClose, onSaved }: PlayerEditModalProps) {
  const isTouchDevice = useIsTouchDevice();

  // Step: 'name' = step 1 for add mode; 'edit' = full edit form
  const [step, setStep] = useState<'name' | 'edit'>(player ? 'edit' : 'name');
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(player ?? null);

  const [name, setName] = useState(player?.name ?? '');
  const [jerseyNumber, setJerseyNumber] = useState(player?.jersey_number ?? '');
  const [nickname, setNickname] = useState(player?.player_nickname ?? '');
  const [localPositions, setLocalPositions] = useState<Partial<Record<Position, Exclude<Preference, 'unset'>>>>(
    player?.positions ?? {}
  );
  const [skillLevel, setSkillLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(player?.player_level ?? null);
  const [isActive, setIsActive] = useState(player?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const playerNameRef = useRef<string>(player?.name ?? '');

  useEffect(() => {
    if (step === 'name') nameInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!editingPlayer || step !== 'edit') return;
    createClient()
      .from('players')
      .select('name')
      .eq('id', editingPlayer.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name as string);
          playerNameRef.current = data.name as string;
        }
      });
  }, [editingPlayer?.id, step]);

  const handleCreatePlayer = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({ name: name.trim(), is_goalie: false })
        .select()
        .single();
      if (playerError) throw playerError;

      const { data: roster, error: rosterError } = await supabase
        .from('rosters')
        .insert({ team_id: teamId, player_id: player.id, positions: {} })
        .select()
        .single();
      if (rosterError) throw rosterError;

      const { data: viewRow } = await supabase
        .from('public_roster_view')
        .select('*')
        .eq('id', roster.id)
        .single();

      if (!viewRow) throw new Error('Failed to load new player');

      const newPlayer: RosterPlayer = {
        id: viewRow.player_id as string,
        name: name.trim(),
        is_goalie: viewRow.is_goalie as boolean,
        roster_id: viewRow.id as string,
        team_id: viewRow.team_id as string,
        positions: (viewRow.positions ?? {}) as RosterPlayer['positions'],
        player_level: viewRow.player_level as RosterPlayer['player_level'],
        is_active: viewRow.is_active as boolean,
        is_team_admin: (viewRow.is_team_admin ?? false) as boolean,
        jersey_number: (viewRow.jersey_number ?? null) as string | null,
        player_nickname: (viewRow.player_nickname ?? null) as string | null,
        display_name: viewRow.display_name as string,
      };

      playerNameRef.current = name.trim();
      setEditingPlayer(newPlayer);
      setIsActive(newPlayer.is_active);
      setSkillLevel(newPlayer.player_level);
      setLocalPositions(newPlayer.positions);
      setStep('edit');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create player');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingPlayer) return;
    setSaving(true);
    setError(null);

    const snapshot = { ...editingPlayer };
    const updated: RosterPlayer = {
      ...editingPlayer,
      name: name.trim() || editingPlayer.name,
      display_name: nickname.trim() || name.trim() || editingPlayer.name,
      jersey_number: jerseyNumber.trim() || null,
      player_nickname: nickname.trim() || null,
      positions: localPositions,
      player_level: skillLevel,
      is_active: isActive,
    };

    try {
      const supabase = createClient();
      const { error: rosterError } = await supabase
        .from('rosters')
        .update({
          jersey_number: updated.jersey_number,
          player_nickname: updated.player_nickname,
          positions: updated.positions,
          player_level: updated.player_level,
          is_active: updated.is_active,
        })
        .eq('id', editingPlayer.roster_id);
      if (rosterError) throw rosterError;

      if (name.trim() && name.trim() !== playerNameRef.current) {
        const { error: playerError } = await supabase
          .from('players')
          .update({ name: name.trim() })
          .eq('id', editingPlayer.id);
        if (playerError) throw playerError;
      }

      onSaved?.(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex flex-col${isTouchDevice ? '' : ' items-center justify-center bg-black/40 p-4'}`}
      onClick={isTouchDevice ? undefined : onClose}
    >
      <div
        className={`flex flex-col overflow-hidden shadow-2xl${isTouchDevice ? ' flex-1 w-full' : ' w-full max-w-md rounded-2xl max-h-[90vh]'}`}
        style={{ backgroundColor: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {step === 'name' ? 'Add Player' : 'Edit Player'}
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

        {/* Body */}
        {step === 'name' ? (
          <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Name <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleCreatePlayer()}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-page)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Player name"
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--dot-avoid)' }}>{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePlayer}
                disabled={!name.trim() || saving}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
              >
                {saving ? 'Creating…' : 'Create player →'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-page)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Jersey # + Nickname in a row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Jersey #
                </label>
                <input
                  type="text"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value.slice(0, 4))}
                  maxLength={4}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-page)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="e.g. 11"
                />
              </div>
              <div className="flex-[2]">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-page)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Display name override"
                />
              </div>
            </div>

            {/* Positions */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                Position Preferences
              </label>
              <PositionTileGrid positions={localPositions} onChange={setLocalPositions} />
            </div>

            {/* Skill level */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                Skill Level
              </label>
              <SkillChips value={skillLevel} onChange={setSkillLevel} />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Active
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ backgroundColor: isActive ? 'var(--accent)' : 'var(--border)' }}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: isActive ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--dot-avoid)' }}>{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pb-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
