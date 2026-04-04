import { generateText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/server";
import type {
  ContextProposeRequest,
  ContextProposeResponse,
  ContextUpdate,
  SharedContextDoc,
} from "@/types/canvas";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are an AI assistant helping a collaborative team maintain a shared project context document.
A conversation has just occurred in one of the project's threads. Your job is to determine if anything in this exchange warrants updating the team's shared context.

The shared context has these sections:
- problemStatement: The core design challenge (string)
- constraintsAndGoals: Known constraints and success criteria (array of strings)
- emergingThemes: Patterns surfacing across the project (array)
- keyInsights: Specific insights worth capturing (array)
- tensionsAndOpenQuestions: Unresolved tensions or open questions (array)
- decisionsMade: Decisions the team has committed to (array)

Return ONLY valid JSON:
{
  "shouldPropose": true | false,
  "targetSection": "<section name>",
  "content": "<the proposed addition or update — be concise>",
  "rationale": "<one sentence explaining why this matters to the whole team>"
}

If nothing from this exchange warrants a shared context update, return { "shouldPropose": false }.
Only propose updates for genuinely significant insights, decisions, or tensions — not routine discussion.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as ContextProposeRequest;
  const { projectId, nodeId, targetSection, content, rationale } = body;

  if (!projectId || !nodeId || !content?.trim()) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Verify membership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();
  if (!project) return new Response("Project not found", { status: 404 });

  const updateId = uuid();
  const timestamp = new Date().toISOString();

  // Look up thread id for this node (if one exists)
  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("node_id", nodeId)
    .single();

  await supabase.from("context_updates").insert({
    id: updateId,
    project_id: projectId,
    proposed_by_thread_id: thread?.id ?? null,
    proposed_by_node_id: nodeId,
    proposed_by_user_id: user.id,
    target_section: targetSection,
    content: content.trim(),
    rationale: rationale?.trim() ?? "",
    status: "proposed",
    created_at: timestamp,
  });

  const update: ContextUpdate = {
    id: updateId,
    projectId,
    proposedByThreadId: thread?.id ?? null,
    proposedByNodeId: nodeId,
    proposedByUserId: user.id,
    targetSection: targetSection as keyof SharedContextDoc,
    content: content.trim(),
    rationale: rationale?.trim() ?? "",
    status: "proposed",
    timestamp,
  };

  return Response.json({ updateId, update } satisfies ContextProposeResponse);
}

/**
 * AI-driven analysis endpoint: POST with { projectId, nodeId, exchangeText }
 * Returns a proposal if the AI determines the exchange warrants a shared context update.
 * Used by ChatSidebar after each completed exchange.
 */
export async function analyzeExchange(
  exchangeText: string,
  projectId: string,
  nodeId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ContextUpdate | null> {
  const model = getModel("anthropic", "claude-haiku-4-5-20251001");

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: `Thread exchange:\n${exchangeText}`,
  });

  let parsed: {
    shouldPropose: boolean;
    targetSection?: string;
    content?: string;
    rationale?: string;
  };
  try {
    const cleaned = text
      .replace(/^```json\s*/m, "")
      .replace(/```\s*$/m, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (!parsed.shouldPropose || !parsed.targetSection || !parsed.content) {
    return null;
  }

  const updateId = uuid();
  const timestamp = new Date().toISOString();

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("node_id", nodeId)
    .single();

  await supabase.from("context_updates").insert({
    id: updateId,
    project_id: projectId,
    proposed_by_thread_id: thread?.id ?? null,
    proposed_by_node_id: nodeId,
    proposed_by_user_id: userId,
    target_section: parsed.targetSection,
    content: parsed.content.trim(),
    rationale: parsed.rationale?.trim() ?? "",
    status: "proposed",
    created_at: timestamp,
  });

  return {
    id: updateId,
    projectId,
    proposedByThreadId: thread?.id ?? null,
    proposedByNodeId: nodeId,
    proposedByUserId: userId,
    targetSection: parsed.targetSection as keyof SharedContextDoc,
    content: parsed.content.trim(),
    rationale: parsed.rationale?.trim() ?? "",
    status: "proposed",
    timestamp,
  };
}
