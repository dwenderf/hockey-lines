'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface AddPlayerFormProps {
  onAdd: (name: string, isGoalie: boolean) => void;
}

export function AddPlayerForm({ onAdd }: AddPlayerFormProps) {
  const [name, setName] = useState('');
  const [isGoalie, setIsGoalie] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, isGoalie);
    setName('');
    setIsGoalie(false);
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Player name"
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isGoalie}
            onChange={(e) => setIsGoalie(e.target.checked)}
            className="rounded"
          />
          Goalie
        </label>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </div>
    </form>
  );
}
