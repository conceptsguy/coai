import { create } from "zustand";
import {
  AVAILABLE_MODELS,
  type ChatFlowNode,
  type FileFlowNode,
  type CanvasNode,
  type FileNodeData,
  type ConnectionEdge,
  type ModelConfig,
  type ChatMessage,
  type ConnectedContext,
  type ProjectMetadata,
  type SidebarMode,
  type SourceDetail,
  type ProjectMode,
  type SharedContextDoc,
  type ContextUpdate,
} from "@/types/canvas";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import * as Y from "yjs";
import {
  yjsAddNode,
  yjsAddFileNode,
  yjsRemoveNode,
  yjsUpdateNodePosition,
  yjsUpdateNodeTitle,
  yjsUpdateNodeModel,
  yjsUpdateNodeSummary,
  yjsAddMessage,
  yjsAddEdge,
  yjsRemoveEdge,
  yjsUpdateProjectTitle,
  yjsUpdateProjectPurpose,
  yjsUpdateFileContentPreview,
  yjsUpdateEdgeLabel,
  yjsSetProjectMode,
  yjsSetSharedContext,
  yjsUpdateSharedContextSection,
  yjsAddContextUpdateProposal,
  yjsRemoveContextUpdateProposal,
} from "@/lib/yjs/bridge";
import {
  syncDeleteNode,
  syncDeleteFileNode,
  syncDeleteEdge,
  syncInsertEdge,
} from "@/lib/supabase/sync";

interface CanvasState {
  // ── Synced state (projected from Yjs observers) ──
  nodes: CanvasNode[];
  edges: ConnectionEdge[];
  project: ProjectMetadata;
  projectId: string | null;
  hydrated: boolean;

  // ── Local-only state (not synced) ──
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  sidebarOpen: boolean;
  sidebarMode: SidebarMode;
  leftPanelOpen: boolean;
  /** Yjs doc reference — set by the provider */
  _yjsDoc: Y.Doc | null;
  /** Node currently receiving streaming AI response (local-only) */
  _streamingNodeId: string | null;
  /** Pending first message from bottom input — picked up by ChatSidebar */
  _pendingFirstMessage: string | null;
  /** Registered by CanvasEditor so other components can compute flow positions */
  _screenToFlowPosition: ((point: { x: number; y: number }) => { x: number; y: number }) | null;
  /** Current user info for stamping node ownership */
  _currentUserId: string;
  _currentUserName: string;

  // ── Yjs doc binding ──
  setYjsDoc: (doc: Y.Doc | null) => void;
  setCurrentUser: (userId: string, displayName: string) => void;

  // ── Node actions (write to Yjs) ──
  addChatNode: (position: { x: number; y: number }, modelConfig: ModelConfig) => string;
  addFileNode: (position: { x: number; y: number }, fileData: Omit<FileNodeData, "type">, nodeId?: string) => string;
  removeNode: (nodeId: string) => void;
  toggleNodeCollapsed: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeTitle: (nodeId: string, title: string) => void;
  updateNodeModel: (nodeId: string, modelConfig: ModelConfig) => void;

  // ── Message actions ──
  addMessage: (nodeId: string, message: ChatMessage) => void;
  /** Local-only streaming update — NOT synced to Yjs */
  updateLastAssistantMessage: (nodeId: string, content: string) => void;
  /** Call when streaming starts/ends to protect local state from Yjs overwrites */
  setStreamingNodeId: (nodeId: string | null) => void;

  // ── Summary actions ──
  updateNodeSummary: (nodeId: string, summary: string) => void;

  // ── Connection context (computed reads) ──
  getConnectedContexts: (nodeId: string) => ConnectedContext[];
  getIncomingSourceCount: (nodeId: string) => number;

