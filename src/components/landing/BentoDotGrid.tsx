"use client";

import { useRef, useState, useCallback } from "react";

/**
 * Bento card with a dotted grid background and a subtle color glow
 * that follows the cursor on hover.
 */
export function BentoDotGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={ref}
      className="md:col-span-4 rounded-[1.5rem] overflow-hidden relative group hover:shadow-xl hover:shadow-landing-ink/[0.06] transition-all duration-500 min-h-[380px] bg-[#141413] cursor-default"
      onMouseMove={handleMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Dot grid via SVG pattern */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1" fill="rgba(255,255,255,0.12)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Cursor-following glow */}
      <div
        className="absolute pointer-events-none transition-opacity duration-300"
        style={{
          left: mouse.x - 200,
          top: mouse.y - 200,
          width: 400,
          height: 400,
          opacity: hovering ? 1 : 0,
          background: "radial-gradient(circle, rgba(123,154,109,0.25) 0%, rgba(123,154,109,0.08) 40%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* Secondary glow — warm accent */}
      <div
        className="absolute pointer-events-none transition-opacity duration-500"
        style={{
          left: mouse.x - 150,
          top: mouse.y - 100,
          width: 300,
          height: 300,
          opacity: hovering ? 0.6 : 0,
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)",
          borderRadius: "50%",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-10">
        <h3
          className="text-xl md:text-2xl font-semibold text-white mb-2.5 tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          A canvas, not a chatbox
        </h3>
        <p className="text-white/50 text-sm leading-relaxed max-w-sm">
          Place conversations anywhere on an infinite canvas. The spatial
          layout becomes your team&apos;s map of thinking — see what
          everyone&apos;s exploring at a glance.
        </p>
      </div>
    </div>
  );
}
