import { generateText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/server";
import type { ContextUpdate, SharedContextDoc } from "@/types/canvas";
import { v4 as uuid } from "uuid";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are an AI assistant helping a collaborative team maintain a shared project context document.
A conversation has just occurred in one of the project's threads. Determine if anything in this exchange warrants updating the team's shared context.

The shared context has these sections:
- problemStatement: The core design challenge (string)
- constraintsAndGoals: Known constraints and success criteria (array of strings)
- emergingThemes: Patterns surfacing across the project (array)
- keyInsights: Specific insights worth capturing (array)
- tensionsAndOpenQuestions: Unresolved tensions or open questions (array)
- decisionsMade: Decisions the team has committed to (array)

Return ONLY valid JSON — no markdown fences, no extra text:
{
  "shouldPropose": true,
  "targetSection": "<section name>",
  "content": "<the proposed addition — be concise, 1-2 sentences>",
  "rationale": "<one sentence explaining why this matters to the whole team>"
}

Or if nothing warrants a shared context update:
{
  "shouldPropose": false
}

Only propose updates for genuinely significant insights, decisions, or tensions — not routine discussion. Be selective.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as {
    projectId: string;
    nodeId: string;
    exchangeText: string;
  };
  const { projectId, nodeId, exchangeText } = body;

  if (!projectId || !nodeId || !exchangeText?.trim()) {
    return Response.json({ update: null });
  }

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
    parsed = JSON.parse(text.trim());
  } catch {
    return Response.json({ update: null });
  }

  if (!parsed.shouldPropose || !parsed.targetSection || !parsed.content) {
    return Response.json({ update: null });
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
    proposed_by_user_id: user.id,
    target_section: parsed.targetSection,
    content: parsed.content.trim(),
    rationale: parsed.rationale?.trim() ?? "",
    status: "proposed",
    created_at: timestamp,
  });

  const update: ContextUpdate = {
    id: updateId,
    projectId,
    proposedByThreadId: thread?.id ?? null,
    proposedByNodeId: nodeId,
    proposedByUserId: user.id,
    targetSection: parsed.targetSection as keyof SharedContextDoc,
    content: parsed.content.trim(),
    rationale: parsed.rationale?.trim() ?? "",
    status: "proposed",
    timestamp,
  };

  return Response.json({ update });
}
