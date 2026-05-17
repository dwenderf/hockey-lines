'use client';

import { createContext, useContext } from 'react';

interface DragStateContextValue {
  activeDragPlayerId: string | null;
}

export const DragStateContext = createContext<DragStateContextValue>({
  activeDragPlayerId: null,
});

export function useDragState() {
  return useContext(DragStateContext);
}
