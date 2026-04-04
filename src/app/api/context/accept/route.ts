import { createClient } from "@/lib/supabase/server";
import type { ContextAcceptRequest, ContextAcceptResponse, SharedContextDoc } from "@/types/canvas";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as ContextAcceptRequest;
  const { projectId, updateId } = body;

  if (!projectId || !updateId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Fetch the update and verify it belongs to this project
  const { data: update } = await supabase
    .from("context_updates")
    .select("id, project_id, target_section, content, status")
    .eq("id", updateId)
    .eq("project_id", projectId)
    .single();

  if (!update) return new Response("Update not found", { status: 404 });
  if (update.status !== "proposed") {
    return Response.json(
      { error: "Update has already been reviewed" },
      { status: 409 }
    );
  }

  // Mark as accepted
  await supabase
    .from("context_updates")
    .update({
      status: "accepted",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", updateId);

  const section = update.target_section as keyof SharedContextDoc;
  const content = update.content as string;

  // Update the shared context doc snapshot in Supabase
  // For array sections, append the new item as a JSON string element.
  // For scalar sections, replace the value.
  const ARRAY_SECTIONS: (keyof SharedContextDoc)[] = [
    "constraintsAndGoals",
    "workstreams",
    "emergingThemes",
    "keyInsights",
    "tensionsAndOpenQuestions",
    "decisionsMade",
  ];

  if (ARRAY_SECTIONS.includes(section)) {
    // Fetch current value and append
    const { data: doc } = await supabase
      .from("shared_context_docs")
      .select(toColumnName(section))
      .eq("project_id", projectId)
      .single();

    const colName = toColumnName(section);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentArray = (doc ? ((doc as any)[colName] as unknown[]) : null) ?? [];

    // Try to parse content as JSON object (structured item), fall back to plain string
    let newItem: unknown;
    try {
      newItem = JSON.parse(content);
    } catch {
      newItem = content;
    }

    await supabase
      .from("shared_context_docs")
      .upsert(
        {
          project_id: projectId,
          [toColumnName(section)]: [...currentArray, newItem],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id" }
      );
  } else {
    // Scalar section — replace value
    await supabase
      .from("shared_context_docs")
      .upsert(
        {
          project_id: projectId,
          [toColumnName(section)]: content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id" }
      );
  }

  // Return the section key and new value so the client can update Yjs
  // The client will call updateSharedContextSection(section, value) to propagate to all peers
  return Response.json({
    section,
    value: content,
  } satisfies ContextAcceptResponse);
}

function toColumnName(section: keyof SharedContextDoc): string {
  const map: Record<keyof SharedContextDoc, string> = {
    mode: "mode",
    problemStatement: "problem_statement",
    constraintsAndGoals: "constraints_and_goals",
    workstreams: "workstreams",
    emergingThemes: "emerging_themes",
    keyInsights: "key_insights",
    tensionsAndOpenQuestions: "tensions_and_open_questions",
    decisionsMade: "decisions_made",
    convergenceSummary: "convergence_summary",
  };
  return map[section] ?? section;
}
