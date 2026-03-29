"use client";

import { useEffect, useRef } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import type { ChatFlowNode, ConnectionEdge, ProjectMetadata } from "@/types/canvas";

interface CanvasClientShellProps {
  projectId: string;
  project: ProjectMetadata;
  initialNodes: ChatFlowNode[];
  initialEdges: ConnectionEdge[];
}

export function CanvasClientShell({
  projectId,
  project,
  initialNodes,
  initialEdges,
}: CanvasClientShellProps) {
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      useCanvasStore.getState().hydrateFromServer({
        projectId,
        project,
        nodes: initialNodes,
        edges: initialEdges,
      });
      hydrated.current = true;
    }
  }, [projectId, project, initialNodes, initialEdges]);

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <ReactFlowProvider>
        <div className="flex-1 relative">
          <CanvasEditor />
        </div>
        <ChatSidebar />
      </ReactFlowProvider>
    </div>
  );
}
