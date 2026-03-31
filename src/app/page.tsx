import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/LogoMark";
import { LandingPage } from "@/components/landing/LandingPage";

async function createCanvas() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .insert({ owner_id: user.id })
    .select("id")
    .single();

  if (project) {
    redirect(`/canvas/${project.id}`);
  }
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  // Load user's owned projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  // Load projects shared with the user
  const { data: memberships } = await supabase
    .from("project_members")
    .select("project:projects(id, title, updated_at, owner:profiles!projects_owner_id_fkey(display_name))")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const sharedProjects = memberships
    ?.map((m) => m.project as unknown as { id: string; title: string; updated_at: string; owner: { display_name: string | null } })
    .filter(Boolean) ?? [];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={64} className="text-foreground" />
        <h1 className="text-5xl tracking-tight" style={{ fontFamily: "var(--font-logo)" }}>Coai</h1>
        <p className="text-base text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <form action={createCanvas}>
        <Button type="submit" size="lg" className="text-base px-8">
          New Canvas
        </Button>
      </form>

      {projects && projects.length > 0 && (
        <div className="w-full max-w-md space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Your canvases
          </h2>
          <div className="space-y-1">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/canvas/${p.id}`}
                className="block rounded-lg border border-border px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="font-medium text-sm">{p.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {sharedProjects.length > 0 && (
        <div className="w-full max-w-md space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Shared with you
          </h2>
          <div className="space-y-1">
            {sharedProjects.map((p) => (
              <Link
                key={p.id}
                href={`/canvas/${p.id}`}
                className="block rounded-lg border border-border px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="font-medium text-sm">{p.title}</div>
                <div className="text-xs text-muted-foreground flex gap-2">
                  <span>{p.owner?.display_name ?? "Unknown"}</span>
                  <span>&middot;</span>
                  <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
