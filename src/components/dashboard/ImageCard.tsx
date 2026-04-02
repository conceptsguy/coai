"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";

const CARDS = [
  { src: "/San Francisco.jpg", alt: "San Francisco cityscape", tagline: "What will you build together?" },
  { src: "/fields.jpg", alt: "Golden fields stretching to the horizon", tagline: "Ideas grow when minds connect." },
  { src: "/cars.jpg", alt: "Cars on the open road", tagline: "Go further as a team." },
] as const;

export function ImageCard() {
  const [index, setIndex] = useState(0);
  // "idle" = normal, "flipping" = animating 180°, "resetting" = instant snap back to 0°
  const [state, setState] = useState<"idle" | "flipping" | "resetting">("idle");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const current = CARDS[index];
  const next = CARDS[(index + 1) % CARDS.length];

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (state !== "idle") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      const y = -(e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      setTilt({ x: x * 4, y: y * 4 });
    },
    [state]
  );

  const handleMouseLeave = useCallback(() => {
    if (state === "idle") setTilt({ x: 0, y: 0 });
  }, [state]);

  const handleClick = useCallback(() => {
    if (state !== "idle") return;
    setTilt({ x: 0, y: 0 });
    setState("flipping");

    // After flip animation completes: advance index + instantly snap to 0°
    setTimeout(() => {
      setState("resetting");
      setIndex((prev) => (prev + 1) % CARDS.length);
      // Re-enable transitions on the next frame
      requestAnimationFrame(() => {
        setState("idle");
      });
    }, 900);
  }, [state]);

  return (
    <div className="hidden md:flex flex-1 max-w-xl flex-col">
      <div
        ref={cardRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 min-h-[500px] cursor-pointer"
        style={{ perspective: "1200px" }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: "preserve-3d",
            transition:
              state === "flipping"
                ? "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)"
                : state === "resetting"
                  ? "none"
                  : "transform 0.15s ease-out",
            transform:
              state === "flipping"
                ? "rotateY(180deg)"
                : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-lg"
            style={{ backfaceVisibility: "hidden" }}
          >
            <Image
              src={current.src}
              alt={current.alt}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 50vw, 600px"
            />
            <Tagline text={current.tagline} />
          </div>

          {/* Back face (next card) */}
          <div
            className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-lg"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <Image
              src={next.src}
              alt={next.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 600px"
            />
            <Tagline text={next.tagline} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Tagline({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-end justify-start p-8">
      <p
        className="text-2xl md:text-3xl font-bold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] leading-snug max-w-[16ch]"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        {text}
      </p>
    </div>
  );
}
