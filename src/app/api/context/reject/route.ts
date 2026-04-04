import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { projectId: string; updateId: string };
  const { projectId, updateId } = body;

  if (!projectId || !updateId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: update } = await supabase
    .from("context_updates")
    .select("id, project_id, status")
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

  await supabase
    .from("context_updates")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", updateId);

  return Response.json({ ok: true });
}
