import type { Node, Edge } from "@xyflow/react";

export type ModelProvider = "anthropic" | "openai";

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  label: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  { provider: "anthropic", modelId: "claude-sonnet-4-20250514", label: "Claude Sonnet" },
  { provider: "anthropic", modelId: "claude-haiku-4-5-20251001", label: "Claude Haiku" },
  { provider: "openai", modelId: "gpt-4o", label: "GPT-4o" },
  { provider: "openai", modelId: "gpt-4o-mini", label: "GPT-4o Mini" },
];

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ChatNodeData extends Record<string, unknown> {
  type: "chat";
  title: string;
  modelConfig: ModelConfig;
  messages: ChatMessage[];
  lastMessagePreview: string;
  isCollapsed: boolean;
  /** Rolling summary of this chat, used as context for connected nodes */
  summary: string;
  /** When the summary was last updated (message count at time of update) */
  summaryMessageCount: number;
}

export type ChatFlowNode = Node<ChatNodeData, "chat">;

/** Context summary sent to a chat from a connected source node */
export interface ConnectedContext {
  sourceNodeId: string;
  sourceTitle: string;
  summary: string;
}

export interface ConnectionEdgeData extends Record<string, unknown> {
  direction: "one_way";
}

export type ConnectionEdge = Edge<ConnectionEdgeData>;

export interface ProjectMetadata {
  title: string;
  purpose: string;
}
