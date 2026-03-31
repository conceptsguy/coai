"use client";

import { memo, useState, useRef, useCallback, useContext } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import { FileText, FileCode, FileImage, File } from "lucide-react";
import type { FileFlowNode, CollaboratorState } from "@/types/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { CollaboratorsContext } from "@/components/canvas/ChatNode";
import { getColorForName } from "@/lib/yjs/awareness";

// ─── Handle styling (matches ChatNode) ───

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

function HoverPreview({ data }: { data: FileFlowNode["data"] }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-[280px] bg-popover border border-border rounded-lg shadow-xl overflow-hidden pointer-events-none">
      <div className="px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-[10px] text-muted-foreground font-medium">
          {data.fileName} &middot; {formatFileSize(data.fileSize)}
        </span>
      </div>
      <div className="px-3 py-2 max-h-[160px] overflow-hidden">
        {data.contentPreview ? (
          <p className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {data.contentPreview}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Binary file — no preview available
          </p>
        )}
      </div>
    </div>
  );
}

function FileNodeComponent({ id, data }: NodeProps<FileFlowNode>) {
  const { openSidebar } = useCanvasStore();
  const edges = useEdges();
  const [hovered, setHovered] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collaborators = useContext(CollaboratorsContext);

  const incomingCount = edges.filter((e) => e.target === id).length;
  const outgoingCount = edges.filter((e) => e.source === id).length;
  const viewers = collaborators.filter((c) => c.selectedNodeId === id);

  const Icon = getFileIcon(data.fileType);

  const onMouseEnter = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setHovered(true), 400);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(false);
  }, []);

  return (
    <div
      className={`relative rounded-xl px-3 py-2.5 shadow-sm cursor-pointer min-w-[160px] max-w-[200px] hover:shadow-md transition-shadow ${
        viewers.length > 0 ? "border-2" : "border border-white/10"
      }`}
      style={{
        backgroundColor: "oklch(0.20 0.012 160)",
        borderColor: viewers.length > 0 ? viewers[0].color : undefined,
      }}
      onClick={() => openSidebar(id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <NodeHandles incomingCount={incomingCount} outgoingCount={outgoingCount} />

      <div className="flex items-center gap-2">
        {data.createdByName && <OwnerAvatar name={data.createdByName} />}
        <Icon className="w-4 h-4 text-emerald-400/70 shrink-0" />
        <span className="text-sm font-medium truncate text-white/90">
          {data.title}
        </span>
      </div>

      <div className={`mt-1 flex items-center gap-2 ${data.createdByName ? "pl-7" : ""}`}>
        <span className="font-mono text-[10px] text-white/40">
          {formatFileSize(data.fileSize)}
        </span>
      </div>

      {hovered && <HoverPreview data={data} />}
    </div>
  );
}

export const FileNode = memo(FileNodeComponent);
