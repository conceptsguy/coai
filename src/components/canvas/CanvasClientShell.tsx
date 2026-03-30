"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { YjsProvider, useYjs } from "@/lib/yjs/provider";
import { useCollaborators } from "@/lib/yjs/awareness";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { TopBar } from "@/components/canvas/TopBar";
import { ChatListPanel } from "@/components/canvas/ChatListPanel";
import { BottomInput } from "@/components/canvas/BottomInput";

interface CanvasClientShellProps {
  projectId: string;
  userId: string;
  userEmail: string;
  role: "owner" | "editor";
}

function CanvasInner({ userId, userEmail, role, projectId }: { userId: string; userEmail: string; role: "owner" | "editor"; projectId: string }) {
  const { doc, awareness, synced, connected } = useYjs();
  const hydrated = useCanvasStore((s) => s.hydrated);
  const leftPanelOpen = useCanvasStore((s) => s.leftPanelOpen);
  const sidebarOpen = useCanvasStore((s) => s.sidebarOpen);
  const collaborators = useCollaborators(awareness);

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
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar connected={connected} collaborators={collaborators} role={role} projectId={projectId} />
      <div className="flex-1 flex overflow-hidden relative">
        <ReactFlowProvider>
          {leftPanelOpen && <ChatListPanel />}
          <div className="flex-1 relative">
            <CanvasEditor collaborators={collaborators} userId={userId} userEmail={userEmail} />
            {!sidebarOpen && <BottomInput />}
          </div>
          <ChatSidebar />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export function CanvasClientShell({ projectId, userId, userEmail, role }: CanvasClientShellProps) {
  return (
    <YjsProvider projectId={projectId}>
      <CanvasInner userId={userId} userEmail={userEmail} role={role} projectId={projectId} />
    </YjsProvider>
  );
}
