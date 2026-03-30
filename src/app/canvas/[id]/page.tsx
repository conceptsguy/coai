import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CanvasClientShell } from "@/components/canvas/CanvasClientShell";

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

  // Verify project exists and user has access (RLS allows owner + members)
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/");

  const role = project.owner_id === user.id ? "owner" : "editor";

  // All data loading happens via Yjs sync — pass projectId + user info for node ownership
  return (
    <CanvasClientShell
      projectId={projectId}
      userId={user.id}
      userEmail={user.email ?? ""}
      role={role}
    />
  );
}
