"use client";

import { useCanvasStore } from "@/lib/store/canvas-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileText, FileCode, FileImage, File, Trash2 } from "lucide-react";
import { getColorForName } from "@/lib/yjs/awareness";
import type { FileFlowNode } from "@/types/canvas";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("css") ||
    mimeType.includes("html")
  )
    return FileCode;
  if (mimeType.startsWith("text/")) return FileText;
  return File;
}

function getFileExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase();
  return ext && ext.length <= 5 ? ext : "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatListPanel() {
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const sidebarOpen = useCanvasStore((s) => s.sidebarOpen);
  const openSidebar = useCanvasStore((s) => s.openSidebar);
  const removeNode = useCanvasStore((s) => s.removeNode);

  const chatNodes = nodes.filter((n) => n.type === "chat");
  const fileNodes = nodes.filter((n) => n.type === "file") as FileFlowNode[];

  return (
    <div className="w-[240px] border-r border-border bg-sidebar flex flex-col shrink-0">
      {/* ── Chats section ── */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Chats
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {chatNodes.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {chatNodes.length === 0 && fileNodes.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              No chats yet. Double-click the canvas or type below to start one.
            </p>
          )}
          {chatNodes.map((node) => {
            const isSelected = sidebarOpen && node.id === selectedNodeId;
            const messageCount = node.data.messages.filter(
              (m) => m.role !== "system"
            ).length;

            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                onClick={() => openSidebar(node.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openSidebar(node.id)}
                className={`group w-full text-left px-3 py-1.5 flex items-start gap-2 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-muted"
                    : "hover:bg-muted/50"
                }`}
              >
                {node.data.createdByName && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: getColorForName(node.data.createdByName) }}
                    title={node.data.createdByName}
                  >
                    <span className="text-[9px] font-semibold text-white leading-none">
                      {node.data.createdByName
                        .split(/[\s._-]+/)
                        .slice(0, 2)
                        .map((s: string) => s[0]?.toUpperCase() ?? "")
                        .join("")}
                    </span>
                  </div>
                )}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(node.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive shrink-0 mt-0.5"
                  title="Delete chat"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* ── Files section ── */}
      <div className="border-t border-border">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Files
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {fileNodes.length}
          </Badge>
        </div>

        <ScrollArea className="max-h-[240px]">
          <div className="px-2 pb-2 space-y-1">
            {fileNodes.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 py-3 text-center">
                Drop files onto the canvas to add them.
              </p>
            )}
            {fileNodes.map((node) => {
              const isSelected = sidebarOpen && node.id === selectedNodeId;
              const Icon = getFileIcon(node.data.fileType);
              const ext = getFileExtension(node.data.fileName);

              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSidebar(node.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openSidebar(node.id)}
                  className={`group w-full text-left px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-muted border-border"
                      : "border-transparent hover:bg-muted/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium truncate">
                          {node.data.title}
                        </span>
                        {ext && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 font-mono">
                            {ext}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatFileSize(node.data.fileSize)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive shrink-0 mt-0.5"
                      title="Delete file"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
