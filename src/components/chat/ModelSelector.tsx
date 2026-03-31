"use client";

import { useCanvasStore } from "@/lib/store/canvas-store";
import { AVAILABLE_MODELS, type ModelConfig } from "@/types/canvas";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface ModelSelectorProps {
  nodeId: string;
}

export function ModelSelector({ nodeId }: ModelSelectorProps) {
  const { nodes } = useCanvasStore();
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || node.type !== "chat") return null;

  const setModel = (model: ModelConfig) => {
    useCanvasStore.setState((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId && n.type === "chat"
          ? { ...n, data: { ...n.data, modelConfig: model } }
          : n
      ) as typeof state.nodes,
    }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
        {node.data.modelConfig.label}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" sideOffset={4}>
        <DropdownMenuRadioGroup
          value={node.data.modelConfig.modelId}
          onValueChange={(value) => {
            const model = AVAILABLE_MODELS.find((m) => m.modelId === value);
            if (model) setModel(model);
          }}
        >
          {AVAILABLE_MODELS.map((model) => (
            <DropdownMenuRadioItem key={model.modelId} value={model.modelId}>
              {model.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
