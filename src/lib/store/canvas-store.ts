import { create } from "zustand";
import {
  AVAILABLE_MODELS,
  type ChatFlowNode,
  type ConnectionEdge,
  type ModelConfig,
  type ChatMessage,
  type ConnectedContext,
  type ProjectMetadata,
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
} from "@/lib/yjs/bridge";

interface CanvasState {
  // ── Synced state (projected from Yjs observers) ──
  nodes: ChatFlowNode[];
  edges: ConnectionEdge[];
  project: ProjectMetadata;
  projectId: string | null;
  hydrated: boolean;

  // ── Local-only state (not synced) ──
  selectedNodeId: string | null;
  sidebarOpen: boolean;
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
  onNodesChange: (changes: NodeChange<ChatFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ConnectionEdge>[]) => void;

  // ── Project metadata ──
  updateProjectTitle: (title: string) => void;
  updateProjectPurpose: (purpose: string) => void;

  // ── Sidebar ──
  sidebarExpanded: boolean;
  openSidebar: (nodeId: string) => void;
  closeSidebar: () => void;
  toggleSidebarExpanded: () => void;

  // ── Left panel ──
  toggleLeftPanel: () => void;

  // ── Bottom input → new chat ──
  setPendingFirstMessage: (message: string | null) => void;
  setScreenToFlowPosition: (fn: ((point: { x: number; y: number }) => { x: number; y: number }) | null) => void;
  createChatFromInput: (message: string) => string;
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

  // ── Local-only state ──
  selectedNodeId: null,
  sidebarOpen: false,
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

  removeNode: (nodeId) => {
    const doc = get()._yjsDoc;
    if (doc) yjsRemoveNode(doc, nodeId);

    // Also update local-only state
    set((state) => ({
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      sidebarOpen: state.selectedNodeId === nodeId ? false : state.sidebarOpen,
    }));
  },

  toggleNodeCollapsed: (nodeId) => {
    // This is a minor UI preference — keep local for now
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
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
    // Local-only: streaming chunks stay in Zustand, not Yjs
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
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

  getConnectedContexts: (nodeId) => {
    const { edges, nodes } = get();
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const contexts: ConnectedContext[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode && sourceNode.data.summary) {
        contexts.push({
          sourceNodeId: sourceNode.id,
          sourceTitle: sourceNode.data.title,
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
      nodes: applyNodeChanges(changes, state.nodes) as ChatFlowNode[],
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
    set({ selectedNodeId: nodeId, sidebarOpen: true });
  },

  closeSidebar: () => {
    set({ sidebarOpen: false, sidebarExpanded: false });
  },

  toggleSidebarExpanded: () => {
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded }));
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
}));
