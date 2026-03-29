"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ModelSelector } from "@/components/chat/ModelSelector";
import type { ConnectedContext } from "@/types/canvas";
import { syncInsertMessage } from "@/lib/supabase/sync";

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
        className="font-semibold text-sm bg-transparent border-b border-primary/40 outline-none"
      />
    );
  }

  return (
    <h2
      className="font-semibold text-sm cursor-text"
      onClick={() => setIsEditing(true)}
    >
      {title}
    </h2>
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

export function ChatSidebar() {
  const {
    nodes,
    edges,
    selectedNodeId,
    sidebarOpen,
    closeSidebar,
    getConnectedContexts,
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

  if (!sidebarOpen || !selectedNode) return null;

  return (
    <div className="w-[420px] h-full border-l border-border bg-card flex flex-col shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EditableSidebarTitle nodeId={selectedNode.id} title={selectedNode.data.title} />
          <Badge variant="secondary" className="text-[10px]">
            {selectedNode.data.modelConfig.label}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={closeSidebar} className="h-7 w-7 p-0">
          ✕
        </Button>
      </div>

      {/* Model selector */}
      <div className="px-4 py-2 border-b border-border">
        <ModelSelector nodeId={selectedNode.id} />
      </div>

      {/* Connected context indicator */}
      {connectedContexts.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Informed by {connectedContexts.length} connected chat{connectedContexts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1">
            {connectedContexts.map((ctx) => (
              <div
                key={ctx.sourceNodeId}
                className="text-[11px] text-blue-600 dark:text-blue-400 pl-3.5"
              >
                &larr; {ctx.sourceTitle}
                {ctx.summary ? (
                  <span className="text-blue-500/60 dark:text-blue-500/40"> &middot; summarized</span>
                ) : (
                  <span className="text-blue-500/60 dark:text-blue-500/40"> &middot; no summary yet</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start a conversation with {selectedNode.data.modelConfig.label}
              {connectedContexts.length > 0 && (
                <>
                  <br />
                  <span className="text-blue-600 text-xs">
                    This chat has context from {connectedContexts.length} connected chat{connectedContexts.length !== 1 ? "s" : ""}
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
