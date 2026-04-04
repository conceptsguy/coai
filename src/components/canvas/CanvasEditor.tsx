"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  MarkerType,
  type Connection,
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuid } from "uuid";

import { useCanvasStore } from "@/lib/store/canvas-store";
import { ChatNode, CollaboratorsContext } from "@/components/canvas/ChatNode";
import { FileNode } from "@/components/canvas/FileNode";
import { CollaboratorCursors } from "@/components/canvas/CollaboratorCursors";
import { AVAILABLE_MODELS } from "@/types/canvas";
import type { CollaboratorState, ConnectionEdge, ProjectKickoffResponse } from "@/types/canvas";
import { useYjs } from "@/lib/yjs/provider";
import { yjsAddEdge } from "@/lib/yjs/bridge";
import { syncInsertFileNode, syncInsertEdge } from "@/lib/supabase/sync";
import {
  useBroadcastCursor,
  setLocalAwareness,
  getCollaboratorColor,
} from "@/lib/yjs/awareness";

const nodeTypes = {
  chat: ChatNode,
  file: FileNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: false,
  style: { stroke: "#9ca3af", strokeWidth: 1.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#9ca3af",
    width: 12,
    height: 12,
  },
};

interface CanvasEditorProps {
  collaborators: CollaboratorState[];
  userId: string;
  userEmail: string;
}

