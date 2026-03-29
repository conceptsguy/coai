import Link from "next/link";
import { v4 as uuid } from "uuid";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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

  const newCanvasId = uuid();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight">Coai</h1>
        <p className="text-lg text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <Link href={`/canvas/${newCanvasId}`}>
        <Button size="lg" className="text-base px-8">
          New Canvas
        </Button>
      </Link>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