  // ── React Flow callbacks ──
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ConnectionEdge>[]) => void;

  // ── Project metadata ──
  updateProjectTitle: (title: string) => void;
  updateProjectPurpose: (purpose: string) => void;

  // ── Sidebar ──
  sidebarExpanded: boolean;
  openSidebar: (nodeId: string) => void;
  closeSidebar: () => void;
  toggleSidebarExpanded: () => void;

  // ── File content ──
  updateFileContentPreview: (nodeId: string, preview: string) => void;

  // ── Edge selection ──
  selectEdge: (edgeId: string) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;
  getSourceDetail: (edgeId: string) => SourceDetail | null;
  removeEdge: (edgeId: string) => void;

  // ── Left panel ──
  toggleLeftPanel: () => void;

  // ── Bottom input → new chat ──
  setPendingFirstMessage: (message: string | null) => void;
  setScreenToFlowPosition: (fn: ((point: { x: number; y: number }) => { x: number; y: number }) | null) => void;
  createChatFromInput: (message: string) => string;

  // ── Shared cognitive workspace (projected from Yjs) ──
  projectMode: ProjectMode;
  sharedContext: SharedContextDoc | null;
  pendingContextUpdates: ContextUpdate[];

  // ── Workspace actions ──
  setProjectMode: (mode: ProjectMode) => void;
  setSharedContext: (context: SharedContextDoc) => void;
  updateSharedContextSection: (section: keyof SharedContextDoc, value: string) => void;
  addContextUpdateProposal: (update: ContextUpdate) => void;
  removeContextUpdateProposal: (updateId: string) => void;
}

// Debounce helper for position syncs to Yjs
let positionTimers: Record<string, ReturnType<typeof setTimeout>> = {};
function debouncedPositionSync(doc: Y.Doc, nodeId: string, x: number, y: number) {
  clearTimeout(positionTimers[nodeId]);
  positionTimers[nodeId] = setTimeout(() => {
    yjsUpdateNodePosition(doc, nodeId, x, y);
  }, 500);
}