export function CanvasEditor({ collaborators, userId, userEmail }: CanvasEditorProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, addChatNode, selectedNodeId, selectedEdgeId, selectEdge, closeSidebar, projectMode, sharedContext, setSharedContext, setProjectMode, projectId } =
    useCanvasStore();
  const { screenToFlowPosition } = useReactFlow();
  const { doc, awareness } = useYjs();
  const broadcastCursor = useBroadcastCursor(awareness);

  // Kickoff modal state
  const [kickoffOpen, setKickoffOpen] = useState(false);
  const [kickoffBrief, setKickoffBrief] = useState("");
  const [kickoffLoading, setKickoffLoading] = useState(false);
  const [kickoffDismissed, setKickoffDismissed] = useState(false);

  const showKickoffBanner =
    !kickoffDismissed &&
    projectMode === "canvas" &&
    sharedContext === null &&
    nodes.length > 0;

  const handleKickoff = useCallback(async () => {
    if (!projectId || !kickoffBrief.trim()) return;
    setKickoffLoading(true);
    try {
      const res = await fetch("/api/project/kickoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, brief: kickoffBrief }),
      });
      if (res.ok) {
        const data = (await res.json()) as ProjectKickoffResponse;
        setSharedContext(data.sharedContext);
        setProjectMode("ideation");
        setKickoffOpen(false);
        setKickoffBrief("");
      }
    } finally {
      setKickoffLoading(false);
    }
  }, [projectId, kickoffBrief, setSharedContext, setProjectMode]);

  // Auto-trigger kickoff if brief was stored from NewProjectDialog on landing page
  useEffect(() => {
    if (!projectId) return;
    const stored = sessionStorage.getItem(`kickoff:${projectId}`);
    if (stored) {
      sessionStorage.removeItem(`kickoff:${projectId}`);
      setKickoffBrief(stored);
      setKickoffOpen(true);
    }
  }, [projectId]);

  // Register screenToFlowPosition on the store so BottomInput can compute node positions
  useEffect(() => {
    useCanvasStore.getState().setScreenToFlowPosition(screenToFlowPosition);
    return () => {
      useCanvasStore.getState().setScreenToFlowPosition(null);
    };
  }, [screenToFlowPosition]);

  // Derive display name from email prefix
  const displayName = userEmail.split("@")[0] || "User";

  // Initialize local awareness with real user info
  useEffect(() => {
    if (!awareness) return;
    setLocalAwareness(awareness, {
      userId,
      displayName,
      color: getCollaboratorColor(awareness.clientID),
      cursor: null,
      selectedNodeId: null,
    });
  }, [awareness, userId, displayName]);

  // Set current user info on the store so node creation can stamp ownership
  useEffect(() => {
    useCanvasStore.getState().setCurrentUser(userId, displayName);
  }, [userId, displayName]);

  // Broadcast selected node to other collaborators
  useEffect(() => {
    setLocalAwareness(awareness, { selectedNodeId });
  }, [awareness, selectedNodeId]);

  const isValidConnection = useCallback(
    (connection: Connection | { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => {
      if (connection.source === connection.target) return false;
      const fromSource = connection.sourceHandle?.startsWith("source-");
      const toTarget = connection.targetHandle?.startsWith("target-");
      return !!fromSource && !!toTarget;
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;

      const exists = useCanvasStore
        .getState()
        .edges.some(
          (e) =>
            e.source === connection.source && e.target === connection.target
        );
      if (exists) return;

      const edgeId = `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`;

      yjsAddEdge(doc, {
        id: edgeId,
        source: connection.source!,
        sourceHandle: connection.sourceHandle,
        target: connection.target!,
        targetHandle: connection.targetHandle,
        animated: false,
        style: { stroke: "#9ca3af", strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#9ca3af",
          width: 12,
          height: 12,
        },
        data: { direction: "one_way" as const },
      });

      // Sync edge to Supabase for persistence
      const projectId = useCanvasStore.getState().projectId;
      if (projectId) {
        syncInsertEdge(
          projectId,
          edgeId,
          connection.source!,
          connection.target!,
          connection.sourceHandle ?? null,
          connection.targetHandle ?? null
        );
      }
    },
    [isValidConnection, doc]
  );

  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addChatNode(position, AVAILABLE_MODELS[0]);
    },
    [screenToFlowPosition, addChatNode]
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      broadcastCursor(flowPosition);
    },
    [screenToFlowPosition, broadcastCursor]
  );

  const onMouseLeave = useCallback(() => {
    broadcastCursor(null);
  }, [broadcastCursor]);

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: ConnectionEdge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    closeSidebar();
  }, [closeSidebar]);

  // ─── Drag-and-drop file upload ───

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();

      const files = event.dataTransfer.files;
      if (!files || files.length === 0) return;

      const projectId = useCanvasStore.getState().projectId;
      if (!projectId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const nodeId = uuid();
        const yOffset = i * 80; // Space multiple files vertically

        // Create file node immediately for responsiveness
        const isText =
          file.type.startsWith("text/") ||
          file.type === "application/json" ||
          file.type === "application/javascript" ||
          file.type === "application/typescript" ||
          file.type === "application/xml";

        let contentPreview = "";
        if (isText) {
          const text = await file.text();
          contentPreview = text.slice(0, 200);
        }

        const { _currentUserId, _currentUserName } = useCanvasStore.getState();

        useCanvasStore.getState().addFileNode(
          { x: position.x, y: position.y + yOffset },
          {
            title: file.name,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            storagePath: `${projectId}/${nodeId}/${file.name}`,
            contentPreview,
            createdAt: new Date().toISOString(),
            createdBy: _currentUserId,
            createdByName: _currentUserName,
          },
          nodeId
        );

        // Upload to server in background
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        formData.append("nodeId", nodeId);

        fetch("/api/files/upload", { method: "POST", body: formData }).then(
          async (res) => {
            if (!res.ok) {
              console.error("File upload failed:", await res.text());
            }
          }
        );

        // Sync node to Supabase
        syncInsertFileNode(
          projectId,
          nodeId,
          file.name,
          position.x,
          position.y + yOffset,
          {
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            storagePath: `${projectId}/${nodeId}/${file.name}`,
            contentText: isText ? await file.text() : null,
            createdBy: _currentUserId || null,
          }
        );
      }
    },
    [screenToFlowPosition]
  );

  // Compute edge labels from source node type + highlight selected edge
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      let styled = { ...edge };

      // Compute label from source node type if no custom label set
      if (!edge.label && !edge.data?.label) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          const typeLabel = sourceNode.type === "file" ? "File" : "Chat";
          styled = {
            ...styled,
            label: typeLabel,
            labelStyle: { fontSize: 10, fill: "#9ca3af", fontFamily: "var(--font-mono)" },
            labelBgStyle: { fill: "var(--node-bg)", stroke: "var(--node-border)", strokeWidth: 0.5 },
            labelBgPadding: [4, 6] as [number, number],
            labelBgBorderRadius: 4,
          };
        }
      }

      // Highlight selected edge
      if (edge.id === selectedEdgeId) {
        styled = {
          ...styled,
          style: { stroke: "#6b7280", strokeWidth: 2.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#6b7280",
            width: 16,
            height: 16,
          },
        };
      }

      return styled;
    });
  }, [edges, selectedEdgeId, nodes]);

  return (
    <div className="w-full h-full">
      <CollaboratorsContext.Provider value={collaborators}>
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          isValidConnection={isValidConnection}
          onDoubleClick={onDoubleClick}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
          <Controls className="!bg-card/80 !backdrop-blur-sm !border-border/50 !rounded-md !shadow-sm" />
          <MiniMap
            className="!bg-card/80 !backdrop-blur-sm !border-border/50 !rounded-md !shadow-sm"
            nodeColor="var(--primary)"
            maskColor="rgba(0,0,0,0.08)"
          />
        </ReactFlow>
      </CollaboratorsContext.Provider>

      {/* Collaborator cursors overlay */}
      <CollaboratorCursors collaborators={collaborators} />

      {/* Shared context kickoff banner */}
      {showKickoffBanner && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 rounded-md border border-border/60 bg-card/90 backdrop-blur-sm text-sm shadow-sm">
          <span className="text-muted-foreground">No shared context.</span>
          <button
            onClick={() => setKickoffOpen(true)}
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            Set up shared context →
          </button>
          <button
            onClick={() => setKickoffDismissed(true)}
            className="ml-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Kickoff modal */}
      {kickoffOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <h2 className="mb-1 text-sm font-semibold">Set up shared context</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Describe what your team is working on. The AI will generate a structured project context that all threads will use.
            </p>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={5}
              placeholder="e.g. We're redesigning our onboarding flow to improve activation for enterprise customers. The current flow has a 40% drop-off at step 3..."
              value={kickoffBrief}
              onChange={(e) => setKickoffBrief(e.target.value)}
              disabled={kickoffLoading}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => { setKickoffOpen(false); setKickoffBrief(""); }}
                className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                disabled={kickoffLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleKickoff}
                disabled={!kickoffBrief.trim() || kickoffLoading}
                className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {kickoffLoading ? "Generating..." : "Generate context"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
