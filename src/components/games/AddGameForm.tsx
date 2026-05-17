'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface AddGameFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (opponent: string, isHome: boolean, startsAt: string) => void;
}

export function AddGameForm({ open, onClose, onAdd }: AddGameFormProps) {
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [startsAt, setStartsAt] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim() || !startsAt) return;
    onAdd(opponent.trim(), isHome, new Date(startsAt).toISOString());
    setOpponent('');
    setIsHome(true);
    setStartsAt('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Game">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="Team name"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="radio" checked={isHome} onChange={() => setIsHome(true)} />
              Home
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="radio" checked={!isHome} onChange={() => setIsHome(false)} />
              Away
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!opponent.trim() || !startsAt}>Create Game</Button>
        </div>
      </form>
    </Modal>
  );
}
