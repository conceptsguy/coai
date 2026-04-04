"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useYjs } from "@/lib/yjs/provider";
import { setLocalAwareness, getColorForName } from "@/lib/yjs/awareness";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUp,
  MessageSquare,
  Plus,
  Focus,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { SharedContextPanel } from "@/components/thread/SharedContextPanel";
import { syncInsertMessage } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";
import type { CollaboratorState, ConnectedContext } from "@/types/canvas";

// ── helpers mirrored from ChatSidebar ────────────────────────────────────────

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
    // Best-effort
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
      if (title) useCanvasStore.getState().updateNodeTitle(nodeId, title);
    }
  } catch {
    // Best-effort
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

async function maybeAnalyzeForContextUpdate(
  nodeId: string,
  projectId: string,
  lastUserMessage: string,
  lastAssistantMessage: string
) {
  const store = useCanvasStore.getState();
  if (!store.sharedContext) return;
  const exchangeText = `User: ${lastUserMessage.slice(0, 500)}\n\nAssistant: ${lastAssistantMessage.slice(0, 500)}`;
  try {
    const res = await fetch("/api/context/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, nodeId, exchangeText }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.update) store.addContextUpdateProposal(data.update);
    }
  } catch {
    // Best-effort
  }
}

// ── Thread list (left panel) ──────────────────────────────────────────────────

function ThreadListPanel({
  collaborators,
}: {
  collaborators: CollaboratorState[];
}) {
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const createAndSelectThread = useCanvasStore((s) => s.createAndSelectThread);
  const removeNode = useCanvasStore((s) => s.removeNode);

  const chatNodes = nodes.filter((n) => n.type === "chat");

  const selectThread = useCallback(
    (nodeId: string) => {
      useCanvasStore.setState({ selectedNodeId: nodeId });
    },
    []
  );

  return (
    <div className="w-[240px] border-r border-border bg-sidebar flex flex-col shrink-0">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Threads
        </span>
        <button
          onClick={createAndSelectThread}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="New thread"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {chatNodes.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              No threads yet.{" "}
              <button
                onClick={createAndSelectThread}
                className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
              >
                Create one
              </button>
            </p>
          )}
          {chatNodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            const messageCount = node.data.messages.filter(
              (m) => m.role !== "system"
            ).length;
            // Collaborators currently viewing this thread
            const presentHere = collaborators.filter(
              (c) => c.selectedNodeId === node.id
            );

            return (
              <button
                key={node.id}
                onClick={() => selectThread(node.id)}
                className={`group w-full text-left px-3 py-1.5 flex items-start gap-2 cursor-pointer transition-colors ${
                  isSelected ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                {node.data.createdByName && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: getColorForName(node.data.createdByName),
                    }}
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
                  <span className="text-sm truncate block">
                    {node.data.title}
                  </span>
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
                {/* Collaborator presence dots */}
                {presentHere.length > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0 mt-1">
                    {presentHere.slice(0, 3).map((c) => (
                      <div
                        key={c.userId}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                        title={c.displayName}
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(node.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive shrink-0 mt-0.5"
                  title="Delete thread"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Editable thread title ─────────────────────────────────────────────────────

function EditableThreadTitle({
  nodeId,
  title,
}: {
  nodeId: string;
  title: string;
}) {
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
          if (e.key === "Escape") {
            setEditValue(title);
            setIsEditing(false);
          }
        }}
        className="font-semibold text-sm bg-transparent border-b border-primary/40 outline-none flex-1 min-w-0"
      />
    );
  }

  return (
    <h2
      className="font-semibold text-sm cursor-text truncate hover:text-primary/80 transition-colors"
      onClick={() => setIsEditing(true)}
    >
      {title}
    </h2>
  );
}

// ── Thread chat area (center) ─────────────────────────────────────────────────

function ThreadChatArea({ projectId }: { projectId: string; }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const getConnectedContexts = useCanvasStore((s) => s.getConnectedContexts);
  const sharedContext = useCanvasStore((s) => s.sharedContext);
  const focusMode = useCanvasStore((s) => s.focusMode);
  const contextPanelOpen = useCanvasStore((s) => s.contextPanelOpen);
  const toggleFocusMode = useCanvasStore((s) => s.toggleFocusMode);
  const toggleContextPanel = useCanvasStore((s) => s.toggleContextPanel);
  const createAndSelectThread = useCanvasStore((s) => s.createAndSelectThread);
  const { awareness } = useYjs();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Broadcast selected thread to collaborators via awareness
  useEffect(() => {
    setLocalAwareness(awareness, { selectedNodeId });
  }, [awareness, selectedNodeId]);
  const [input, setInput] = useState("");
  const lastUserMessageRef = useRef<string>("");

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const chatNode = selectedNode?.type === "chat" ? selectedNode : null;

  const connectedContexts: ConnectedContext[] = useMemo(() => {
    if (!selectedNodeId) return [];
    return getConnectedContexts(selectedNodeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, edges, nodes, getConnectedContexts]);

  const transport = useMemo(() => {
    if (!chatNode) return undefined;
    return new DefaultChatTransport({
      api: "/api/chat",
      body: {
        provider: chatNode.data.modelConfig.provider,
        modelId: chatNode.data.modelConfig.modelId,
        connectedContexts:
          connectedContexts.length > 0 ? connectedContexts : undefined,
        sharedContext: sharedContext ?? undefined,
      },
    });
  }, [
    chatNode?.data.modelConfig.provider,
    chatNode?.data.modelConfig.modelId,
    connectedContexts,
    sharedContext,
  ]);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    id: selectedNodeId ?? undefined,
    onFinish({ message }) {
      if (!selectedNodeId) return;

      useCanvasStore.getState().setStreamingNodeId(null);

      const text = getPartsText(
        message.parts as Array<{ type: string; text?: string }>
      );
      const msgId = uuid();

      const store = useCanvasStore.getState();
      store.addMessage(selectedNodeId, {
        id: msgId,
        role: "assistant",
        content: text,
        createdAt: new Date().toISOString(),
      });

      syncInsertMessage(selectedNodeId, msgId, "assistant", text);

      const node = store.nodes.find((n) => n.id === selectedNodeId);
      if (node && node.type === "chat") {
        const allMessages = [
          ...node.data.messages,
          { role: "assistant", content: text },
        ];
        const simpleMsgs = allMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        summarizeChat(selectedNodeId, node.data.title, simpleMsgs);

        const assistantCount = allMessages.filter(
          (m) => m.role === "assistant"
        ).length;
        if (
          assistantCount === 1 &&
          DEFAULT_TITLE_PATTERN.test(node.data.title)
        ) {
          suggestTitle(selectedNodeId, simpleMsgs);
          suggestProjectMeta(simpleMsgs);
        }

        if (store.projectId && store.sharedContext && lastUserMessageRef.current) {
          maybeAnalyzeForContextUpdate(
            selectedNodeId,
            store.projectId,
            lastUserMessageRef.current,
            text
          );
        }
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Sync node messages into useChat when switching nodes
  useEffect(() => {
    if (chatNode) {
      setMessages(
        chatNode.data.messages
          .filter((m) => m.content && m.content.trim() !== "")
          .map((m) => ({
            id: m.id,
            role: m.role,
            parts: [{ type: "text" as const, text: m.content }],
          }))
      );
    }
    // Reset input when switching nodes
    setInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    lastUserMessageRef.current = content;

    useCanvasStore.getState().addMessage(selectedNodeId, {
      id: msgId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    });

    syncInsertMessage(selectedNodeId, msgId, "user", content);
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

  // No thread selected
  if (!chatNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <MessageSquare className="h-10 w-10 opacity-20" />
        <p className="text-sm">Select a thread or create a new one</p>
        <Button
          size="sm"
          variant="outline"
          onClick={createAndSelectThread}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          New thread
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Thread header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {chatNode.data.createdByName && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: getColorForName(chatNode.data.createdByName),
              }}
              title={`Created by ${chatNode.data.createdByName}`}
            >
              <span className="text-[10px] font-semibold text-white leading-none">
                {chatNode.data.createdByName
                  .split(/[\s._-]+/)
                  .slice(0, 2)
                  .map((s: string) => s[0]?.toUpperCase() ?? "")
                  .join("")}
              </span>
            </div>
          )}
          <EditableThreadTitle
            nodeId={chatNode.id}
            title={chatNode.data.title}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ModelSelector nodeId={chatNode.id} />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleFocusMode}
            className={cn("h-7 w-7", focusMode && "bg-muted")}
            title={focusMode ? "Exit focus mode" : "Focus mode (hide context)"}
          >
            <Focus className="h-3.5 w-3.5" />
          </Button>
          {!focusMode && !contextPanelOpen && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleContextPanel}
              className="h-7 w-7"
              title="Show shared context"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 max-w-3xl w-full mx-auto"
        ref={scrollRef}
      >
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Start a conversation with {chatNode.data.modelConfig.label}
            </p>
          )}
          {messages.map((msg) => {
            const text = getPartsText(
              msg.parts as Array<{ type: string; text?: string }>
            );
            return (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-12"
                    : "bg-muted text-foreground mr-12"
                }`}
              >
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="bg-muted rounded-lg px-3 py-2 text-sm mr-12 animate-pulse">
              Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 pt-3 pb-4 max-w-3xl w-full mx-auto shrink-0">
        <form onSubmit={onSubmit}>
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[80px] max-h-[240px] resize-none text-sm pr-12 rounded-lg"
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
          <div className="flex items-center justify-end mt-1">
            <span className="text-[10px] text-muted-foreground">
              Enter to send · Shift+Enter for newline
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Root ThreadView ───────────────────────────────────────────────────────────

interface ThreadViewProps {
  projectId: string;
  collaborators: CollaboratorState[];
}

export function ThreadView({ projectId, collaborators }: ThreadViewProps) {
  const focusMode = useCanvasStore((s) => s.focusMode);
  const contextPanelOpen = useCanvasStore((s) => s.contextPanelOpen);

  const showContextPanel = !focusMode && contextPanelOpen;

  return (
    <div className="flex-1 flex overflow-hidden">
      <ThreadListPanel collaborators={collaborators} />
      <ThreadChatArea projectId={projectId} />
      {showContextPanel && <SharedContextPanel projectId={projectId} />}
    </div>
  );
}
