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

  // Verify project exists and user has access
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/");

  // All data loading happens via Yjs sync — just pass the projectId
  return <CanvasClientShell projectId={projectId} />;
}
