"use client";

/**
 * Coai logo mark — two overlapping speech bubbles suggesting
 * two LLMs in dialogue. The overlap zone represents shared context.
 */
export function LogoMark({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left bubble (first LLM) */}
      <g opacity="0.9">
        <rect x="8" y="16" width="48" height="40" rx="12" fill="currentColor" />
        <path d="M20 56 L14 68 L30 54" fill="currentColor" />
      </g>

      {/* Right bubble (second LLM) — offset, overlapping */}
      <g opacity="0.55">
        <rect x="44" y="28" width="48" height="40" rx="12" fill="currentColor" />
        <path d="M80 68 L86 80 L70 66" fill="currentColor" />
      </g>

      {/* Overlap highlight — the shared context zone */}
      <rect x="44" y="28" width="12" height="28" rx="4" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
