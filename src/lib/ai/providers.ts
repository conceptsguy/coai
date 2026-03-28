import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { ModelProvider } from "@/types/canvas";

export function getModel(provider: ModelProvider, modelId: string) {
  switch (provider) {
    case "anthropic":
      return anthropic(modelId);
    case "openai":
      return openai(modelId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
