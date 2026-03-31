"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/LogoMark";
import { BentoDotGrid } from "./BentoDotGrid";
import { BentoParallax } from "./BentoParallax";

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="bg-landing-cream">
      {/* ── Navigation ──────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-landing-cream/85 backdrop-blur-2xl shadow-[0_1px_0_0_rgba(0,0,0,0.04)] py-3"
            : "py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10">
          <LogoMark
            size={24}
            className={`transition-colors duration-500 ${scrolled ? "text-landing-ink" : "text-white"}`}
          />
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className={`text-sm font-medium transition-colors duration-300 ${
                scrolled
                  ? "text-landing-muted hover:text-landing-ink"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                scrolled
                  ? "bg-landing-ink text-white hover:bg-landing-ink/90"
                  : "bg-white text-landing-ink hover:bg-white/90"
              }`}
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative h-screen overflow-hidden">
        <Image
          src="/california.jpg"
          alt="Friends collaborating with laptops in a sunny California backyard"
          fill
          className="object-cover"
          priority
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40 z-[1]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent z-[1]" />

        {/* Content — bottom-left editorial layout */}
        <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-6 md:px-10 pb-20 md:pb-24">
          <h1
            className="text-[clamp(3.5rem,9vw,8rem)] text-white leading-[0.92] tracking-[-0.03em] landing-fade-up"
            style={{ fontFamily: "var(--font-logo)" }}
          >
            Don&apos;t AI
            <br />
            alone.
          </h1>
          <p className="mt-5 text-base md:text-lg text-white/65 max-w-md leading-relaxed landing-fade-up landing-delay-1">
            A shared canvas where AI conversations connect, build on each other,
            and make your whole team smarter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 landing-fade-up landing-delay-2">
            <Link
              href="/signup"
              className="bg-white text-landing-ink px-7 py-3 rounded-full text-sm font-semibold transition-all hover:shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Start collaborating
            </Link>
            <a
              href="#how"
              className="border border-white/20 text-white/90 px-7 py-3 rounded-full text-sm font-medium transition-all hover:bg-white/10 hover:border-white/30"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 landing-fade-up landing-delay-3">
          <div className="w-5 h-8 rounded-full border border-white/25 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/50 landing-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ── Features sheet (overlaps hero bottom) ───────── */}
      <section
        id="how"
        className="relative z-20 bg-landing-cream rounded-t-[2.5rem] -mt-8 pt-20 md:pt-28 pb-24 md:pb-32 px-6 md:px-10"
      >
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <p
            className="text-[11px] font-semibold tracking-[0.2em] uppercase text-landing-sage mb-5"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Built for thinking together
          </p>
          <h2
            className="text-3xl md:text-[3.25rem] text-landing-ink leading-[1.08] tracking-[-0.025em] max-w-xl mb-14 md:mb-16"
            style={{ fontFamily: "var(--font-logo)" }}
          >
            AI gets better when you collaborate.
          </h2>

          {/* Bento grid — photo-background cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* ── Card 1: Shared Canvas (wide) — interactive dot grid ── */}
            <BentoDotGrid />

            {/* ── Card 2: Connected Context ── */}
            <div className="md:col-span-2 rounded-[1.5rem] overflow-hidden relative group hover:shadow-xl transition-all duration-500 min-h-[380px]">
              <Image
                src="/landing/bento-context.jpg"
                alt="Connected nature patterns"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/15" />
              <div className="relative z-10 h-full flex flex-col justify-end p-8">
                <h3
                  className="text-xl font-semibold text-white mb-2.5 tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Connected
                  <br />
                  context
                </h3>
                <p className="text-white/55 text-sm leading-relaxed">
                  Draw a line between conversations and they share context. Your
                  research informs your strategy.
                </p>
              </div>
            </div>

            {/* ── Card 3: Multiplayer ── */}
            <div className="md:col-span-3 rounded-[1.5rem] overflow-hidden relative group hover:shadow-xl hover:shadow-landing-ink/[0.06] transition-all duration-500 min-h-[280px]">
              <Image
                src="/landing/bento-collab.jpg"
                alt="Team working together indoors"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
              <div className="relative z-10 h-full flex flex-col justify-end p-8">
                <h3
                  className="text-xl font-semibold text-white mb-2.5 tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Real-time multiplayer
                </h3>
                <p className="text-white/55 text-sm leading-relaxed max-w-xs">
                  See your team&apos;s cursors on the canvas. Chat alongside each
                  other. Think in parallel, not in sequence.
                </p>
              </div>
            </div>

            {/* ── Card 4: Multiple Models — parallax topaz ── */}
            <BentoParallax />
          </div>
        </div>
      </section>

      {/* ── Manifesto strip ─────────────────────────────── */}
      <section className="bg-landing-cream py-20 md:py-28 px-6 md:px-10 border-t border-landing-border">
        <div className="max-w-4xl mx-auto text-center">
          <p
            className="text-2xl md:text-[2.5rem] text-landing-ink leading-[1.2] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-logo)" }}
          >
            Most AI tools are built for one person, one prompt, one thread.{" "}
            <span className="text-landing-muted">
              We think the best thinking happens together — where your
              conversation informs mine, and the canvas holds the map.
            </span>
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="bg-landing-ink py-28 md:py-36 px-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-landing-forest/30 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <h2
            className="text-4xl md:text-6xl text-white leading-[1.02] tracking-[-0.03em] mb-5"
            style={{ fontFamily: "var(--font-logo)" }}
          >
            Start thinking
            <br />
            together.
          </h2>
          <p className="text-white/35 text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Free to start. Built for teams who believe the best ideas come from
            collaboration — even with AI.
          </p>
          <Link
            href="/signup"
            className="inline-flex bg-white text-landing-ink px-9 py-3.5 rounded-full text-sm font-semibold transition-all hover:shadow-lg hover:shadow-white/10 hover:scale-[1.02] active:scale-[0.98]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-landing-ink border-t border-white/[0.05] py-8 px-6 md:px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <LogoMark size={18} className="text-white/25" />
          <p className="text-white/30 text-xs flex items-center gap-1.5">
            <span>&copy; {new Date().getFullYear()} Convo</span>
            <span className="text-white/15">&middot;</span>
            <span>by</span>
            <a
              href="https://crema.us"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/45 hover:text-white/70 transition-colors font-medium"
            >
              Crema
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
