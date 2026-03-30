"use client";

import { useCallback, useEffect, useMemo } from "react";
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

import { useCanvasStore } from "@/lib/store/canvas-store";
import { ChatNode, CollaboratorsContext } from "@/components/canvas/ChatNode";
import { CollaboratorCursors } from "@/components/canvas/CollaboratorCursors";
import { AVAILABLE_MODELS } from "@/types/canvas";
import type { CollaboratorState, ConnectionEdge } from "@/types/canvas";
import { useYjs } from "@/lib/yjs/provider";
import { yjsAddEdge } from "@/lib/yjs/bridge";
import {
  useBroadcastCursor,
  setLocalAwareness,
  getCollaboratorColor,
} from "@/lib/yjs/awareness";

const nodeTypes = {
  chat: ChatNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: false,
  style: { stroke: "#3b82f6", strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#3b82f6",
    width: 16,
    height: 16,
  },
};

interface CanvasEditorProps {
  collaborators: CollaboratorState[];
  userId: string;
  userEmail: string;
}

export function CanvasEditor({ collaborators, userId, userEmail }: CanvasEditorProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, addChatNode, selectedNodeId, selectedEdgeId, selectEdge, closeSidebar } =
    useCanvasStore();
  const { screenToFlowPosition } = useReactFlow();
  const { doc, awareness } = useYjs();
  const broadcastCursor = useBroadcastCursor(awareness);

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
        style: { stroke: "#3b82f6", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#3b82f6",
          width: 16,
          height: 16,
        },
        data: { direction: "one_way" as const },
      });
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

  // Highlight the selected edge
  const styledEdges = useMemo(() => {
    if (!selectedEdgeId) return edges;
    return edges.map((edge) => {
      if (edge.id === selectedEdgeId) {
        return {
          ...edge,
          style: { stroke: "#3b82f6", strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#3b82f6",
            width: 20,
            height: 20,
          },
        };
      }
      return edge;
    });
  }, [edges, selectedEdgeId]);

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
    </div>
  );
}
