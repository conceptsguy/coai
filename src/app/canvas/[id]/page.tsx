"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

export default function CanvasPage() {
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
