'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Game } from '@/lib/types';

interface GameFormModalProps {
  teamId: string;
  game?: Game;
  onSuccess: () => void;
  onClose: () => void;
}

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GameFormModal({ teamId, game, onSuccess, onClose }: GameFormModalProps) {
  const isEdit = game !== undefined;

  const [opponent, setOpponent] = useState(game?.opponent ?? '');
  const [isHome, setIsHome] = useState(game?.is_home ?? true);
  const [startsAt, setStartsAt] = useState(game ? toDatetimeLocal(game.starts_at) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim() || !startsAt || submitting) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const isoStartsAt = new Date(startsAt).toISOString();

    if (isEdit) {
      const { error: err } = await supabase
        .from('games')
        .update({ opponent: opponent.trim(), is_home: isHome, starts_at: isoStartsAt })
        .eq('id', game.id);

      if (err) {
        setError('Failed to save changes. Please try again.');
        setSubmitting(false);
        return;
      }
    } else {
      const { data: newGame, error: insertErr } = await supabase
        .from('games')
        .insert({ team_id: teamId, opponent: opponent.trim(), is_home: isHome, starts_at: isoStartsAt })
        .select()
        .single();

      if (insertErr || !newGame) {
        setError('Failed to add game. Please try again.');
        setSubmitting(false);
        return;
      }

      await supabase.from('forward_line_slots').insert([
        { game_id: newGame.id, line_number: 1 },
        { game_id: newGame.id, line_number: 2 },
        { game_id: newGame.id, line_number: 3 },
      ]);
      await supabase.from('defense_line_slots').insert([
        { game_id: newGame.id, line_number: 1 },
        { game_id: newGame.id, line_number: 2 },
        { game_id: newGame.id, line_number: 3 },
      ]);
    }

    onSuccess();
  };

  return (
    <Modal open title={isEdit ? 'Edit Game' : 'Add Game'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Opponent
          </label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="Team name"
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Location
          </label>
          <div className="flex gap-2">
            {([true, false] as const).map((home) => {
              const active = isHome === home;
              return (
                <button
                  key={String(home)}
                  type="button"
                  onClick={() => setIsHome(home)}
                  className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={
                    active
                      ? { backgroundColor: 'var(--accent)', color: '#fff' }
                      : { border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                  }
                >
                  {home ? 'Home' : 'Away'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Date &amp; Time
          </label>
          <input
            type="datetime-local"
            step="300"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--error, #dc2626)' }}>
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!opponent.trim() || !startsAt || submitting}
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add game'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
