import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CanvasClientShell } from "@/components/canvas/CanvasClientShell";
import type {
  ChatFlowNode,
  ConnectionEdge,
  ChatMessage,
} from "@/types/canvas";
import { MarkerType } from "@xyflow/react";

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/");

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

  // Load messages for all nodes
  const nodeIds = (dbNodes ?? []).map((n) => n.id);
  const { data: dbMessages } = nodeIds.length > 0
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
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      createdAt: msg.created_at,
    });
  }

  // Convert DB nodes to ChatFlowNode format
  const nodes: ChatFlowNode[] = (dbNodes ?? []).map((n) => {
    const messages = messagesByNode[n.id] ?? [];
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    return {
      id: n.id,
      type: "chat" as const,
      position: { x: n.position_x, y: n.position_y },
      data: {
        type: "chat" as const,
        title: n.title,
        modelConfig: {
          provider: n.model_provider as "anthropic" | "openai",
          modelId: n.model_id,
          label: n.model_label,
        },
        messages,
        lastMessagePreview: lastAssistant
          ? lastAssistant.content.slice(0, 100)
          : "",
        isCollapsed: n.is_collapsed ?? true,
        summary: n.summary ?? "",
        summaryMessageCount: n.summary_message_count ?? 0,
      },
    };
  });

  // Convert DB edges to ConnectionEdge format
  const edges: ConnectionEdge[] = (dbEdges ?? []).map((e) => ({
    id: e.id,
    source: e.source_node_id,
    sourceHandle: e.source_handle,
    target: e.target_node_id,
    targetHandle: e.target_handle,
    animated: true,
    style: { stroke: "#3b82f6", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#3b82f6",
      width: 16,
      height: 16,
    },
    data: { direction: "one_way" as const },
  }));

  return (
    <CanvasClientShell
      projectId={projectId}
      project={{ title: project.title, purpose: project.purpose ?? "" }}
      initialNodes={nodes}
      initialEdges={edges}
    />
  );
}
