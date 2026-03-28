"use client";

import { useCanvasStore } from "@/lib/store/canvas-store";
import { AVAILABLE_MODELS, type ModelConfig } from "@/types/canvas";

interface ModelSelectorProps {
  nodeId: string;
}

export function ModelSelector({ nodeId }: ModelSelectorProps) {
  const { nodes } = useCanvasStore();
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const setModel = (model: ModelConfig) => {
    useCanvasStore.setState((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, modelConfig: model } } : n
      ),
    }));
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {AVAILABLE_MODELS.map((model) => (
        <button
          key={model.modelId}
          onClick={() => setModel(model)}
          className={`px-2 py-1 rounded text-xs border transition-colors ${
            node.data.modelConfig.modelId === model.modelId
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-muted"
          }`}
        >
          {model.label}
        </button>
      ))}
    </div>
  );
}
