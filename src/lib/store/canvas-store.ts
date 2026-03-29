import { create } from "zustand";
import type {
  ChatFlowNode,
  ConnectionEdge,
  ModelConfig,
  ChatMessage,
  ConnectedContext,
  ProjectMetadata,
} from "@/types/canvas";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { v4 as uuid } from "uuid";
import {
  syncNodePosition,
  syncNodeTitle,
  syncNodeSummary,
  syncInsertNode,
  syncDeleteNode,
  syncInsertMessage,
  syncProjectTitle,
  syncProjectPurpose,
} from "@/lib/supabase/sync";

interface CanvasState {
  nodes: ChatFlowNode[];
  edges: ConnectionEdge[];
  selectedNodeId: string | null;
  sidebarOpen: boolean;
  project: ProjectMetadata;
  projectId: string | null;
  hydrated: boolean;

  // Hydration
  hydrateFromServer: (data: {
    projectId: string;
    project: ProjectMetadata;
    nodes: ChatFlowNode[];
    edges: ConnectionEdge[];
  }) => void;

  // Node actions
  addChatNode: (position: { x: number; y: number }, modelConfig: ModelConfig) => string;
  removeNode: (nodeId: string) => void;
  toggleNodeCollapsed: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeTitle: (nodeId: string, title: string) => void;

  // Message actions
  addMessage: (nodeId: string, message: ChatMessage) => void;
  updateLastAssistantMessage: (nodeId: string, content: string) => void;

  // Summary actions
  updateNodeSummary: (nodeId: string, summary: string) => void;

  // Connection context
  getConnectedContexts: (nodeId: string) => ConnectedContext[];
  getIncomingSourceCount: (nodeId: string) => number;

  // React Flow callbacks
  onNodesChange: (changes: NodeChange<ChatFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ConnectionEdge>[]) => void;

  // Project metadata
  updateProjectTitle: (title: string) => void;
  updateProjectPurpose: (purpose: string) => void;

  // Sidebar
  openSidebar: (nodeId: string) => void;
  closeSidebar: () => void;
}

// Debounce helper for position syncs
let positionTimers: Record<string, ReturnType<typeof setTimeout>> = {};
function debouncedPositionSync(nodeId: string, x: number, y: number) {
  clearTimeout(positionTimers[nodeId]);
  positionTimers[nodeId] = setTimeout(() => {
    syncNodePosition(nodeId, x, y);
  }, 500);
}

let projectTitleTimer: ReturnType<typeof setTimeout>;
let projectPurposeTimer: ReturnType<typeof setTimeout>;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  sidebarOpen: false,
  project: { title: "Untitled Project", purpose: "" },
  projectId: null,
  hydrated: false,

  hydrateFromServer: (data) => {
    set({
      projectId: data.projectId,
      project: data.project,
      nodes: data.nodes,
      edges: data.edges,
      hydrated: true,
    });
  },

  addChatNode: (position, modelConfig) => {
    const id = uuid();
    const newNode: ChatFlowNode = {
      id,
      type: "chat",
      position,
      data: {
        type: "chat",
        title: `Chat ${get().nodes.length + 1}`,
        modelConfig,
        messages: [],
        lastMessagePreview: "",
        isCollapsed: true,
        summary: "",
        summaryMessageCount: 0,
      },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));

    // Sync to DB
    const projectId = get().projectId;
    if (projectId) {
      syncInsertNode(
        projectId,
        id,
        newNode.data.title,
        modelConfig.provider,
        modelConfig.modelId,
        modelConfig.label,
        position.x,
        position.y
      );
    }

    return id;
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeId:
        state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      sidebarOpen:
        state.selectedNodeId === nodeId ? false : state.sidebarOpen,
    }));

    // Sync to DB (cascade deletes edges and messages)
    syncDeleteNode(nodeId);
  },

  toggleNodeCollapsed: (nodeId) => {
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
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, title } } : n
      ),
    }));

    // Sync to DB
    syncNodeTitle(nodeId, title);
  },

  addMessage: (nodeId, message) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                messages: [...n.data.messages, message],
                lastMessagePreview:
                  message.role === "assistant"
                    ? message.content.slice(0, 100)
                    : n.data.lastMessagePreview,
              },
            }
          : n
      ),
    }));

    // Sync to DB
    if (get().projectId) {
      syncInsertMessage(nodeId, message.id, message.role, message.content);
    }
  },

  updateLastAssistantMessage: (nodeId, content) => {
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
    // Note: we don't sync partial streaming updates — the final message
    // is synced via addMessage in the onFinish callback
  },

  updateNodeSummary: (nodeId, summary) => {
    const messageCount =
      get().nodes.find((n) => n.id === nodeId)?.data.messages.length ?? 0;
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                summary,
                summaryMessageCount: messageCount,
              },
            }
          : n
      ),
    }));

    // Sync to DB
    syncNodeSummary(nodeId, summary, messageCount);
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
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as ChatFlowNode[],
    }));

    // Sync position changes (debounced)
    for (const change of changes) {
      if (
        change.type === "position" &&
        change.position &&
        !change.dragging
      ) {
        debouncedPositionSync(
          change.id,
          change.position.x,
          change.position.y
        );
      }
    }
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as ConnectionEdge[],
    }));
  },

  updateProjectTitle: (title) => {
    set((state) => ({ project: { ...state.project, title } }));

    // Debounced sync
    const projectId = get().projectId;
    if (projectId) {
      clearTimeout(projectTitleTimer);
      projectTitleTimer = setTimeout(() => {
        syncProjectTitle(projectId, title);
      }, 2000);
    }
  },

  updateProjectPurpose: (purpose) => {
    set((state) => ({ project: { ...state.project, purpose } }));

    // Debounced sync
    const projectId = get().projectId;
    if (projectId) {
      clearTimeout(projectPurposeTimer);
      projectPurposeTimer = setTimeout(() => {
        syncProjectPurpose(projectId, purpose);
      }, 2000);
    }
  },

  openSidebar: (nodeId) => {
    set({ selectedNodeId: nodeId, sidebarOpen: true });
  },

  closeSidebar: () => {
    set({ sidebarOpen: false });
  },
}));
