import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LandingPage } from "@/components/landing/LandingPage";

async function createCanvas() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use security-definer RPC to bypass RLS (auth.uid() is null with publishable keys)
  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_owner_id: user.id,
  });

  if (error || !projectId) {
    console.error("[createCanvas] insert failed:", error);
    redirect("/?error=create_failed");
  }

  redirect(`/canvas/${projectId}?new=1`);
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
    <div className="min-h-screen bg-landing-cream">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 md:px-12 py-6">
        <span
          className="text-lg font-semibold tracking-[-0.01em] text-landing-ink"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          CoAI
        </span>
        <form action="/auth/signout" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-landing-muted hover:text-landing-ink"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Sign out
          </Button>
        </form>
      </header>

      {/* Main content — two column layout */}
      <div className="flex flex-col md:flex-row gap-8 px-8 md:px-12 pb-12" style={{ minHeight: "calc(100vh - 80px)" }}>
        {/* Left column — project list */}
        <div className="flex-1 max-w-lg pt-4 md:pt-8">
          <p
            className="text-sm text-landing-muted mb-1"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Welcome back, {user.email}
          </p>
          <h1
            className="text-3xl md:text-4xl font-semibold tracking-[-0.025em] text-landing-ink mb-8"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Your canvases
          </h1>

          <form action={createCanvas} className="mb-8">
            <Button
              type="submit"
              size="lg"
              className="text-sm px-8 bg-landing-ink text-white hover:bg-landing-ink/90 rounded-full"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              New Canvas
            </Button>
          </form>

          {projects && projects.length > 0 && (
            <div className="space-y-1.5 mb-8">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/canvas/${p.id}`}
                  className="block rounded-xl border border-landing-border px-4 py-3.5 hover:bg-landing-warm/50 transition-colors"
                >
                  <div
                    className="font-medium text-sm text-landing-ink"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {p.title}
                  </div>
                  <div
                    className="text-xs text-landing-muted mt-0.5"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {new Date(p.updated_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {sharedProjects.length > 0 && (
            <div className="space-y-1.5">
              <h2
                className="text-xs font-semibold tracking-[0.1em] uppercase text-landing-muted mb-3"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Shared with you
              </h2>
              {sharedProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/canvas/${p.id}`}
                  className="block rounded-xl border border-landing-border px-4 py-3.5 hover:bg-landing-warm/50 transition-colors"
                >
                  <div
                    className="font-medium text-sm text-landing-ink"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {p.title}
                  </div>
                  <div
                    className="text-xs text-landing-muted mt-0.5 flex gap-2"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    <span>{p.owner?.display_name ?? "Unknown"}</span>
                    <span>&middot;</span>
                    <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column — portrait image */}
        <div className="hidden md:flex flex-1 max-w-xl flex-col">
          <div className="relative flex-1 rounded-[2rem] overflow-hidden min-h-[500px]">
            <Image
              src="/San Francisco.jpg"
              alt="San Francisco cityscape in black and white"
              fill
              className="object-cover"
              priority
            />
          </div>
          <p
            className="text-[11px] text-landing-muted mt-3 text-center leading-relaxed"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Photo by{" "}
            <a
              href="https://unsplash.com/@francistogram?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
              className="underline hover:text-landing-ink transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Francisco Delgado
            </a>{" "}
            on{" "}
            <a
              href="https://unsplash.com/photos/black-and-white-city-under-white-sky-mDHMoOuDe34?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
              className="underline hover:text-landing-ink transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
