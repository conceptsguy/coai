"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import type { ChatFlowNode, CollaboratorState } from "@/types/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { getColorForName } from "@/lib/yjs/awareness";
import { useContext, createContext } from "react";

/**
 * Context to pass collaborator states to ChatNode without prop drilling
 * through React Flow's nodeTypes. Set by CanvasEditor.
 */
export const CollaboratorsContext = createContext<CollaboratorState[]>([]);

// ─── Handle styling (Blender-inspired: small, flush, borderless) ───

const handleSize = "!w-1.5 !h-1.5";
const inactiveHandle = `${handleSize} !border-0 !bg-muted-foreground/20`;
const activeTargetHandle = `${handleSize} !border-0 !bg-blue-500/60`;
const activeSourceHandle = `${handleSize} !border-0 !bg-orange-500/60`;

function NodeHandles({
  incomingCount,
  outgoingCount,
}: {
  incomingCount: number;
  outgoingCount: number;
}) {
  return (
    <>
      {/* Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className={incomingCount > 0 ? activeTargetHandle : inactiveHandle}
        style={{ top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className={outgoingCount > 0 ? activeSourceHandle : inactiveHandle}
        style={{ top: "50%" }}
      />

      {/* Right side */}
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className={incomingCount > 0 ? activeTargetHandle : inactiveHandle}
        style={{ top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className={outgoingCount > 0 ? activeSourceHandle : inactiveHandle}
        style={{ top: "50%" }}
      />
    </>
  );
}

// ─── Relative time utility ───

function relativeTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Owner avatar (initials) ───

function OwnerAvatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: getColorForName(name) }}
    >
      <span className="text-[9px] font-semibold text-white leading-none">
        {initials || "?"}
      </span>
    </div>
  );
}

// ─── Editable title ───

function EditableTitle({
  nodeId,
  title,
  className,
  color,
}: {
  nodeId: string;
  title: string;
  className?: string;
  color?: string;
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
        className={`nodrag bg-transparent border-b border-[var(--node-fg)]/30 outline-none ${className ?? ""}`}
        style={color ? { color } : undefined}
      />
    );
  }

  return (
    <span
      className={`cursor-text ${className ?? ""}`}
      style={color ? { color } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {title}
    </span>
  );
}

// ─── Hover preview (progressive disclosure) ───

function HoverPreview({ data }: { data: ChatFlowNode["data"] }) {
  const visibleMessages = data.messages
    .filter((m) => m.role !== "system")
    .slice(-4);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-[300px] bg-popover border border-border rounded-lg shadow-xl overflow-hidden pointer-events-none">
      <div className="px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-[10px] text-muted-foreground font-medium">
          Recent messages
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5 max-h-[220px] overflow-hidden">
        {visibleMessages.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No messages yet</p>
        ) : (
          visibleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`text-xs rounded-md px-2 py-1.5 ${
                msg.role === "user"
                  ? "bg-primary/10 text-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <span className="font-medium text-[10px] uppercase text-muted-foreground">
                {msg.role === "user" ? "You" : "AI"}
              </span>
              <p className="mt-0.5 line-clamp-3">{msg.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main node component ───

function ChatNodeComponent({ id, data }: NodeProps<ChatFlowNode>) {
  const { openSidebar } = useCanvasStore();
  const edges = useEdges();
  const [hovered, setHovered] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collaborators = useContext(CollaboratorsContext);

  const messageCount = data.messages.filter((m) => m.role !== "system").length;
  const incomingCount = edges.filter((e) => e.target === id).length;
  const outgoingCount = edges.filter((e) => e.source === id).length;

  // Derive last updated timestamp from most recent message
  const lastMessage = [...data.messages]
    .reverse()
    .find((m) => m.role !== "system");
  const updatedAt = lastMessage?.createdAt || data.createdAt;

  // Find collaborators who have this node selected
  const viewers = collaborators.filter((c) => c.selectedNodeId === id);

  const onMouseEnter = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setHovered(true), 400);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(false);
  }, []);

  return (
    <div
      className={`relative rounded-xl px-3 py-2.5 shadow-sm cursor-pointer min-w-[180px] max-w-[220px] hover:shadow-md transition-shadow ${
        viewers.length > 0 ? "border-2" : "border"
      }`}
      style={{
        backgroundColor: "var(--node-bg)",
        borderColor: viewers.length > 0 ? viewers[0].color : "var(--node-border)",
      }}
      onClick={() => openSidebar(id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <NodeHandles incomingCount={incomingCount} outgoingCount={outgoingCount} />

      {/* Type badge */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {data.createdByName && <OwnerAvatar name={data.createdByName} />}
          <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--node-muted)" }} />
        </div>
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border shrink-0"
          style={{
            color: "var(--node-muted)",
            borderColor: "var(--node-border)",
          }}
        >
          Chat
        </span>
      </div>

      <EditableTitle
        nodeId={id}
        title={data.title}
        className="text-sm font-semibold truncate block"
        color="var(--node-fg)"
      />

      {/* Subtitle: model + timestamp */}
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-[10px] font-mono" style={{ color: "var(--node-muted)" }}>
          {data.modelConfig.label}
        </span>
        {messageCount > 0 && (
          <span className="text-[10px]" style={{ color: "var(--node-muted)" }}>
            · {messageCount} msg{messageCount !== 1 ? "s" : ""}
          </span>
        )}
        {updatedAt && (
          <span className="text-[10px] font-mono" style={{ color: "var(--node-muted)" }}>
            · {relativeTime(updatedAt)}
          </span>
        )}
      </div>

      {hovered && messageCount > 0 && <HoverPreview data={data} />}
    </div>
  );
}

export const ChatNode = memo(ChatNodeComponent);
