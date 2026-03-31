"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";

/**
 * Bento card with a tall image that slowly shifts as the user scrolls,
 * creating a subtle parallax / ken-burns-on-scroll effect.
 */
export function BentoParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      // progress 0→1 as the card enters and exits the viewport
      const progress = 1 - (rect.top + rect.height) / (viewH + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      // shift the image up to 20% of its height
      setOffset(clamped * 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={ref}
      className="md:col-span-3 rounded-[1.5rem] overflow-hidden relative group hover:shadow-xl hover:shadow-landing-ink/[0.06] transition-all duration-500 min-h-[280px]"
    >
      <div
        className="absolute inset-0 transition-transform duration-100 ease-out"
        style={{ transform: `translateY(-${offset}%)`, height: "140%" }}
      >
        <Image
          src="/landing/bento-models.jpg"
          alt="Topaz crystal formation"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
      <div className="relative z-10 h-full flex flex-col justify-end p-8">
        <h3
          className="text-xl md:text-2xl font-semibold text-white mb-2.5 tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          Every model, one canvas
        </h3>
        <p className="text-white/55 text-sm leading-relaxed max-w-sm">
          Claude for creativity, GPT-4o for analysis, Haiku for quick
          tasks. Each node picks its own model.
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {["Claude", "GPT-4o", "Haiku"].map((model) => (
            <span
              key={model}
              className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/80 text-xs font-medium border border-white/10"
            >
              {model}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
