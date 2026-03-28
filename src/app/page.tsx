"use client";

import Link from "next/link";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/button";

export default function Home() {
  const newCanvasId = uuid();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight">Coai</h1>
        <p className="text-lg text-muted-foreground">
          Collaborative AI Canvas. Place chat nodes, connect ideas, think together.
        </p>
      </div>

      <Link href={`/canvas/${newCanvasId}`}>
        <Button size="lg" className="text-base px-8">
          New Canvas
        </Button>
      </Link>

      <div className="text-sm text-muted-foreground mt-8 space-y-1 text-center">
        <p>Double-click the canvas to add a chat node</p>
        <p>Drag between node handles to connect them</p>
        <p>Click &quot;Open Chat&quot; to start a conversation</p>
      </div>
    </div>
  );
}
