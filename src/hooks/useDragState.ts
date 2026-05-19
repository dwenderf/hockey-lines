'use client';

import { createContext, useContext } from 'react';

interface DragStateContextValue {
  activeDragPlayerId: string | null;
  absentPlayerIds: Set<string>;
  isTouchDevice: boolean;
  isEditMode: boolean;
  setEditMode: (v: boolean) => void;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
}

export const DragStateContext = createContext<DragStateContextValue>({
  activeDragPlayerId: null,
  absentPlayerIds: new Set(),
  isTouchDevice: false,
  isEditMode: false,
  setEditMode: () => {},
  selectedPlayerId: null,
  setSelectedPlayerId: () => {},
});

export function useDragState() {
  return useContext(DragStateContext);
}
