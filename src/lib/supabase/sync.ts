import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export async function syncNodePosition(
  nodeId: string,
  x: number,
  y: number
) {
  await supabase
    .from("nodes")
    .update({ position_x: x, position_y: y, updated_at: new Date().toISOString() })
    .eq("id", nodeId);
}

export async function syncNodeTitle(nodeId: string, title: string) {
  await supabase
    .from("nodes")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", nodeId);
}

export async function syncNodeSummary(
  nodeId: string,
  summary: string,
  summaryMessageCount: number
) {
  await supabase
    .from("nodes")
    .update({
      summary,
      summary_message_count: summaryMessageCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", nodeId);
}

export async function syncNodeModel(
  nodeId: string,
  provider: string,
  modelId: string,
  label: string
) {
  await supabase
    .from("nodes")
    .update({
      model_provider: provider,
      model_id: modelId,
      model_label: label,
      updated_at: new Date().toISOString(),
    })
    .eq("id", nodeId);
}

export async function syncInsertNode(
  projectId: string,
  nodeId: string,
  title: string,
  provider: string,
  modelId: string,
  modelLabel: string,
  x: number,
  y: number
) {
  await supabase.from("nodes").insert({
    id: nodeId,
    project_id: projectId,
    title,
    model_provider: provider,
    model_id: modelId,
    model_label: modelLabel,
    position_x: x,
    position_y: y,
  });
}

export async function syncDeleteNode(nodeId: string) {
  await supabase.from("nodes").delete().eq("id", nodeId);
}

export async function syncInsertEdge(
  projectId: string,
  edgeId: string,
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle: string | null,
  targetHandle: string | null
) {
  await supabase.from("edges").insert({
    id: edgeId,
    project_id: projectId,
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    source_handle: sourceHandle,
    target_handle: targetHandle,
  });
}

export async function syncDeleteEdge(edgeId: string) {
  await supabase.from("edges").delete().eq("id", edgeId);
}

export async function syncInsertMessage(
  nodeId: string,
  messageId: string,
  role: string,
  content: string
) {
  await supabase.from("messages").insert({
    id: messageId,
    node_id: nodeId,
    role,
    content,
  });
}

export async function syncProjectTitle(projectId: string, title: string) {
  await supabase
    .from("projects")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", projectId);
}

export async function syncProjectPurpose(projectId: string, purpose: string) {
  await supabase
    .from("projects")
    .update({ purpose, updated_at: new Date().toISOString() })
    .eq("id", projectId);
}

export async function syncDeleteProject(projectId: string) {
  await supabase.from("projects").delete().eq("id", projectId);
}

// ─── File node sync ───

export async function syncInsertFileNode(
  projectId: string,
  nodeId: string,
  title: string,
  x: number,
  y: number,
  file: {
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
    contentText: string | null;
    createdBy: string | null;
  }
) {
  // Insert node row
  await supabase.from("nodes").insert({
    id: nodeId,
    project_id: projectId,
    title,
    node_type: "file",
    model_provider: "none",
    model_id: "none",
    model_label: "File",
    position_x: x,
    position_y: y,
  });

  // Insert file metadata row
  await supabase.from("files").insert({
    node_id: nodeId,
    project_id: projectId,
    storage_path: file.storagePath,
    file_name: file.fileName,
    file_type: file.fileType,
    file_size: file.fileSize,
    content_text: file.contentText,
    created_by: file.createdBy,
  });
}

export async function syncDeleteFileNode(nodeId: string, storagePath: string) {
  // Delete file from storage
  await supabase.storage.from("project-files").remove([storagePath]);
  // Delete file metadata (cascade from node delete handles edges/messages)
  await supabase.from("files").delete().eq("node_id", nodeId);
  await supabase.from("nodes").delete().eq("id", nodeId);
}

/** Fetch the full content_text for a file node (for context injection) */
export async function fetchFileContent(nodeId: string): Promise<string | null> {
  const { data } = await supabase
    .from("files")
    .select("content_text")
    .eq("node_id", nodeId)
    .single();
  return data?.content_text ?? null;
}
