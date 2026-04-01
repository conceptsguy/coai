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
  /** ISO timestamp when node was created */
  createdAt: string;
  /** Supabase user ID of creator */
  createdBy: string;
  /** Display name of creator (email prefix) */
  createdByName: string;
}

export type ChatFlowNode = Node<ChatNodeData, "chat">;

// ─── File nodes ───

export interface FileNodeData extends Record<string, unknown> {
  type: "file";
  title: string;
  fileName: string;
  /** MIME type (e.g. "text/markdown", "text/plain", "image/png") */
  fileType: string;
  /** File size in bytes */
  fileSize: number;
  /** Path in Supabase Storage bucket */
  storagePath: string;
  /** First ~200 chars of text content, for hover preview */
  contentPreview: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export type FileFlowNode = Node<FileNodeData, "file">;

/** Union of all canvas node types */
export type CanvasNode = ChatFlowNode | FileFlowNode;

/** Context summary sent to a chat from a connected source node */
export interface ConnectedContext {
  sourceNodeId: string;
  sourceTitle: string;
  sourceType: "chat" | "file";
  summary: string;
  /** Full text content for file nodes (up to 8K chars) */
  fileContent?: string;
}

export interface ConnectionEdgeData extends Record<string, unknown> {
  direction: "one_way";
  label?: string;
}

export type ConnectionEdge = Edge<ConnectionEdgeData>;

/** Which view the sidebar is displaying */
export type SidebarMode = "chat" | "source-detail" | "file-preview";

/** Resolved detail about a context source edge, for display in the sidebar */
export interface SourceDetail {
  edgeId: string;
  sourceNodeId: string;
  sourceTitle: string;
  targetNodeId: string;
  targetTitle: string;
  summary: string;
  summaryMessageCount: number;
}

export interface ProjectMetadata {
  title: string;
  purpose: string;
}

/** Yjs awareness state for a connected collaborator */
export interface CollaboratorState {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}
