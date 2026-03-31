"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-landing-cream">
      {/* Large rounded container with background image */}
      <div className="relative w-full max-w-[960px] min-h-[640px] rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Background image */}
        <Image
          src="/office.jpg"
          alt="Office"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Form card */}
        <div className="relative z-10 flex items-center justify-center min-h-[640px] p-8">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
            <div className="space-y-1.5 mb-8">
              <span
                className="text-sm font-semibold tracking-[-0.01em] text-landing-ink"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                CoAI
              </span>
              <h1
                className="text-2xl font-semibold tracking-[-0.02em] text-landing-ink"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Sign in
              </h1>
              <p
                className="text-sm text-landing-muted"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Collaborative AI Canvas
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-landing-ink"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border-landing-border"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-landing-ink"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white border-landing-border"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-landing-ink text-white hover:bg-landing-ink/90"
                disabled={loading}
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p
              className="text-center text-sm text-landing-muted mt-6"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-landing-ink font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
