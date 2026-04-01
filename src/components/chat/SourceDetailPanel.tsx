"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SourceDetailPanel() {
  const {
    selectedEdgeId,
    sidebarExpanded,
    closeSidebar,
    toggleSidebarExpanded,
    getSourceDetail,
    openSidebar,
    removeEdge,
    updateEdgeLabel,
    edges,
  } = useCanvasStore();

  const detail = selectedEdgeId ? getSourceDetail(selectedEdgeId) : null;

  // Edge label editing
  const currentEdge = edges.find((e) => e.id === selectedEdgeId);
  const [labelValue, setLabelValue] = useState(currentEdge?.data?.label ?? "");
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLabelValue(currentEdge?.data?.label ?? "");
  }, [currentEdge?.data?.label]);

  const handleLabelChange = useCallback((value: string) => {
    setLabelValue(value);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => {
      if (selectedEdgeId) updateEdgeLabel(selectedEdgeId, value);
    }, 500);
  }, [selectedEdgeId, updateEdgeLabel]);

  if (!detail) {
    return (
      <div
        className={cn(
          "absolute bg-card flex flex-col z-20 border border-border shadow-lg",
          sidebarExpanded
            ? "inset-0"
            : "right-3 top-3 bottom-3 w-[420px] rounded-xl"
        )}
      >
        <div className={cn(
          "px-3 py-2 border-b border-border flex items-center justify-between gap-2",
          !sidebarExpanded && "rounded-t-xl"
        )}>
          <h2 className="font-semibold text-sm">Source removed</h2>
          <Button variant="ghost" size="icon-xs" onClick={closeSidebar} className="h-7 w-7 shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">This source connection was removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute bg-card flex flex-col z-20 border border-border shadow-lg",
        sidebarExpanded
          ? "inset-0"
          : "right-3 top-3 bottom-3 w-[420px] rounded-xl"
      )}
    >
      {/* Header */}
      <div className={cn(
        "px-3 py-2 border-b border-border flex items-center justify-between gap-2",
        !sidebarExpanded && "rounded-t-xl"
      )}>
        <h2 className="font-semibold text-sm">Context source</h2>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleSidebarExpanded}
            className="h-7 w-7"
          >
            {sidebarExpanded
              ? <Minimize2 className="h-3.5 w-3.5" />
              : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={closeSidebar} className="h-7 w-7 shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className={cn("flex-1 overflow-y-auto px-4 py-4", sidebarExpanded && "max-w-2xl mx-auto w-full")}>
        <div className="space-y-4">
          {/* From / To */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">From</p>
              <button
                onClick={() => openSidebar(detail.sourceNodeId)}
                className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors cursor-pointer group"
              >
                <span className="truncate">{detail.sourceTitle}</span>
                <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">To</p>
              <button
                onClick={() => openSidebar(detail.targetNodeId)}
                className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors cursor-pointer group"
              >
                <span className="truncate">{detail.targetTitle}</span>
                <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Edge label */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Edge label</p>
            <input
              type="text"
              value={labelValue}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. File, Context, Reference..."
              className="w-full text-sm bg-muted rounded-lg px-3 py-1.5 border border-transparent focus:border-border outline-none transition-colors font-mono"
            />
          </div>

          <div className="border-t border-border" />

          {/* Summary */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Shared context</p>
            {detail.summary ? (
              <>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-foreground whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {detail.summary}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Based on {detail.summaryMessageCount} message{detail.summaryMessageCount !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <div className="bg-muted rounded-lg px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  No summary yet. Start a conversation in the source chat to generate context.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer — remove action */}
      <div className={cn(
        "px-4 py-3 border-t border-border",
        !sidebarExpanded && "rounded-b-xl"
      )}>
        <div className={cn(sidebarExpanded && "max-w-2xl mx-auto")}>
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => removeEdge(detail.edgeId)}
          >
            Remove source
          </Button>
        </div>
      </div>
    </div>
  );
}
