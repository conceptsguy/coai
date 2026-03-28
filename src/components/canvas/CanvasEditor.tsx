"use client";

import { useCallback } from "react";
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
import { ChatNode } from "@/components/canvas/ChatNode";
import { ProjectHeader } from "@/components/canvas/ProjectHeader";
import { AVAILABLE_MODELS } from "@/types/canvas";

const nodeTypes = {
  chat: ChatNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
  style: { stroke: "#3b82f6", strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#3b82f6",
    width: 16,
    height: 16,
  },
};

export function CanvasEditor() {
  const { nodes, edges, onNodesChange, onEdgesChange, addChatNode } =
    useCanvasStore();
  const { screenToFlowPosition } = useReactFlow();

  const isValidConnection = useCallback(
    (connection: Connection | { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => {
      // No self-connections
      if (connection.source === connection.target) return false;
      // Must go from a source (output/orange) handle to a target (input/blue) handle
      const fromSource = connection.sourceHandle?.startsWith("source-");
      const toTarget = connection.targetHandle?.startsWith("target-");
      return !!fromSource && !!toTarget;
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;

      // Prevent duplicate connections (same source node → same target node)
      const exists = useCanvasStore
        .getState()
        .edges.some(
          (e) =>
            e.source === connection.source && e.target === connection.target
        );
      if (exists) return;

      useCanvasStore.setState((state) => ({
        edges: [
          ...state.edges,
          {
            id: `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
            source: connection.source!,
            sourceHandle: connection.sourceHandle,
            target: connection.target!,
            targetHandle: connection.targetHandle,
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#3b82f6",
              width: 16,
              height: 16,
            },
            data: { direction: "one_way" as const },
          },
        ],
      }));
    },
    [isValidConnection]
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

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onDoubleClick={onDoubleClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <Controls className="!bg-card !border-border !shadow-md" />
        <MiniMap
          className="!bg-card !border-border"
          nodeColor="var(--primary)"
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>

      {/* Canvas overlay: project info + controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        <ProjectHeader />
        <div className="flex gap-2">
          <button
            onClick={() => addChatNode({ x: 100, y: 100 }, AVAILABLE_MODELS[0])}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-md"
          >
            + Add Chat Node
          </button>
        </div>
      </div>
    </div>
  );
}
