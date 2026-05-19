import { ForwardLines } from './ForwardLines';
import { DefenseLines } from './DefenseLines';
import { ScratchZone } from './ScratchZone';
import type { RosterPlayer, ForwardLineSlot, DefenseLineSlot, SlotRef } from '@/lib/types';

interface LinesBoardProps {
  forwardSlots: ForwardLineSlot[];
  defenseSlots: DefenseLineSlot[];
  players: RosterPlayer[];
  scratchedPlayers?: RosterPlayer[];
  readOnly?: boolean;
  onRemoveFromSlot?: (slotRef: SlotRef) => void;
  onAddForwardLine?: () => void;
  onAddDefenseLine?: () => void;
  onTapSlot?: (slotRef: SlotRef) => void;
  onReturnFromScratch?: (playerId: string) => void;
  onTapScratch?: () => void;
}

export function LinesBoard({
  forwardSlots,
  defenseSlots,
  players,
  scratchedPlayers,
  readOnly,
  onRemoveFromSlot,
  onAddForwardLine,
  onAddDefenseLine,
  onTapSlot,
  onReturnFromScratch,
  onTapScratch,
}: LinesBoardProps) {
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <ForwardLines
          slots={forwardSlots}
          playersById={playersById}
          readOnly={readOnly}
          onRemoveFromSlot={onRemoveFromSlot}
          onAddLine={onAddForwardLine}
          onTapSlot={onTapSlot}
        />
      </div>
      <hr className="border-gray-200" />
      <div>
        <DefenseLines
          slots={defenseSlots}
          playersById={playersById}
          readOnly={readOnly}
          onRemoveFromSlot={onRemoveFromSlot}
          onAddLine={onAddDefenseLine}
          onTapSlot={onTapSlot}
        />
      </div>
      {!readOnly && onReturnFromScratch && scratchedPlayers && (
        <ScratchZone
          scratchedPlayers={scratchedPlayers}
          onReturnFromScratch={onReturnFromScratch}
          onTapScratch={onTapScratch}
        />
      )}
    </div>
  );
}
