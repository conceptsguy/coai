"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import type { ChatFlowNode } from "@/types/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { Badge } from "@/components/ui/badge";

const inactiveClass = "!bg-muted-foreground/30 !border-muted-foreground/20";
const inActiveClass = "!bg-blue-500 !border-blue-300";
const outActiveClass = "!bg-orange-500 !border-orange-300";

/**
 * Renders 4 handles: input (target) + output (source) on BOTH left and right sides.
 * Offset vertically so they don't overlap — input on top, output on bottom.
 */
function NodeHandles({
  incomingCount,
  outgoingCount,
  size = "sm",
}: {
  incomingCount: number;
  outgoingCount: number;
  size?: "sm" | "md";
}) {
  const s = size === "sm" ? "!w-2 !h-2" : "!w-2.5 !h-2.5";

  return (
    <>
      {/* Left side — input top, output bottom */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className={`${s} !border-2 ${incomingCount > 0 ? inActiveClass : inactiveClass}`}
        style={{ top: "35%" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className={`${s} !border-2 ${outgoingCount > 0 ? outActiveClass : inactiveClass}`}
        style={{ top: "65%" }}
      />

      {/* Right side — input top, output bottom */}
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className={`${s} !border-2 ${incomingCount > 0 ? inActiveClass : inactiveClass}`}
        style={{ top: "35%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className={`${s} !border-2 ${outgoingCount > 0 ? outActiveClass : inactiveClass}`}
        style={{ top: "65%" }}
      />
    </>
  );
}

function EditableTitle({
  nodeId,
  title,
  className,
}: {
  nodeId: string;
  title: string;
  className?: string;
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
        className={`nodrag bg-transparent border-b border-primary/40 outline-none ${className ?? ""}`}
      />
    );
  }

  return (
    <span
      className={`cursor-text ${className ?? ""}`}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {title}
    </span>
  );
}

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

function ChatNodeComponent({ id, data }: NodeProps<ChatFlowNode>) {
  const { openSidebar } = useCanvasStore();
  const edges = useEdges();
  const [hovered, setHovered] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messageCount = data.messages.filter((m) => m.role !== "system").length;
  const incomingCount = edges.filter((e) => e.target === id).length;
  const outgoingCount = edges.filter((e) => e.source === id).length;

  const onMouseEnter = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setHovered(true), 400);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(false);
  }, []);

  return (
    <div
      className="relative bg-card border border-border rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[180px] hover:shadow-md transition-shadow"
      onClick={() => openSidebar(id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <NodeHandles incomingCount={incomingCount} outgoingCount={outgoingCount} size="sm" />

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <EditableTitle nodeId={id} title={data.title} className="text-sm font-medium truncate" />
        <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
          {data.modelConfig.label}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mt-1">
        {messageCount > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {messageCount} msg{messageCount !== 1 ? "s" : ""}
          </span>
        )}
        {data.lastMessagePreview && (
          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
            {data.lastMessagePreview}
          </p>
        )}
        {incomingCount > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 text-blue-600 border-blue-300">
            {incomingCount} in
          </Badge>
        )}
        {outgoingCount > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-600 border-orange-300">
            {outgoingCount} out
          </Badge>
        )}
      </div>

      {hovered && messageCount > 0 && <HoverPreview data={data} />}
    </div>
  );
}

export const ChatNode = memo(ChatNodeComponent);
