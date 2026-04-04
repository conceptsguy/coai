"use client";

import { useCanvasStore } from "@/lib/store/canvas-store";
import { Map, MessageSquare } from "lucide-react";

export function ViewSwitcher() {
  const viewMode = useCanvasStore((s) => s.viewMode);
  const setViewMode = useCanvasStore((s) => s.setViewMode);

  return (
    <div className="flex items-center rounded-md border border-border bg-muted p-0.5 gap-0.5">
      <button
        onClick={() => setViewMode("map")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
          viewMode === "map"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Map className="h-3 w-3" />
        Map
      </button>
      <button
        onClick={() => setViewMode("thread")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
          viewMode === "thread"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <MessageSquare className="h-3 w-3" />
        Thread
      </button>
    </div>
  );
}
