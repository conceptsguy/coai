"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomInput() {
  const [input, setInput] = useState("");
  const createChatFromInput = useCanvasStore((s) => s.createChatFromInput);

  const onSubmit = () => {
    const text = input.trim();
    if (!text) return;
    createChatFromInput(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[560px] max-w-[80%] z-10">
      <div className="bg-white dark:bg-card border border-border rounded-lg shadow-md">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start a new chat..."
            className="min-h-[48px] max-h-[120px] resize-none text-sm border-0 focus-visible:ring-0 pr-12 rounded-lg"
            rows={1}
          />
          <Button
            size="icon-xs"
            onClick={onSubmit}
            disabled={!input.trim()}
            className="absolute right-2 bottom-2 h-7 w-7 rounded-md"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="px-3 pb-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Enter to start a new chat
          </span>
        </div>
      </div>
    </div>
  );
}