let projectTitleTimer: ReturnType<typeof setTimeout>;
let projectPurposeTimer: ReturnType<typeof setTimeout>;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // ── Synced state (set by Yjs observers via bridge.ts) ──
  nodes: [],
  edges: [],
  project: { title: "Untitled Project", purpose: "" },
  projectId: null,
  hydrated: false,
  projectMode: "canvas" as ProjectMode,
  sharedContext: null,
  pendingContextUpdates: [],

  // ── Local-only state ──
  selectedNodeId: null,
  selectedEdgeId: null,
  sidebarOpen: false,
  sidebarMode: "chat" as SidebarMode,
  sidebarExpanded: false,
  leftPanelOpen: true,
  _yjsDoc: null,
  _streamingNodeId: null,
  _pendingFirstMessage: null,
  _screenToFlowPosition: null,
  _currentUserId: "",
  _currentUserName: "",

  setYjsDoc: (doc) => {
    set({ _yjsDoc: doc });
  },

  setCurrentUser: (userId, displayName) => {
    set({ _currentUserId: userId, _currentUserName: displayName });
  },

  addChatNode: (position, modelConfig) => {
    const { _yjsDoc: doc, _currentUserId, _currentUserName } = get();
    if (!doc) return "";
    return yjsAddNode(doc, position, modelConfig, {
      userId: _currentUserId,
      displayName: _currentUserName,
    });
  },

  addFileNode: (position, fileData, nodeId) => {
    const { _yjsDoc: doc } = get();
    if (!doc) return "";
    return yjsAddFileNode(doc, position, fileData, nodeId);
  },

  removeNode: (nodeId) => {
    const { _yjsDoc: doc, nodes, edges } = get();

    // Look up the node before deleting to determine type + storage path
    const node = nodes.find((n) => n.id === nodeId);

    if (doc) yjsRemoveNode(doc, nodeId);

    // Sync deletion to Supabase
    if (node?.type === "file") {
      syncDeleteFileNode(nodeId, node.data.storagePath);
    } else {
      syncDeleteNode(nodeId);
    }

    // Delete connected edges from Supabase
    const connectedEdges = edges.filter((e) => e.source === nodeId || e.target === nodeId);
    connectedEdges.forEach((e) => syncDeleteEdge(e.id));

    // Also update local-only state
    set((state) => ({
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      selectedEdgeId: null,
      sidebarOpen: state.selectedNodeId === nodeId ? false : state.sidebarOpen,
      sidebarMode: state.selectedNodeId === nodeId ? "chat" as SidebarMode : state.sidebarMode,
    }));
  },

  toggleNodeCollapsed: (nodeId) => {
    // This is a minor UI preference — keep local for now (chat nodes only)
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId && n.type === "chat"
          ? { ...n, data: { ...n.data, isCollapsed: !n.data.isCollapsed } }
          : n
      ),
    }));
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  updateNodeTitle: (nodeId, title) => {
    const doc = get()._yjsDoc;
    if (doc) yjsUpdateNodeTitle(doc, nodeId, title);
  },

  updateNodeModel: (nodeId, modelConfig) => {
    const doc = get()._yjsDoc;
    if (doc) yjsUpdateNodeModel(doc, nodeId, modelConfig);
  },

  addMessage: (nodeId, message) => {
    const doc = get()._yjsDoc;
    if (doc) yjsAddMessage(doc, nodeId, message);
  },

  updateLastAssistantMessage: (nodeId, content) => {
    // Local-only: streaming chunks stay in Zustand, not Yjs (chat nodes only)
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId || n.type !== "chat") return n;
        const messages = [...n.data.messages];
        const lastIdx = messages.length - 1;
        if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
          messages[lastIdx] = { ...messages[lastIdx], content };
        }
        return {
          ...n,
          data: {
            ...n.data,
            messages,
            lastMessagePreview: content.slice(0, 100),
          },
        };
      }),
    }));
  },

  setStreamingNodeId: (nodeId) => {
    set({ _streamingNodeId: nodeId });
  },

  updateNodeSummary: (nodeId, summary) => {
    const doc = get()._yjsDoc;
    if (doc) yjsUpdateNodeSummary(doc, nodeId, summary);
  },

  updateFileContentPreview: (nodeId, preview) => {
    const doc = get()._yjsDoc;
    if (doc) yjsUpdateFileContentPreview(doc, nodeId, preview);
  },

  getConnectedContexts: (nodeId) => {
    const { edges, nodes } = get();
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const contexts: ConnectedContext[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      if (sourceNode.type === "file") {
        // File nodes provide their content preview as context
        if (sourceNode.data.contentPreview) {
          contexts.push({
            sourceNodeId: sourceNode.id,
            sourceTitle: sourceNode.data.title,
            sourceType: "file",
            summary: sourceNode.data.contentPreview,
            fileContent: sourceNode.data.contentPreview,
          });
        }
      } else if (sourceNode.data.summary) {
        contexts.push({
          sourceNodeId: sourceNode.id,
          sourceTitle: sourceNode.data.title,
          sourceType: "chat",
          summary: sourceNode.data.summary,
        });
      }
    }

    return contexts;
  },

  getIncomingSourceCount: (nodeId) => {
    return get().edges.filter((e) => e.target === nodeId).length;
  },

  onNodesChange: (changes) => {
    // Apply changes locally for immediate UI feedback (drag, select, etc.)
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as CanvasNode[],
    }));

    // Sync position changes to Yjs (debounced, on drag end)
    const doc = get()._yjsDoc;
    if (!doc) return;

    for (const change of changes) {
      if (
        change.type === "position" &&
        change.position &&
        !change.dragging
      ) {
        debouncedPositionSync(doc, change.id, change.position.x, change.position.y);
      }
    }
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as ConnectionEdge[],
    }));

    // Sync edge removals to Yjs
    const doc = get()._yjsDoc;
    if (!doc) return;

    for (const change of changes) {
      if (change.type === "remove") {
        yjsRemoveEdge(doc, change.id);
        syncDeleteEdge(change.id);
      }
    }
  },

  updateProjectTitle: (title) => {
    set((state) => ({ project: { ...state.project, title } }));

    const doc = get()._yjsDoc;
    if (doc) {
      clearTimeout(projectTitleTimer);
      projectTitleTimer = setTimeout(() => {
        yjsUpdateProjectTitle(doc, title);
      }, 2000);
    }
  },

  updateProjectPurpose: (purpose) => {
    set((state) => ({ project: { ...state.project, purpose } }));

    const doc = get()._yjsDoc;
    if (doc) {
      clearTimeout(projectPurposeTimer);
      projectPurposeTimer = setTimeout(() => {
        yjsUpdateProjectPurpose(doc, purpose);
      }, 2000);
    }
  },

  openSidebar: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    const mode: SidebarMode = node?.type === "file" ? "file-preview" : "chat";
    set({ selectedNodeId: nodeId, selectedEdgeId: null, sidebarMode: mode, sidebarOpen: true });
  },

  closeSidebar: () => {
    set({ sidebarOpen: false, sidebarExpanded: false, selectedEdgeId: null });
  },

  toggleSidebarExpanded: () => {
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded }));
  },

  selectEdge: (edgeId) => {
    set({
      selectedEdgeId: edgeId,
      selectedNodeId: null,
      sidebarMode: "source-detail" as SidebarMode,
      sidebarOpen: true,
    });
  },

  getSourceDetail: (edgeId) => {
    const { edges, nodes } = get();
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return null;
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;
    return {
      edgeId: edge.id,
      sourceNodeId: sourceNode.id,
      sourceTitle: sourceNode.data.title,
      targetNodeId: targetNode.id,
      targetTitle: targetNode.data.title,
      summary: sourceNode.type === "chat" ? (sourceNode.data.summary || "") : (sourceNode.data.contentPreview || ""),
      summaryMessageCount: sourceNode.type === "chat" ? sourceNode.data.summaryMessageCount : 0,
    };
  },

  removeEdge: (edgeId) => {
    const doc = get()._yjsDoc;
    if (doc) yjsRemoveEdge(doc, edgeId);
    syncDeleteEdge(edgeId);
    set((state) => ({
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      sidebarOpen: state.selectedEdgeId === edgeId ? false : state.sidebarOpen,
      sidebarMode: state.selectedEdgeId === edgeId ? "chat" as SidebarMode : state.sidebarMode,
    }));
  },

  updateEdgeLabel: (edgeId, label) => {
    const doc = get()._yjsDoc;
    if (doc) yjsUpdateEdgeLabel(doc, edgeId, label);
  },

  toggleLeftPanel: () => {
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen }));
  },

  setPendingFirstMessage: (message) => {
    set({ _pendingFirstMessage: message });
  },

  setScreenToFlowPosition: (fn) => {
    set({ _screenToFlowPosition: fn });
  },

  createChatFromInput: (message) => {
    const { _screenToFlowPosition, addChatNode } = get();
    // Place the new node at viewport center, or a default position
    let position = { x: 300, y: 300 };
    if (_screenToFlowPosition) {
      position = _screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }
    const nodeId = addChatNode(position, AVAILABLE_MODELS[0]);
    if (nodeId) {
      set({ selectedNodeId: nodeId, sidebarOpen: true, _pendingFirstMessage: message });
    }
    return nodeId;
  },

  setProjectMode: (mode) => {
    const doc = get()._yjsDoc;
    if (doc) yjsSetProjectMode(doc, mode);
  },

  setSharedContext: (context) => {
    const doc = get()._yjsDoc;
    if (doc) yjsSetSharedContext(doc, context);
  },

  updateSharedContextSection: (section, value) => {
    const doc = get()._yjsDoc;
    if (doc) yjsUpdateSharedContextSection(doc, section, value);
  },

  addContextUpdateProposal: (update) => {
    const doc = get()._yjsDoc;
    if (doc) yjsAddContextUpdateProposal(doc, update);
  },

  removeContextUpdateProposal: (updateId) => {
    const doc = get()._yjsDoc;
    if (doc) yjsRemoveContextUpdateProposal(doc, updateId);
  },
}));
