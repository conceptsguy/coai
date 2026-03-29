"use client";

import { memo } from "react";
import type { CollaboratorState } from "@/types/canvas";

interface CollaboratorAvatarsProps {
  collaborators: CollaboratorState[];
}

function CollaboratorAvatarsInner({ collaborators }: CollaboratorAvatarsProps) {
  if (collaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {collaborators.slice(0, 5).map((c) => (
        <div
          key={c.userId}
          className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white shadow-sm"
          style={{ backgroundColor: c.color }}
          title={c.displayName}
        >
          {c.avatarUrl ? (
            <img
              src={c.avatarUrl}
              alt={c.displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            getInitials(c.displayName)
          )}
        </div>
      ))}
      {collaborators.length > 5 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground shadow-sm">
          +{collaborators.length - 5}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const CollaboratorAvatars = memo(CollaboratorAvatarsInner);
