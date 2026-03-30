"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { ThemeToggle } from "@/components/canvas/ThemeToggle";
import { CollaboratorAvatars } from "@/components/canvas/CollaboratorAvatars";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { ShareDialog } from "@/components/canvas/ShareDialog";
import type { CollaboratorState } from "@/types/canvas";

function EditableProjectTitle() {
  const title = useCanvasStore((s) => s.project.title);
  const updateProjectTitle = useCanvasStore((s) => s.updateProjectTitle);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditValue(title); }, [title]);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      updateProjectTitle(trimmed);
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  }, [editValue, title, updateProjectTitle]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditValue(title); setIsEditing(false); }
        }}
        className="text-sm font-semibold bg-transparent border-b border-primary/40 outline-none"
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="text-sm font-semibold cursor-text hover:text-primary/80 transition-colors"
    >
      {title}
    </span>
  );
}

function EditableProjectPurpose() {
  const purpose = useCanvasStore((s) => s.project.purpose);
  const updateProjectPurpose = useCanvasStore((s) => s.updateProjectPurpose);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(purpose);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditValue(purpose); }, [purpose]);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed !== purpose) {
      updateProjectPurpose(trimmed);
    } else {
      setEditValue(purpose);
    }
    setIsEditing(false);
  }, [editValue, purpose, updateProjectPurpose]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditValue(purpose); setIsEditing(false); }
        }}
        className="text-xs text-muted-foreground bg-transparent border-b border-primary/40 outline-none"
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="text-xs text-muted-foreground cursor-text hover:text-muted-foreground/80 transition-colors"
    >
      {purpose || "Add a purpose..."}
    </span>
  );
}

interface TopBarProps {
  connected: boolean;
  collaborators: CollaboratorState[];
  role: "owner" | "editor";
  projectId: string;
}

export function TopBar({ connected, collaborators, role, projectId }: TopBarProps) {
  const toggleLeftPanel = useCanvasStore((s) => s.toggleLeftPanel);
  const leftPanelOpen = useCanvasStore((s) => s.leftPanelOpen);

  return (
    <div className="h-10 px-3 border-b border-border bg-card flex items-center justify-between shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleLeftPanel}
          className={`h-7 w-7 shrink-0 ${leftPanelOpen ? "bg-muted" : ""}`}
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </Button>
        <EditableProjectTitle />
        <span className="text-border select-none shrink-0">&middot;</span>
        <EditableProjectPurpose />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 shrink-0">
        {!connected && (
          <span className="text-xs text-amber-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Reconnecting...
          </span>
        )}
        {collaborators.length > 0 && (
          <CollaboratorAvatars collaborators={collaborators} />
        )}
        {role === "owner" && <ShareDialog projectId={projectId} />}
        <ThemeToggle />
      </div>
    </div>
  );
}
