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

interface CanvasState {
  nodes: ChatFlowNode[];
  edges: ConnectionEdge[];
  selectedNodeId: string | null;
  sidebarOpen: boolean;
  project: ProjectMetadata;

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

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  sidebarOpen: false,
  project: { title: "Untitled Project", purpose: "" },

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
  },

  updateNodeSummary: (nodeId, summary) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                summary,
                summaryMessageCount: n.data.messages.length,
              },
            }
          : n
      ),
    }));
  },

  getConnectedContexts: (nodeId) => {
    const { edges, nodes } = get();
    // Find all edges where this node is the TARGET (incoming connections)
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
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as ConnectionEdge[],
    }));
  },

  updateProjectTitle: (title) => {
    set((state) => ({ project: { ...state.project, title } }));
  },

  updateProjectPurpose: (purpose) => {
    set((state) => ({ project: { ...state.project, purpose } }));
  },

  openSidebar: (nodeId) => {
    set({ selectedNodeId: nodeId, sidebarOpen: true });
  },

  closeSidebar: () => {
    set({ sidebarOpen: false });
  },
}));
