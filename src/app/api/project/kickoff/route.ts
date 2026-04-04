import { generateText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/server";
import type {
  ProjectKickoffRequest,
  ProjectKickoffResponse,
  SharedContextDoc,
} from "@/types/canvas";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a strategic planning assistant helping a team frame a complex problem.
Given a project brief, produce a structured JSON object that seeds a shared cognitive workspace.

Return ONLY valid JSON matching this exact shape:
{
  "sharedContext": {
    "mode": "ideation",
    "problemStatement": "<1-2 sentences>",
    "constraintsAndGoals": ["<constraint or goal>"],
    "workstreams": [
      { "id": "<uuid>", "label": "<short label>", "topicNodeId": "", "description": "<1 sentence>" }
    ],
    "emergingThemes": [],
    "keyInsights": [],
    "tensionsAndOpenQuestions": [
      { "id": "<uuid>", "description": "<question>", "relatedWorkstreams": [], "status": "open" }
    ],
    "decisionsMade": [],
    "convergenceSummary": null
  },
  "suggestedTopicNodes": [
    { "title": "<node title>", "description": "<what this thread should explore>", "workstreamId": "<id from workstreams>" }
  ]
}

Rules:
- problemStatement: reframe the brief as a precise design challenge (1-2 sentences)
- constraintsAndGoals: 3-6 items mixing constraints (what limits us) and goals (what success looks like)
- workstreams: 3-5 parallel tracks the team could explore simultaneously
- tensionsAndOpenQuestions: 2-4 genuine tensions or unknowns the brief implies
- suggestedTopicNodes: exactly one per workstream, titles ≤ 5 words suitable for canvas node labels
- Use UUID v4 format for all id fields
- Do not include markdown fences or any text outside the JSON object`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as ProjectKickoffRequest;
  const { projectId, brief } = body;

  if (!projectId || !brief?.trim()) {
    return Response.json(
      { error: "Missing projectId or brief" },
      { status: 400 }
    );
  }

  // Verify user is a project member
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .single();
  if (!project)
    return new Response("Project not found", { status: 404 });

  // Persist brief and switch mode
  await supabase
    .from("projects")
    .update({ mode: "ideation", brief: brief.trim() })
    .eq("id", projectId);

  const model = getModel("anthropic", "claude-haiku-4-5-20251001");

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: `Project brief:\n${brief.trim()}`,
  });

  let parsed: ProjectKickoffResponse;
  try {
    const cleaned = text
      .replace(/^```json\s*/m, "")
      .replace(/```\s*$/m, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json(
      { error: "Failed to parse AI response" },
      { status: 500 }
    );
  }

  const sc: SharedContextDoc = parsed.sharedContext;

  // Mirror to Supabase — client will write the canonical version to Yjs
  await supabase.from("shared_context_docs").upsert(
    {
      project_id: projectId,
      mode: sc.mode,
      problem_statement: sc.problemStatement,
      constraints_and_goals: sc.constraintsAndGoals,
      workstreams: sc.workstreams,
      emerging_themes: sc.emergingThemes,
      key_insights: sc.keyInsights,
      tensions_and_open_questions: sc.tensionsAndOpenQuestions,
      decisions_made: sc.decisionsMade,
      convergence_summary: sc.convergenceSummary ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );

  return Response.json(parsed);
}
