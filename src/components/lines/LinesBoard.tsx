import { ForwardLines } from './ForwardLines';
import { DefenseLines } from './DefenseLines';
import type { Player, ForwardLineSlot, DefenseLineSlot, SlotRef } from '@/lib/types';

interface LinesBoardProps {
  forwardSlots: ForwardLineSlot[];
  defenseSlots: DefenseLineSlot[];
  players: Player[];
  readOnly?: boolean;
  onRemoveFromSlot?: (slotRef: SlotRef) => void;
  onAddForwardLine?: () => void;
  onAddDefenseLine?: () => void;
}

export function LinesBoard({
  forwardSlots,
  defenseSlots,
  players,
  readOnly,
  onRemoveFromSlot,
  onAddForwardLine,
  onAddDefenseLine,
}: LinesBoardProps) {
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-600">Forwards</h2>
        <ForwardLines
          slots={forwardSlots}
          playersById={playersById}
          readOnly={readOnly}
          onRemoveFromSlot={onRemoveFromSlot}
          onAddLine={onAddForwardLine}
        />
      </div>
      <hr className="border-gray-200" />
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-600">Defense</h2>
        <DefenseLines
          slots={defenseSlots}
          playersById={playersById}
          readOnly={readOnly}
          onRemoveFromSlot={onRemoveFromSlot}
          onAddLine={onAddDefenseLine}
        />
      </div>
    </div>
  );
}
