"use client";

/**
 * Coai logo — text-only wordmark using the brand font (Poppins).
 */
export function LogoMark({ size = 64, className }: { size?: number; className?: string }) {
  // Scale font size proportionally to the size prop (baseline: size 24 → text-lg)
  const fontSize = size * 0.75;
  return (
    <span
      className={`font-semibold tracking-[-0.01em] leading-none ${className ?? ""}`}
      style={{ fontFamily: "var(--font-poppins)", fontSize: `${fontSize}px` }}
    >
      CoAI
    </span>
  );
}
