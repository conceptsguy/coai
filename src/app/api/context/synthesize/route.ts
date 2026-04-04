import { generateText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are helping a collaborative team synthesize what they have collectively learned across multiple parallel work threads.

You will be given:
1. The team's shared context document (problem, constraints, insights, decisions, open questions)
2. Short summaries of each active work thread

Write a convergence summary: 2–4 sentences that identify the through-line across the team's work. Cover:
- What has been learned or confirmed
- What has been resolved or decided
- What key tensions or questions remain open

Be concrete and specific. Refer to actual content from the threads and context — no generic statements. Write in present tense. Return only the summary text, no headings or formatting.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { projectId: string };
  const { projectId } = body;

  if (!projectId) {
    return Response.json({ error: "Missing projectId" }, { status: 400 });
  }

  // Verify project membership
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .single();

  if (!project) return new Response("Project not found", { status: 404 });
  if (project.owner_id !== user.id && !membership) {
    return new Response("Forbidden", { status: 403 });
  }

  // Fetch shared context doc
  const { data: contextDoc } = await supabase
    .from("shared_context_docs")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (!contextDoc) {
    return Response.json(
      { error: "No shared context document found" },
      { status: 404 }
    );
  }

  // Fetch all chat node summaries for this project
  const { data: nodes } = await supabase
    .from("nodes")
    .select("id, title, summary")
    .eq("project_id", projectId)
    .eq("type", "chat")
    .neq("summary", "")
    .not("summary", "is", null);

  if (!nodes || nodes.length === 0) {
    return Response.json(
      { error: "No thread summaries available yet" },
      { status: 422 }
    );
  }

  // Build the prompt
  const threadBlock = nodes
    .map(
      (n: { id: string; title: string; summary: string }) =>
        `**${n.title || "Untitled Thread"}**\n${n.summary}`
    )
    .join("\n\n");

  const contextBlock = [
    contextDoc.problem_statement &&
      `Problem: ${contextDoc.problem_statement}`,
    contextDoc.constraints_and_goals?.length &&
      `Constraints & Goals: ${(contextDoc.constraints_and_goals as string[]).join("; ")}`,
    contextDoc.key_insights?.length &&
      `Key Insights: ${(contextDoc.key_insights as string[]).join("; ")}`,
    contextDoc.decisions_made?.length &&
      `Decisions Made: ${(contextDoc.decisions_made as string[]).join("; ")}`,
    contextDoc.tensions_and_open_questions?.length &&
      `Open Questions: ${(contextDoc.tensions_and_open_questions as string[]).join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `## Shared Context\n${contextBlock}\n\n## Thread Summaries\n${threadBlock}`;

  const model = getModel("anthropic", "claude-haiku-4-5-20251001");

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt,
  });

  const convergenceSummary = text.trim();

  // Mirror to Supabase
  await supabase
    .from("shared_context_docs")
    .update({
      convergence_summary: convergenceSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  return Response.json({ convergenceSummary });
}
