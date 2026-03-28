"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";

function EditableProjectTitle() {
  const title = useCanvasStore((s) => s.project.title);
  const updateProjectTitle = useCanvasStore((s) => s.updateProjectTitle);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

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
          if (e.key === "Escape") {
            setEditValue(title);
            setIsEditing(false);
          }
        }}
        className="text-lg font-semibold bg-transparent border-b border-primary/40 outline-none w-full"
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="text-lg font-semibold cursor-text hover:text-primary/80 transition-colors"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(purpose);
  }, [purpose]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
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
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setEditValue(purpose);
            setIsEditing(false);
          }
        }}
        rows={2}
        className="text-sm text-muted-foreground bg-transparent border-b border-primary/40 outline-none w-full resize-none"
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="text-sm text-muted-foreground cursor-text hover:text-muted-foreground/80 transition-colors"
    >
      {purpose || "Add a project purpose..."}
    </span>
  );
}

export function ProjectHeader() {
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 shadow-sm max-w-sm flex flex-col gap-1">
      <EditableProjectTitle />
      <EditableProjectPurpose />
    </div>
  );
}
