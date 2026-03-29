"use client";

import { useCanvasStore } from "@/lib/store/canvas-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

export function ChatListPanel() {
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const sidebarOpen = useCanvasStore((s) => s.sidebarOpen);
  const openSidebar = useCanvasStore((s) => s.openSidebar);

  return (
    <div className="w-[240px] border-r border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Chats
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {nodes.length}
        </Badge>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {nodes.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              No chats yet. Double-click the canvas or type below to start one.
            </p>
          )}
          {nodes.map((node) => {
            const isSelected = sidebarOpen && node.id === selectedNodeId;
            const messageCount = node.data.messages.filter(
              (m) => m.role !== "system"
            ).length;

            return (
              <button
                key={node.id}
                onClick={() => openSidebar(node.id)}
                className={`w-full text-left px-3 py-1.5 flex items-start gap-2 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-muted"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm truncate">
                      {node.data.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 shrink-0"
                    >
                      {node.data.modelConfig.label}
                    </Badge>
                    {messageCount > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MessageSquare className="h-2.5 w-2.5" />
                        {messageCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
