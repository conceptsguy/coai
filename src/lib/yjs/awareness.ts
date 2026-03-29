"use client";

import { useState, useEffect, useCallback } from "react";
import type { Awareness } from "y-protocols/awareness";
import type { CollaboratorState } from "@/types/canvas";

// Consistent color palette for collaborators
const COLORS = [
  "#f87171", // red
  "#fb923c", // orange
  "#facc15", // yellow
  "#4ade80", // green
  "#22d3ee", // cyan
  "#818cf8", // indigo
  "#c084fc", // purple
  "#f472b6", // pink
];

export function getCollaboratorColor(clientId: number): string {
  return COLORS[clientId % COLORS.length];
}

/**
 * Hook that returns awareness states of all remote collaborators.
 */
export function useCollaborators(
  awareness: Awareness | null
): CollaboratorState[] {
  const [collaborators, setCollaborators] = useState<CollaboratorState[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const update = () => {
      const states: CollaboratorState[] = [];
      awareness.getStates().forEach((state, clientId) => {
        // Skip our own state
        if (clientId === awareness.clientID) return;
        if (!state.user) return;
        states.push(state.user as CollaboratorState);
      });
      setCollaborators(states);
    };

    awareness.on("change", update);
    update();

    return () => {
      awareness.off("change", update);
    };
  }, [awareness]);

  return collaborators;
}

/**
 * Set our own awareness state.
 */
export function setLocalAwareness(
  awareness: Awareness | null,
  state: Partial<CollaboratorState>
) {
  if (!awareness) return;
  const current = awareness.getLocalState()?.user ?? {};
  awareness.setLocalStateField("user", { ...current, ...state });
}

/**
 * Hook that broadcasts cursor position via awareness.
 */
export function useBroadcastCursor(
  awareness: Awareness | null
) {
  return useCallback(
    (cursor: { x: number; y: number } | null) => {
      setLocalAwareness(awareness, { cursor });
    },
    [awareness]
  );
}
