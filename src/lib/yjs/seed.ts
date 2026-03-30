import * as Y from "yjs";
import {
  getNodesMap,
  getEdgesMap,
  getMessagesMap,
  getProjectMap,
  getNodeMessages,
} from "./doc";
import { messageToYMap } from "./utils";
import type { ChatMessage } from "@/types/canvas";

interface SeedNode {
  id: string;
  positionX: number;
  positionY: number;
  title: string;
  modelProvider: string;
  modelId: string;
  modelLabel: string;
  isCollapsed: boolean;
  summary: string;
  summaryMessageCount: number;
}

interface SeedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

interface SeedData {
  project: { title: string; purpose: string };
  nodes: SeedNode[];
  edges: SeedEdge[];
  messagesByNode: Record<string, ChatMessage[]>;
}

/**
 * Check if the Yjs doc is empty (no nodes, no project title set).
 * If so, fetch seed data from the server and populate the doc.
 */
export async function seedYjsDocIfEmpty(
  doc: Y.Doc,
  projectId: string
): Promise<void> {
  const nodesMap = getNodesMap(doc);
  const projectMap = getProjectMap(doc);

  // Doc already has data or was already seeded — skip
  if (nodesMap.size > 0 || projectMap.get("title") || projectMap.get("_seeded")) {
    return;
  }

  // Mark as seeded immediately to prevent concurrent clients from duplicating
  projectMap.set("_seeded", true);

  // Fetch existing data from Supabase via API
  const res = await fetch(`/api/canvas/${projectId}/seed`);
  if (!res.ok) return;

  const data: SeedData = await res.json();

  doc.transact(() => {
    // Seed project metadata
    const pm = getProjectMap(doc);
    pm.set("title", data.project.title);
    pm.set("purpose", data.project.purpose);

    // Seed nodes
    const nm = getNodesMap(doc);
    for (const node of data.nodes) {
      const m = new Y.Map<unknown>();
      m.set("id", node.id);
      m.set("positionX", node.positionX);
      m.set("positionY", node.positionY);
      m.set("title", node.title);
      m.set("modelProvider", node.modelProvider);
      m.set("modelId", node.modelId);
      m.set("modelLabel", node.modelLabel);
      m.set("isCollapsed", node.isCollapsed);
      m.set("summary", node.summary);
      m.set("summaryMessageCount", node.summaryMessageCount);
      m.set("lastMessagePreview", "");
      m.set("createdAt", "");
      m.set("createdBy", "");
      m.set("createdByName", "");
      nm.set(node.id, m);
    }

    // Seed edges
    const em = getEdgesMap(doc);
    for (const edge of data.edges) {
      const m = new Y.Map<unknown>();
      m.set("id", edge.id);
      m.set("source", edge.source);
      m.set("target", edge.target);
      m.set("sourceHandle", edge.sourceHandle);
      m.set("targetHandle", edge.targetHandle);
      em.set(edge.id, m);
    }

    // Seed messages
    for (const [nodeId, messages] of Object.entries(data.messagesByNode)) {
      const arr = getNodeMessages(doc, nodeId);
      for (const msg of messages) {
        arr.push([messageToYMap(msg)]);
      }

      // Update lastMessagePreview on the node
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant) {
        const nodeYMap = nm.get(nodeId);
        if (nodeYMap) {
          nodeYMap.set(
            "lastMessagePreview",
            lastAssistant.content.slice(0, 100)
          );
        }
      }
    }
  });
}
