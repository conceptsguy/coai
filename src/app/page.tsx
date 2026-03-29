import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
        <div className="text-center space-y-4 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight">Coai</h1>
          <p className="text-lg text-muted-foreground">
            Collaborative AI Canvas. Place chat nodes, connect ideas, think
            together.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/login">
            <Button size="lg" className="text-base px-8">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="text-base px-8">
              Sign up
            </Button>
          </Link>
        </div>

        <div className="text-sm text-muted-foreground mt-8 space-y-1 text-center">
          <p>Double-click the canvas to add a chat node</p>
          <p>Drag between node handles to connect them</p>
          <p>Click &quot;Open Chat&quot; to start a conversation</p>
        </div>
      </div>
    );
  }

  // Load user's projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight">Coai</h1>
        <p className="text-lg text-muted-foreground">
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

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
