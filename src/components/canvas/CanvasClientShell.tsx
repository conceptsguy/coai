"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { YjsProvider, useYjs } from "@/lib/yjs/provider";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

interface CanvasClientShellProps {
  projectId: string;
}

function CanvasInner() {
  const { doc, synced } = useYjs();
  const hydrated = useCanvasStore((s) => s.hydrated);

  // Bind the Yjs doc to the store so actions can write to it
  useEffect(() => {
    useCanvasStore.getState().setYjsDoc(doc);
    return () => {
      useCanvasStore.getState().setYjsDoc(null);
    };
  }, [doc]);

  if (!hydrated || !synced) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Syncing canvas...</p>
        </div>
      </div>
    );
  }

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

export function CanvasClientShell({ projectId }: CanvasClientShellProps) {
  return (
    <YjsProvider projectId={projectId}>
      <CanvasInner />
    </YjsProvider>
  );
}
