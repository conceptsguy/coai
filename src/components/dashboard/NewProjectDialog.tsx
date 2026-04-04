"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function NewProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const briefRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && briefRef.current) {
      briefRef.current.focus();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name.trim() || undefined }),
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const { projectId } = await res.json();

      // If a brief was provided, store it so CanvasEditor can auto-trigger kickoff
      if (brief.trim()) {
        sessionStorage.setItem(`kickoff:${projectId}`, brief.trim());
      }

      router.push(`/canvas/${projectId}?new=1`);
    } catch {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-landing-border px-6 py-2.5 text-sm font-medium text-landing-ink hover:bg-landing-warm/60 transition-colors"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        New workspace →
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-landing-border bg-white shadow-xl p-6">
        <h2
          className="text-lg font-semibold tracking-[-0.01em] text-landing-ink mb-1"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          New workspace
        </h2>
        <p
          className="text-sm text-landing-muted mb-5"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          Describe what your team is working on. The AI will seed a shared
          context document for your project.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-medium text-landing-ink mb-1.5"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Project name{" "}
              <span className="text-landing-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Onboarding Redesign"
              className="w-full rounded-lg border border-landing-border px-3 py-2 text-sm text-landing-ink placeholder:text-landing-muted focus:outline-none focus:ring-2 focus:ring-landing-ink/20"
              style={{ fontFamily: "var(--font-poppins)" }}
              disabled={loading}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium text-landing-ink mb-1.5"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Project brief
            </label>
            <textarea
              ref={briefRef}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="e.g. We're redesigning our onboarding flow to improve activation for enterprise customers. The current flow has a 40% drop-off at step 3..."
              rows={5}
              className="w-full rounded-lg border border-landing-border px-3 py-2 text-sm text-landing-ink placeholder:text-landing-muted focus:outline-none focus:ring-2 focus:ring-landing-ink/20 resize-none"
              style={{ fontFamily: "var(--font-poppins)" }}
              disabled={loading}
            />
            <p
              className="mt-1 text-[11px] text-landing-muted"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              The AI will use this to generate your initial shared context
              document.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); setName(""); setBrief(""); }}
              className="text-sm text-landing-muted hover:text-landing-ink transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-landing-ink text-white px-6 py-2 text-sm font-medium hover:bg-landing-ink/90 disabled:opacity-50 transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {loading ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
