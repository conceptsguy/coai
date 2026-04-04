import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { title?: string };
  const title = body.title?.trim() || "Untitled Project";

  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_owner_id: user.id,
  });

  if (error || !projectId) {
    console.error("[project/create] rpc failed:", error);
    return Response.json({ error: "Failed to create project" }, { status: 500 });
  }

  // Update title if provided
  if (body.title?.trim()) {
    await supabase
      .from("projects")
      .update({ title })
      .eq("id", projectId);
  }

  return Response.json({ projectId });
}
