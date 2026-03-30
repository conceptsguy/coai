import * as Y from "yjs";
import { v4 as uuid } from "uuid";
import type {
  ChatFlowNode,
  ConnectionEdge,
  ChatMessage,
  ModelConfig,
  ProjectMetadata,
} from "@/types/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";
import {
  getNodesMap,
  getEdgesMap,
  getMessagesMap,
  getNodeMessages,
  getProjectMap,
} from "./doc";
import {
  nodeToYMap,
  yMapToNode,
  edgeToYMap,
  yMapToEdge,
  messageToYMap,
  yMapToMessage,
} from "./utils";

// ─────────────────────────────────────────────
// Write side: actions that mutate the Yjs doc
// ─────────────────────────────────────────────

export function yjsAddNode(
  doc: Y.Doc,
  position: { x: number; y: number },
  modelConfig: ModelConfig,
  creator?: { userId: string; displayName: string }
): string {
  const id = uuid();
  const node: ChatFlowNode = {
    id,
    type: "chat",
    position,
    data: {
      type: "chat",
      title: `Chat ${getNodesMap(doc).size + 1}`,
      modelConfig,
      messages: [],
      lastMessagePreview: "",
      isCollapsed: true,
      summary: "",
      summaryMessageCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: creator?.userId ?? "",
      createdByName: creator?.displayName ?? "",
    },
  };

  doc.transact(() => {
    getNodesMap(doc).set(id, nodeToYMap(node));
    // Initialize empty messages array for this node
    getNodeMessages(doc, id);
  });

  return id;
}

export function yjsRemoveNode(doc: Y.Doc, nodeId: string) {
  doc.transact(() => {
    getNodesMap(doc).delete(nodeId);
    getMessagesMap(doc).delete(nodeId);

    // Remove edges connected to this node
    const edgesMap = getEdgesMap(doc);
    const toDelete: string[] = [];
    edgesMap.forEach((edgeYMap, edgeId) => {
      if (
        edgeYMap.get("source") === nodeId ||
        edgeYMap.get("target") === nodeId
      ) {
        toDelete.push(edgeId);
      }
    });
    toDelete.forEach((id) => edgesMap.delete(id));
  });
}

export function yjsUpdateNodePosition(
  doc: Y.Doc,
  nodeId: string,
  x: number,
  y: number
) {
  const nodeYMap = getNodesMap(doc).get(nodeId);
  if (!nodeYMap) return;
  doc.transact(() => {
    nodeYMap.set("positionX", x);
    nodeYMap.set("positionY", y);
  });
}

export function yjsUpdateNodeTitle(
  doc: Y.Doc,
  nodeId: string,
  title: string
) {
  const nodeYMap = getNodesMap(doc).get(nodeId);
  if (!nodeYMap) return;
  nodeYMap.set("title", title);
}

export function yjsUpdateNodeModel(
  doc: Y.Doc,
  nodeId: string,
  modelConfig: ModelConfig
) {
  const nodeYMap = getNodesMap(doc).get(nodeId);
  if (!nodeYMap) return;
  doc.transact(() => {
    nodeYMap.set("modelProvider", modelConfig.provider);
    nodeYMap.set("modelId", modelConfig.modelId);
    nodeYMap.set("modelLabel", modelConfig.label);
  });
}

export function yjsUpdateNodeSummary(
  doc: Y.Doc,
  nodeId: string,
  summary: string
) {
  const nodeYMap = getNodesMap(doc).get(nodeId);
  if (!nodeYMap) return;
  const messageCount = getNodeMessages(doc, nodeId).length;
  doc.transact(() => {
    nodeYMap.set("summary", summary);
    nodeYMap.set("summaryMessageCount", messageCount);
  });
}

export function yjsAddMessage(
  doc: Y.Doc,
  nodeId: string,
  message: ChatMessage
) {
  const arr = getNodeMessages(doc, nodeId);
  const nodeYMap = getNodesMap(doc).get(nodeId);
  doc.transact(() => {
    arr.push([messageToYMap(message)]);
    if (nodeYMap && message.role === "assistant") {
      nodeYMap.set("lastMessagePreview", message.content.slice(0, 100));
    }
  });
}

