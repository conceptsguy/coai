import * as Y from "yjs";
import type { ProjectMode } from "@/types/canvas";

/**
 * Yjs document schema for a coai project.
 *
 * Structure:
 *   yDoc.getMap('nodes')    → Y.Map<string, Y.Map>   (nodeId → node fields)
 *   yDoc.getMap('edges')    → Y.Map<string, Y.Map>   (edgeId → edge fields)
 *   yDoc.getMap('messages') → Y.Map<string, Y.Array>  (nodeId → Y.Array<Y.Map>)
 *   yDoc.getMap('project')  → Y.Map                   (title, purpose)
 */

export function getNodesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap("nodes") as Y.Map<Y.Map<unknown>>;
}

export function getEdgesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap("edges") as Y.Map<Y.Map<unknown>>;
}

export function getMessagesMap(doc: Y.Doc): Y.Map<Y.Array<Y.Map<unknown>>> {
  return doc.getMap("messages") as Y.Map<Y.Array<Y.Map<unknown>>>;
}

export function getProjectMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap("project");
}

/**
 * Get or create the message array for a given node.
 */
export function getNodeMessages(
  doc: Y.Doc,
  nodeId: string
): Y.Array<Y.Map<unknown>> {
  const messagesMap = getMessagesMap(doc);
  let arr = messagesMap.get(nodeId);
  if (!arr) {
    arr = new Y.Array<Y.Map<unknown>>();
    messagesMap.set(nodeId, arr);
  }
  return arr;
}

// ─── Shared Cognitive Workspace accessors ───────────────────

/**
 * Shared context document: one flat Y.Map per project.
 * Keys mirror SharedContextDoc fields; scalar fields are plain strings,
 * array fields are JSON-serialized strings.
 */
export function getSharedContextMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap("sharedContext");
}

/**
 * Thread metadata: Y.Map<nodeId, Y.Map<fields>>.
 * Stored separately from 'nodes' to preserve existing node schema converters.
 */
export function getThreadsMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap("threads") as Y.Map<Y.Map<unknown>>;
}

/**
 * Pending context updates: Y.Map<updateId, Y.Map<fields>>.
 * Only 'proposed' updates live here; accepted/rejected entries are removed.
 */
export function getContextUpdatesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap("contextUpdates") as Y.Map<Y.Map<unknown>>;
}

/**
 * Project mode stored inside the existing 'project' map.
 * Defaults to 'canvas' for projects that pre-date the workspace pivot.
 */
export function getProjectMode(doc: Y.Doc): ProjectMode {
  const mode = getProjectMap(doc).get("mode") as string | undefined;
  return mode === "ideation" ? "ideation" : "canvas";
}
