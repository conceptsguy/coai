"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ArrowUp, Maximize2, Minimize2, ChevronDown } from "lucide-react";
import { SourceDetailPanel } from "@/components/chat/SourceDetailPanel";
import { ModelSelector } from "@/components/chat/ModelSelector";
import type { ConnectedContext } from "@/types/canvas";
import { syncInsertMessage } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";
import { getColorForName } from "@/lib/yjs/awareness";

function EditableSidebarTitle({ nodeId, title }: { nodeId: string; title: string }) {
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
      useCanvasStore.getState().updateNodeTitle(nodeId, trimmed);
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  }, [editValue, title, nodeId]);

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
        className="font-semibold text-sm bg-transparent border-b border-primary/40 outline-none flex-1 min-w-0"
      />
    );
  }

  return (
    <h2
      className="font-semibold text-sm cursor-text truncate"
      onClick={() => setIsEditing(true)}
    >
      {title}
    </h2>
  );
}

function ConnectedContextFooter({ contexts }: { contexts: ConnectedContext[] }) {
  const [expanded, setExpanded] = useState(false);

  if (contexts.length === 0) return null;

  return (
    <div className="px-3 pb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full cursor-pointer"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
        Informed by {contexts.length} source{contexts.length !== 1 ? "s" : ""}
        <ChevronDown className={cn("h-2.5 w-2.5 ml-auto transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5 pl-3">
          {contexts.map((ctx) => (
            <div key={ctx.sourceNodeId} className="text-[10px] text-muted-foreground truncate">
              &larr; {ctx.sourceTitle}
              {ctx.summary
                ? <span className="opacity-50"> &middot; summarized</span>
                : <span className="opacity-50"> &middot; no summary yet</span>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getPartsText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

async function summarizeChat(
  nodeId: string,
  title: string,
  messages: Array<{ role: string; content: string }>
) {
  try {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, messages }),
    });
    if (res.ok) {
      const { summary } = await res.json();
      useCanvasStore.getState().updateNodeSummary(nodeId, summary);
    }
  } catch {
    // Summarization is best-effort, don't block chat
  }
}

const DEFAULT_TITLE_PATTERN = /^Chat \d+$/;

async function suggestTitle(
  nodeId: string,
  messages: Array<{ role: string; content: string }>
) {
  try {
    const res = await fetch("/api/suggest-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (res.ok) {
      const { title } = await res.json();
      if (title) {
        useCanvasStore.getState().updateNodeTitle(nodeId, title);
      }
    }
  } catch {
    // Auto-title is best-effort
  }
}

async function suggestProjectMeta(
  messages: Array<{ role: string; content: string }>
) {
  const store = useCanvasStore.getState();
  if (store.project.title !== "Untitled Project") return;

  try {
    const res = await fetch("/api/suggest-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, includeDescription: true }),
    });
    if (res.ok) {
      const { title, description } = await res.json();
      if (title) store.updateProjectTitle(title);
      if (description) store.updateProjectPurpose(description);
    }
  } catch {
    // Best-effort
  }
}

export function ChatSidebar() {
  const {
    nodes,
    edges,
    selectedNodeId,
    sidebarOpen,
    sidebarMode,
    sidebarExpanded,
    closeSidebar,
    toggleSidebarExpanded,
    getConnectedContexts,
    _pendingFirstMessage,
    setPendingFirstMessage,
  } = useCanvasStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const connectedContexts: ConnectedContext[] = useMemo(() => {
    if (!selectedNodeId) return [];
    return getConnectedContexts(selectedNodeId);
  }, [selectedNodeId, edges, nodes]);

  const transport = useMemo(() => {
    if (!selectedNode) return undefined;
    return new DefaultChatTransport({
      api: "/api/chat",
      body: {
        provider: selectedNode.data.modelConfig.provider,
        modelId: selectedNode.data.modelConfig.modelId,
        connectedContexts:
          connectedContexts.length > 0 ? connectedContexts : undefined,
      },
    });
  }, [
    selectedNode?.data.modelConfig.provider,
    selectedNode?.data.modelConfig.modelId,
    connectedContexts,
  ]);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    id: selectedNodeId ?? undefined,
    onFinish({ message }) {
      if (!selectedNodeId) return;

      // Clear streaming guard so Yjs observer can update this node again
      useCanvasStore.getState().setStreamingNodeId(null);

      const text = getPartsText(
        message.parts as Array<{ type: string; text?: string }>
      );
      const msgId = uuid();

      // Write final message to Yjs (syncs to all peers)
      const store = useCanvasStore.getState();
      store.addMessage(selectedNodeId, {
        id: msgId,
        role: "assistant",
        content: text,
        createdAt: new Date().toISOString(),
      });

      // Also write to Supabase for server-side AI API routes
      syncInsertMessage(selectedNodeId, msgId, "assistant", text);

      const node = store.nodes.find((n) => n.id === selectedNodeId);
      if (node) {
        const allMessages = [
          ...node.data.messages,
          { role: "assistant", content: text },
        ];
        const simpleMsgs = allMessages.map((m) => ({ role: m.role, content: m.content }));

        summarizeChat(selectedNodeId, node.data.title, simpleMsgs);

        const assistantCount = allMessages.filter((m) => m.role === "assistant").length;
        if (assistantCount === 1 && DEFAULT_TITLE_PATTERN.test(node.data.title)) {
          suggestTitle(selectedNodeId, simpleMsgs);
          suggestProjectMeta(simpleMsgs);
        }
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Sync node messages into useChat when switching nodes
  useEffect(() => {
    if (selectedNode) {
      setMessages(
        selectedNode.data.messages.map((m) => ({
          id: m.id,
          role: m.role,
          parts: [{ type: "text" as const, text: m.content }],
        }))
      );
    }
  }, [selectedNodeId]);

  // Handle pending first message from BottomInput
  useEffect(() => {
    if (!_pendingFirstMessage || !selectedNodeId || !sidebarOpen) return;

    const content = _pendingFirstMessage;
    setPendingFirstMessage(null);

    const msgId = uuid();

    // Write user message to Yjs
    useCanvasStore.getState().addMessage(selectedNodeId, {
      id: msgId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    });

    // Write to Supabase
    syncInsertMessage(selectedNodeId, msgId, "user", content);

    // Guard this node during streaming
    useCanvasStore.getState().setStreamingNodeId(selectedNodeId);

    sendMessage({ text: content });
  }, [selectedNodeId, sidebarOpen, _pendingFirstMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedNodeId) return;

    const msgId = uuid();
    const content = input;

    // Write user message to Yjs (syncs to all peers)
    useCanvasStore.getState().addMessage(selectedNodeId, {
      id: msgId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    });

    // Also write to Supabase for server-side AI API routes
    syncInsertMessage(selectedNodeId, msgId, "user", content);

    // Guard this node's messages from Yjs observer overwrites during streaming
    useCanvasStore.getState().setStreamingNodeId(selectedNodeId);

    sendMessage({ text: content });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  if (!sidebarOpen) return null;
  if (sidebarMode === "source-detail") return <SourceDetailPanel />;
  if (!selectedNode) return null;

  return (
    <div
      className={cn(
        "absolute bg-card flex flex-col z-20 border border-border shadow-lg",
        sidebarExpanded
          ? "inset-0"
          : "right-3 top-3 bottom-3 w-[420px] rounded-xl"
      )}
    >
      {/* Header — avatar + title + expand + close */}
      <div className={cn(
        "px-3 py-2 border-b border-border flex items-center justify-between gap-2",
        !sidebarExpanded && "rounded-t-xl"
      )}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedNode.data.createdByName && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: getColorForName(selectedNode.data.createdByName) }}
              title={`Created by ${selectedNode.data.createdByName}`}
            >
              <span className="text-[10px] font-semibold text-white leading-none">
                {selectedNode.data.createdByName
                  .split(/[\s._-]+/)
                  .slice(0, 2)
                  .map((s: string) => s[0]?.toUpperCase() ?? "")
                  .join("")}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <EditableSidebarTitle nodeId={selectedNode.id} title={selectedNode.data.title} />
            {selectedNode.data.createdByName && (
              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                Created by {selectedNode.data.createdByName}
              </p>
            )}
          </div>
        </div>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" ref={scrollRef}>
        <div className={cn("space-y-3", sidebarExpanded && "max-w-2xl mx-auto")}>
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start a conversation with {selectedNode.data.modelConfig.label}
              {connectedContexts.length > 0 && (
                <>
                  <br />
                  <span className="text-muted-foreground text-xs">
                    This chat has context from {connectedContexts.length} source{connectedContexts.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </p>
          )}
          {messages.map((msg) => {
            const text = getPartsText(msg.parts as Array<{ type: string; text?: string }>);
            return (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-muted text-foreground mr-8"
                }`}
              >
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="bg-muted rounded-lg px-3 py-2 text-sm mr-8 animate-pulse">
              Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Bottom section — input + model selector + context footer */}
      <div className={cn("border-t border-border", !sidebarExpanded && "rounded-b-xl")}>
        <form onSubmit={onSubmit} className={cn("px-3 pt-3", sidebarExpanded && "max-w-2xl mx-auto")}>
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[72px] max-h-[200px] resize-none text-sm pr-12 rounded-lg"
              rows={3}
            />
            <Button
              type="submit"
              size="icon-xs"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 h-7 w-7 rounded-md"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1 mb-2">
            <ModelSelector nodeId={selectedNode.id} />
            <span className="text-[10px] text-muted-foreground">
              Enter to send
            </span>
          </div>
        </form>
        <ConnectedContextFooter contexts={connectedContexts} />
      </div>
    </div>
  );
}
