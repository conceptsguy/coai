import * as Y from "yjs";

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
