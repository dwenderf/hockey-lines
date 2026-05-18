'use client';

import { createContext, useContext } from 'react';

interface DragStateContextValue {
  activeDragPlayerId: string | null;
  absentPlayerIds: Set<string>;
}

export const DragStateContext = createContext<DragStateContextValue>({
  activeDragPlayerId: null,
  absentPlayerIds: new Set(),
});

export function useDragState() {
  return useContext(DragStateContext);
}
