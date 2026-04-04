"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Check, Sparkles, Loader2 } from "lucide-react";
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
  const updateSharedContextSection = useCanvasStore(
    (s) => s.updateSharedContextSection
  );
  const nodes = useCanvasStore((s) => s.nodes);
  const [synthesizing, setSynthesizing] = useState(false);

  // Show Synthesize button when we have context + at least one thread with a summary
  const threadsWithSummaries = nodes.filter(
    (n) => n.type === "chat" && n.data.summary
  ).length;
  const canSynthesize =
    !!sharedContext && threadsWithSummaries > 0 && !synthesizing;

  const handleSynthesize = async () => {
    if (!canSynthesize) return;
    setSynthesizing(true);
    try {
      const res = await fetch("/api/context/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        const { convergenceSummary } = await res.json();
        if (convergenceSummary) {
          updateSharedContextSection("convergenceSummary", convergenceSummary);
        }
      }
    } finally {
      setSynthesizing(false);
    }
  };

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
              No shared context yet. Switch to Map View and click the kickoff
              banner to seed the shared document.
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

              {/* Workstreams */}
              {sharedContext.workstreams.length > 0 && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Workstreams
                  </h4>
                  <ul className="space-y-1">
                    {sharedContext.workstreams.map((ws, i) => {
                      const label =
                        typeof ws === "string"
                          ? ws
                          : (ws as { label?: string }).label ?? String(ws);
                      const desc =
                        typeof ws === "object" &&
                        (ws as { description?: string }).description;
                      return (
                        <li key={i} className="text-xs">
                          <span className="font-medium">{label}</span>
                          {desc && (
                            <span className="text-muted-foreground ml-1">
                              — {desc}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Emerging Themes */}
              {sharedContext.emergingThemes.length > 0 && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Emerging Themes
                  </h4>
                  <ul className="space-y-0.5">
                    {sharedContext.emergingThemes.map((item, i) => {
                      const theme =
                        typeof item === "string"
                          ? item
                          : (item as { theme?: string }).theme ?? String(item);
                      const confidence =
                        typeof item === "object"
                          ? (item as { confidence?: string }).confidence
                          : null;
                      return (
                        <li key={i} className="text-xs flex items-start gap-1.5">
                          <span className="text-violet-400 mt-0.5 shrink-0">◆</span>
                          <span className="leading-relaxed">
                            {theme}
                            {confidence && (
                              <span className="ml-1 text-[9px] text-muted-foreground">
                                ({confidence})
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
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
                    {sharedContext.keyInsights.map((item, i) => {
                      const text =
                        typeof item === "string"
                          ? item
                          : (item as { insight?: string; label?: string })
                              .insight ??
                            (item as { label?: string }).label ??
                            String(item);
                      return (
                        <li key={i} className="text-xs flex gap-1.5">
                          <span className="text-muted-foreground mt-0.5">·</span>
                          <span className="leading-relaxed">{text}</span>
                        </li>
                      );
                    })}
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
                    {sharedContext.decisionsMade.map((item, i) => {
                      const text =
                        typeof item === "string"
                          ? item
                          : (item as { decision?: string; description?: string })
                              .decision ??
                            (item as { description?: string }).description ??
                            String(item);
                      return (
                        <li key={i} className="text-xs flex gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">
                            ✓
                          </span>
                          <span className="leading-relaxed">{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Open Questions & Tensions */}
              {sharedContext.tensionsAndOpenQuestions.length > 0 && (
                <section className="space-y-1">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Open Questions
                  </h4>
                  <ul className="space-y-0.5">
                    {sharedContext.tensionsAndOpenQuestions.map((item, i) => {
                      const text =
                        typeof item === "string"
                          ? item
                          : (
                              item as {
                                description?: string;
                                question?: string;
                              }
                            ).description ??
                            (item as { question?: string }).question ??
                            String(item);
                      return (
                        <li key={i} className="text-xs flex gap-1.5">
                          <span className="text-amber-500 mt-0.5 shrink-0">
                            ?
                          </span>
                          <span className="leading-relaxed">{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Convergence Summary */}
              {sharedContext.convergenceSummary && (
                <section className="space-y-1 rounded-md border border-primary/20 bg-primary/5 p-2.5">
                  <h4 className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                    Convergence Summary
                  </h4>
                  <p className="text-xs leading-relaxed">
                    {sharedContext.convergenceSummary}
                  </p>
                </section>
              )}

              {/* Synthesize button */}
              {(canSynthesize || synthesizing) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5"
                  onClick={handleSynthesize}
                  disabled={synthesizing}
                >
                  {synthesizing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Synthesizing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      {sharedContext.convergenceSummary
                        ? "Re-synthesize"
                        : "Synthesize threads"}
                    </>
                  )}
                </Button>
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
