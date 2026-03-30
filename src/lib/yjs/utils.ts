import * as Y from "yjs";
import type {
  ChatFlowNode,
  ConnectionEdge,
  ChatMessage,
  ChatNodeData,
  ModelConfig,
  ConnectionEdgeData,
} from "@/types/canvas";
import { MarkerType } from "@xyflow/react";

// ─── Node conversions ───

export function nodeToYMap(node: ChatFlowNode): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("id", node.id);
  m.set("positionX", node.position.x);
  m.set("positionY", node.position.y);
  m.set("title", node.data.title);
  m.set("modelProvider", node.data.modelConfig.provider);
  m.set("modelId", node.data.modelConfig.modelId);
  m.set("modelLabel", node.data.modelConfig.label);
  m.set("isCollapsed", node.data.isCollapsed);
  m.set("summary", node.data.summary);
  m.set("summaryMessageCount", node.data.summaryMessageCount);
  m.set("lastMessagePreview", node.data.lastMessagePreview);
  m.set("createdAt", node.data.createdAt);
  m.set("createdBy", node.data.createdBy);
  m.set("createdByName", node.data.createdByName);
  return m;
}

export function yMapToNode(
  m: Y.Map<unknown>,
  messages: ChatMessage[]
): ChatFlowNode {
  const lastAssistant = [...messages]
    .reverse()
    .find((msg) => msg.role === "assistant");

  return {
    id: m.get("id") as string,
    type: "chat",
    position: {
      x: m.get("positionX") as number,
      y: m.get("positionY") as number,
    },
    data: {
      type: "chat",
      title: (m.get("title") as string) ?? "Untitled",
      modelConfig: {
        provider: m.get("modelProvider") as ModelConfig["provider"],
        modelId: (m.get("modelId") as string) ?? "",
        label: (m.get("modelLabel") as string) ?? "",
      },
      messages,
      lastMessagePreview:
        (m.get("lastMessagePreview") as string) ??
        (lastAssistant ? lastAssistant.content.slice(0, 100) : ""),
      isCollapsed: (m.get("isCollapsed") as boolean) ?? true,
      summary: (m.get("summary") as string) ?? "",
      summaryMessageCount: (m.get("summaryMessageCount") as number) ?? 0,
      createdAt: (m.get("createdAt") as string) ?? "",
      createdBy: (m.get("createdBy") as string) ?? "",
      createdByName: (m.get("createdByName") as string) ?? "",
    } satisfies ChatNodeData,
  };
}

// ─── Edge conversions ───

const EDGE_STYLE = { stroke: "#3b82f6", strokeWidth: 2 };
const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "#3b82f6",
  width: 16,
  height: 16,
};

export function edgeToYMap(edge: ConnectionEdge): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("id", edge.id);
  m.set("source", edge.source);
  m.set("sourceHandle", edge.sourceHandle ?? null);
  m.set("target", edge.target);
  m.set("targetHandle", edge.targetHandle ?? null);
  return m;
}

export function yMapToEdge(m: Y.Map<unknown>): ConnectionEdge {
  return {
    id: m.get("id") as string,
    source: m.get("source") as string,
    sourceHandle: m.get("sourceHandle") as string | undefined,
    target: m.get("target") as string,
    targetHandle: m.get("targetHandle") as string | undefined,
    animated: true,
    style: EDGE_STYLE,
    markerEnd: EDGE_MARKER,
    data: { direction: "one_way" } satisfies ConnectionEdgeData,
  };
}

// ─── Message conversions ───

export function messageToYMap(msg: ChatMessage): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("id", msg.id);
  m.set("role", msg.role);
  m.set("content", msg.content);
  m.set("createdAt", msg.createdAt);
  return m;
}

export function yMapToMessage(m: Y.Map<unknown>): ChatMessage {
  return {
    id: m.get("id") as string,
    role: m.get("role") as ChatMessage["role"],
    content: (m.get("content") as string) ?? "",
    createdAt: (m.get("createdAt") as string) ?? "",
  };
}
