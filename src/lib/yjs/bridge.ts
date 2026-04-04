import * as Y from "yjs";
import { v4 as uuid } from "uuid";
import type {
  ChatFlowNode,
  FileFlowNode,
  CanvasNode,
  ConnectionEdge,
  ChatMessage,
  FileNodeData,
  ModelConfig,
  ProjectMetadata,
  ProjectMode,
  SharedContextDoc,
  ThreadMeta,
  ContextUpdate,
} from "@/types/canvas";
import { useCanvasStore } from "@/lib/store/canvas-store";
import {
  getNodesMap,
  getEdgesMap,
  getMessagesMap,
  getNodeMessages,
  getProjectMap,
  getSharedContextMap,
  getThreadsMap,
  getContextUpdatesMap,
  getProjectMode,
} from "./doc";
import {
  nodeToYMap,
  yMapToNode,
  fileNodeToYMap,
  yMapToFileNode,
  getNodeType,
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

export function yjsAddFileNode(
  doc: Y.Doc,
  position: { x: number; y: number },
  fileData: Omit<FileNodeData, "type">,
  nodeId?: string
): string {
  const id = nodeId ?? uuid();
  const node: FileFlowNode = {
    id,
    type: "file",
    position,
    data: {
      type: "file" as const,
      ...fileData,
    } as FileNodeData,
  };

  doc.transact(() => {
    getNodesMap(doc).set(id, fileNodeToYMap(node));
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

export function yjsUpdateFileContentPreview(doc: Y.Doc, nodeId: string, preview: string) {
  const nodeMap = getNodesMap(doc).get(nodeId) as Y.Map<unknown> | undefined;
  if (nodeMap) {
    nodeMap.set("contentPreview", preview);
  }
}

export function yjsUpdateEdgeLabel(doc: Y.Doc, edgeId: string, label: string) {
  const edgeMap = getEdgesMap(doc).get(edgeId) as Y.Map<unknown> | undefined;
  if (edgeMap) {
    edgeMap.set("label", label);
  }
}

// ─────────────────────────────────────────────
// Shared Cognitive Workspace write-side actions
// ─────────────────────────────────────────────

export function yjsSetProjectMode(doc: Y.Doc, mode: ProjectMode) {
  getProjectMap(doc).set("mode", mode);
}

/**
 * Replaces the entire shared context document in Yjs atomically.
 * Scalar fields stored as plain strings; array fields as JSON strings.
 */
export function yjsSetSharedContext(doc: Y.Doc, context: SharedContextDoc) {
  const m = getSharedContextMap(doc);
  doc.transact(() => {
    m.set("mode", context.mode);
    m.set("problemStatement", context.problemStatement);
    m.set("constraintsAndGoals", JSON.stringify(context.constraintsAndGoals));
    m.set("workstreams", JSON.stringify(context.workstreams));
    m.set("emergingThemes", JSON.stringify(context.emergingThemes));
    m.set("keyInsights", JSON.stringify(context.keyInsights));
    m.set("tensionsAndOpenQuestions", JSON.stringify(context.tensionsAndOpenQuestions));
    m.set("decisionsMade", JSON.stringify(context.decisionsMade));
    m.set("convergenceSummary", context.convergenceSummary ?? "");
  });
}

/**
 * Updates a single section of the shared context document.
 * For array fields, `value` must already be a JSON string.
 * For scalar fields, `value` is the plain string.
 */
export function yjsUpdateSharedContextSection(
  doc: Y.Doc,
  section: keyof SharedContextDoc,
  value: string
) {
  getSharedContextMap(doc).set(section as string, value);
}

/**
 * Upserts thread metadata for a given node (keyed by topicNodeId).
 */
export function yjsSetThreadMeta(doc: Y.Doc, meta: ThreadMeta) {
  const threadsMap = getThreadsMap(doc);
  let m = threadsMap.get(meta.topicNodeId);
  if (!m) {
    m = new Y.Map<unknown>();
    threadsMap.set(meta.topicNodeId, m);
  }
  doc.transact(() => {
    m!.set("id", meta.id);
    m!.set("topicNodeId", meta.topicNodeId);
    m!.set("ownerId", meta.ownerId);
    m!.set("participants", JSON.stringify(meta.participants));
    m!.set("modelProvider", meta.modelConfig.provider);
    m!.set("modelId", meta.modelConfig.modelId);
    m!.set("modelLabel", meta.modelConfig.label);
    m!.set("focusMode", meta.focusMode);
    m!.set("status", meta.status);
    m!.set("lastActivity", meta.lastActivity);
  });
}

/**
 * Adds a proposed context update to the pending updates map.
 * Propagates to all collaborators in real-time via PartyKit.
 */
export function yjsAddContextUpdateProposal(doc: Y.Doc, update: ContextUpdate) {
  const updatesMap = getContextUpdatesMap(doc);
  const m = new Y.Map<unknown>();
  doc.transact(() => {
    m.set("id", update.id);
    m.set("projectId", update.projectId);
    m.set("proposedByThreadId", update.proposedByThreadId ?? "");
    m.set("proposedByNodeId", update.proposedByNodeId ?? "");
    m.set("proposedByUserId", update.proposedByUserId);
    m.set("targetSection", update.targetSection as string);
    m.set("content", update.content);
    m.set("rationale", update.rationale);
    m.set("status", update.status);
    m.set("timestamp", update.timestamp);
    updatesMap.set(update.id, m);
  });
}

/**
 * Removes a context update from the pending map (after accept or reject).
 */
export function yjsRemoveContextUpdateProposal(doc: Y.Doc, updateId: string) {
  getContextUpdatesMap(doc).delete(updateId);
}

// ─────────────────────────────────────────────
// Read side: observers that project Yjs → Zustand
// ─────────────────────────────────────────────

function buildNodesArray(doc: Y.Doc): CanvasNode[] {
  const nodesMap = getNodesMap(doc);
  const messagesMap = getMessagesMap(doc);
  const nodes: CanvasNode[] = [];

  nodesMap.forEach((nodeYMap, nodeId) => {
    if (getNodeType(nodeYMap) === "file") {
      nodes.push(yMapToFileNode(nodeYMap));
    } else {
      const msgArr = messagesMap.get(nodeId);
      const messages: ChatMessage[] = [];
      if (msgArr) {
        for (let i = 0; i < msgArr.length; i++) {
          messages.push(yMapToMessage(msgArr.get(i)));
        }
      }
      nodes.push(yMapToNode(nodeYMap, messages));
    }
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

function buildSharedContext(doc: Y.Doc): SharedContextDoc | null {
  const m = getSharedContextMap(doc);
  if (m.size === 0) return null;

  function parseJsonField<T>(key: string, fallback: T): T {
    const raw = m.get(key) as string | undefined;
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  return {
    mode: "ideation",
    problemStatement: (m.get("problemStatement") as string) ?? "",
    constraintsAndGoals: parseJsonField("constraintsAndGoals", []),
    workstreams: parseJsonField("workstreams", []),
    emergingThemes: parseJsonField("emergingThemes", []),
    keyInsights: parseJsonField("keyInsights", []),
    tensionsAndOpenQuestions: parseJsonField("tensionsAndOpenQuestions", []),
    decisionsMade: parseJsonField("decisionsMade", []),
    convergenceSummary: (m.get("convergenceSummary") as string) || undefined,
  };
}

function buildContextUpdateProposals(doc: Y.Doc): ContextUpdate[] {
  const updatesMap = getContextUpdatesMap(doc);
  const updates: ContextUpdate[] = [];
  updatesMap.forEach((m) => {
    updates.push({
      id: m.get("id") as string,
      projectId: m.get("projectId") as string,
      proposedByThreadId: (m.get("proposedByThreadId") as string) || null,
      proposedByNodeId: (m.get("proposedByNodeId") as string) || null,
      proposedByUserId: m.get("proposedByUserId") as string,
      targetSection: m.get("targetSection") as keyof SharedContextDoc,
      content: m.get("content") as string,
      rationale: m.get("rationale") as string,
      status: m.get("status") as ContextUpdate["status"],
      timestamp: m.get("timestamp") as string,
    });
  });
  return updates;
}

function syncToZustand(doc: Y.Doc) {
  const nodes = buildNodesArray(doc);
  const edges = buildEdgesArray(doc);
  const project = buildProject(doc);
  const sharedContext = buildSharedContext(doc);
  const pendingContextUpdates = buildContextUpdateProposals(doc);
  const projectMode = getProjectMode(doc);

  const state = useCanvasStore.getState();

  // Preserve local-only streaming state: if a node is actively streaming
  // (has an assistant message not yet committed to Yjs), keep the local version
  // so the Yjs observer doesn't wipe in-progress streaming content.
  if (state._streamingNodeId) {
    const localNode = state.nodes.find((n) => n.id === state._streamingNodeId);
    if (localNode && localNode.type === "chat") {
      const idx = nodes.findIndex((n) => n.id === state._streamingNodeId);
      const yjsNode = idx >= 0 ? nodes[idx] : null;
      if (idx >= 0 && yjsNode && yjsNode.type === "chat") {
        nodes[idx] = {
          ...yjsNode,
          data: {
            ...yjsNode.data,
            messages: localNode.data.messages,
            lastMessagePreview: localNode.data.lastMessagePreview,
          },
        };
      }
    }
  }

  useCanvasStore.setState({ nodes, edges, project, sharedContext, pendingContextUpdates, projectMode });
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
  const sharedContextMap = getSharedContextMap(doc);
  const contextUpdatesMap = getContextUpdatesMap(doc);
  const threadsMap = getThreadsMap(doc);

  const handler = () => syncToZustand(doc);

  // Observe top-level map changes
  nodesMap.observeDeep(handler);
  edgesMap.observeDeep(handler);
  messagesMap.observeDeep(handler);
  projectMap.observeDeep(handler);
  sharedContextMap.observeDeep(handler);
  contextUpdatesMap.observeDeep(handler);
  threadsMap.observeDeep(handler);

  // Initial sync
  syncToZustand(doc);

  return () => {
    nodesMap.unobserveDeep(handler);
    edgesMap.unobserveDeep(handler);
    messagesMap.unobserveDeep(handler);
    projectMap.unobserveDeep(handler);
    sharedContextMap.unobserveDeep(handler);
    contextUpdatesMap.unobserveDeep(handler);
    threadsMap.unobserveDeep(handler);
  };
}