export function yjsAddEdge(
  doc: Y.Doc,
  edge: ConnectionEdge
) {
  getEdgesMap(doc).set(edge.id, edgeToYMap(edge));
}

export function yjsRemoveEdge(doc: Y.Doc, edgeId: string) {
  getEdgesMap(doc).delete(edgeId);
}

export function yjsUpdateProjectTitle(doc: Y.Doc, title: string) {
  getProjectMap(doc).set("title", title);
}

export function yjsUpdateProjectPurpose(doc: Y.Doc, purpose: string) {
  getProjectMap(doc).set("purpose", purpose);
}

// ─────────────────────────────────────────────
// Read side: observers that project Yjs → Zustand
// ─────────────────────────────────────────────

function buildNodesArray(doc: Y.Doc): ChatFlowNode[] {
  const nodesMap = getNodesMap(doc);
  const messagesMap = getMessagesMap(doc);
  const nodes: ChatFlowNode[] = [];

  nodesMap.forEach((nodeYMap, nodeId) => {
    const msgArr = messagesMap.get(nodeId);
    const messages: ChatMessage[] = [];
    if (msgArr) {
      for (let i = 0; i < msgArr.length; i++) {
        messages.push(yMapToMessage(msgArr.get(i)));
      }
    }
    nodes.push(yMapToNode(nodeYMap, messages));
  });

  return nodes;
}

function buildEdgesArray(doc: Y.Doc): ConnectionEdge[] {
  const edgesMap = getEdgesMap(doc);
  const edges: ConnectionEdge[] = [];
  edgesMap.forEach((edgeYMap) => {
    edges.push(yMapToEdge(edgeYMap));
  });
  return edges;
}

function buildProject(doc: Y.Doc): ProjectMetadata {
  const pm = getProjectMap(doc);
  return {
    title: (pm.get("title") as string) ?? "Untitled Project",
    purpose: (pm.get("purpose") as string) ?? "",
  };
}

function syncToZustand(doc: Y.Doc) {
  const nodes = buildNodesArray(doc);
  const edges = buildEdgesArray(doc);
  const project = buildProject(doc);

  const state = useCanvasStore.getState();

  // Preserve local-only streaming state: if a node is actively streaming
  // (has an assistant message not yet committed to Yjs), keep the local version
  // so the Yjs observer doesn't wipe in-progress streaming content.
  if (state._streamingNodeId) {
    const localNode = state.nodes.find((n) => n.id === state._streamingNodeId);
    if (localNode) {
      const idx = nodes.findIndex((n) => n.id === state._streamingNodeId);
      if (idx >= 0) {
        nodes[idx] = {
          ...nodes[idx],
          data: {
            ...nodes[idx].data,
            messages: localNode.data.messages,
            lastMessagePreview: localNode.data.lastMessagePreview,
          },
        };
      }
    }
  }

  useCanvasStore.setState({ nodes, edges, project });
}

/**
 * Start observing the Yjs doc and projecting changes into Zustand.
 * Returns a cleanup function to detach all observers.
 */
export function observeYjsDoc(doc: Y.Doc): () => void {
  const nodesMap = getNodesMap(doc);
  const edgesMap = getEdgesMap(doc);
  const messagesMap = getMessagesMap(doc);
  const projectMap = getProjectMap(doc);

  const handler = () => syncToZustand(doc);

  // Observe top-level map changes
  nodesMap.observeDeep(handler);
  edgesMap.observeDeep(handler);
  messagesMap.observeDeep(handler);
  projectMap.observeDeep(handler);

  // Initial sync
  syncToZustand(doc);

  return () => {
    nodesMap.unobserveDeep(handler);
    edgesMap.unobserveDeep(handler);
    messagesMap.unobserveDeep(handler);
    projectMap.unobserveDeep(handler);
  };
}
