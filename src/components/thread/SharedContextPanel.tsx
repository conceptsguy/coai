"use client";

import { useCanvasStore } from "@/lib/store/canvas-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Check } from "lucide-react";
import type { ContextUpdate } from "@/types/canvas";

function ContextUpdateCard({
  update,
  projectId,
}: {
  update: ContextUpdate;
  projectId: string;
}) {
  const removeContextUpdateProposal = useCanvasStore(
    (s) => s.removeContextUpdateProposal
  );
  const updateSharedContextSection = useCanvasStore(
    (s) => s.updateSharedContextSection
  );

  const handleAccept = async () => {
    const res = await fetch("/api/context/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, updateId: update.id }),
    });
    if (res.ok) {
      const { section, value } = await res.json();
      updateSharedContextSection(section, value);
      removeContextUpdateProposal(update.id);
    }
  };

  const handleReject = async () => {
    await fetch("/api/context/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, updateId: update.id }),
    });
    removeContextUpdateProposal(update.id);
  };

  return (
    <div className="border border-border rounded-md p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {update.targetSection}
        </span>
      </div>
      <p className="text-xs leading-relaxed">{update.content}</p>
      {update.rationale && (
        <p className="text-[10px] text-muted-foreground italic">
          {update.rationale}
        </p>
      )}
      <div className="flex items-center gap-1.5 pt-0.5">
        <Button
          size="xs"
          variant="outline"
          className="h-6 px-2 text-[10px] gap-1 text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/10"
          onClick={handleAccept}
        >
          <Check className="h-2.5 w-2.5" />
          Accept
        </Button>
        <Button
          size="xs"
          variant="ghost"
          className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-destructive"
          onClick={handleReject}
        >
          <X className="h-2.5 w-2.5" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}

interface SharedContextPanelProps {
  projectId: string;
}

export function SharedContextPanel({ projectId }: SharedContextPanelProps) {
  const sharedContext = useCanvasStore((s) => s.sharedContext);
  const pendingContextUpdates = useCanvasStore((s) => s.pendingContextUpdates);
  const toggleContextPanel = useCanvasStore((s) => s.toggleContextPanel);

  return (
    <div className="w-[320px] border-l border-border bg-sidebar flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Shared Context
        </span>
        <button
          onClick={toggleContextPanel}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {!sharedContext ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No shared context yet. Kick off the project from Map View to seed
              the shared document.
            </p>
          ) : (
            <>
              {/* Problem Statement */}
              {sharedContext.problemStatement && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Problem Statement
                  </h4>
                  <p className="text-xs leading-relaxed">
                    {sharedContext.problemStatement}
                  </p>
                </section>
              )}

              {/* Constraints & Goals */}
              {sharedContext.constraintsAndGoals.length > 0 && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Constraints &amp; Goals
                  </h4>
                  <ul className="space-y-0.5">
                    {sharedContext.constraintsAndGoals.map((item, i) => (
                      <li key={i} className="text-xs flex gap-1.5">
                        <span className="text-muted-foreground mt-0.5">·</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Key Insights */}
              {sharedContext.keyInsights.length > 0 && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Key Insights
                  </h4>
                  <ul className="space-y-0.5">
                    {sharedContext.keyInsights.map((item, i) => (
                      <li key={i} className="text-xs flex gap-1.5">
                        <span className="text-muted-foreground mt-0.5">·</span>
                        <span className="leading-relaxed">
                          {typeof item === "string"
                            ? item
                            : (item as { label?: string; description?: string }).label ??
                              String(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Decisions Made */}
              {sharedContext.decisionsMade.length > 0 && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Decisions Made
                  </h4>
                  <ul className="space-y-0.5">
                    {sharedContext.decisionsMade.map((item, i) => (
                      <li key={i} className="text-xs flex gap-1.5">
                        <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                        <span className="leading-relaxed">
                          {typeof item === "string"
                            ? item
                            : (item as { description?: string }).description ??
                              String(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Open Tensions */}
              {sharedContext.tensionsAndOpenQuestions.length > 0 && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Open Questions
                  </h4>
                  <ul className="space-y-0.5">
                    {sharedContext.tensionsAndOpenQuestions.map((item, i) => (
                      <li key={i} className="text-xs flex gap-1.5">
                        <span className="text-amber-500 mt-0.5 shrink-0">?</span>
                        <span className="leading-relaxed">
                          {typeof item === "string"
                            ? item
                            : (item as { question?: string }).question ??
                              String(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Convergence Summary */}
              {sharedContext.convergenceSummary && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Convergence Summary
                  </h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {sharedContext.convergenceSummary}
                  </p>
                </section>
              )}
            </>
          )}

          {/* Pending context update proposals */}
          {pendingContextUpdates.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
                Proposed Updates ({pendingContextUpdates.length})
              </h4>
              <div className="space-y-2">
                {pendingContextUpdates.map((update) => (
                  <ContextUpdateCard
                    key={update.id}
                    update={update}
                    projectId={projectId}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
