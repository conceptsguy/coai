"use client";

import { memo } from "react";
import { useViewport } from "@xyflow/react";
import type { CollaboratorState } from "@/types/canvas";

function CursorIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.928711 0.584961L15.0713 9.17969L7.24512 10.1855L3.65625 17.4141L0.928711 0.584961Z"
        fill={color}
        stroke="white"
        strokeWidth="1"
      />
    </svg>
  );
}

interface CollaboratorCursorsProps {
  collaborators: CollaboratorState[];
}

function CollaboratorCursorsInner({ collaborators }: CollaboratorCursorsProps) {
  const viewport = useViewport();

  const cursorsWithPosition = collaborators.filter((c) => c.cursor);

  if (cursorsWithPosition.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursorsWithPosition.map((collaborator) => {
        if (!collaborator.cursor) return null;

        // Convert flow coordinates to screen coordinates
        const screenX =
          collaborator.cursor.x * viewport.zoom + viewport.x;
        const screenY =
          collaborator.cursor.y * viewport.zoom + viewport.y;

        return (
          <div
            key={collaborator.userId}
            className="absolute transition-transform duration-75"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
            }}
          >
            <CursorIcon color={collaborator.color} />
            <div
              className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.displayName}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const CollaboratorCursors = memo(CollaboratorCursorsInner);
