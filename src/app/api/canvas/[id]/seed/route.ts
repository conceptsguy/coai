import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/types/canvas";

/**
 * GET /api/canvas/[id]/seed
 *
 * Returns existing Supabase data for a project so the Yjs doc can be
 * populated on first connection. Used for migrating pre-Yjs projects.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load project
  const { data: project } = await supabase
    .from("projects")
    .select("title, purpose")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Load nodes
  const { data: dbNodes } = await supabase
    .from("nodes")
    .select("*")
    .eq("project_id", projectId);

  // Load edges
  const { data: dbEdges } = await supabase
    .from("edges")
    .select("*")
    .eq("project_id", projectId);

  // Load messages
  const nodeIds = (dbNodes ?? []).map((n) => n.id);
  const { data: dbMessages } =
    nodeIds.length > 0
      ? await supabase
          .from("messages")
          .select("*")
          .in("node_id", nodeIds)
          .order("created_at", { ascending: true })
      : { data: [] as Array<{ id: string; node_id: string; role: string; content: string; created_at: string }> };

  // Group messages by node
  const messagesByNode: Record<string, ChatMessage[]> = {};
  for (const msg of dbMessages ?? []) {
    if (!messagesByNode[msg.node_id]) messagesByNode[msg.node_id] = [];
    messagesByNode[msg.node_id].push({
      id: msg.id,
      role: msg.role as ChatMessage["role"],
      content: msg.content,
      createdAt: msg.created_at,
    });
  }

  return NextResponse.json({
    project: { title: project.title, purpose: project.purpose ?? "" },
    nodes: (dbNodes ?? []).map((n) => ({
      id: n.id,
      positionX: n.position_x,
      positionY: n.position_y,
      title: n.title,
      modelProvider: n.model_provider,
      modelId: n.model_id,
      modelLabel: n.model_label,
      isCollapsed: n.is_collapsed ?? true,
      summary: n.summary ?? "",
      summaryMessageCount: n.summary_message_count ?? 0,
    })),
    edges: (dbEdges ?? []).map((e) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      sourceHandle: e.source_handle,
      targetHandle: e.target_handle,
    })),
    messagesByNode,
  });
}
