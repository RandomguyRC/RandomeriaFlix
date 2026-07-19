"use client";

import { useEffect, useState } from "react";

export type CelebrationVariant = "joy" | "bittersweet";

interface Particle {
  id: number;
  kind: "confetti" | "balloon" | "emoji";
  left: number;
  size: number;
  duration: number;
  delay: number;
  color?: string;
  spin?: number;
  sway?: number;
  swayDuration?: number;
  emoji?: string;
}

let uid = 0;

const CONFETTI_COLORS = ["#fb7185", "#f43f5e", "#fbbf24", "#f8fafc", "#a78bfa"];
const BALLOON_COLORS = ["#fb7185", "#f43f5e", "#fbbf24", "#818cf8"];

/**
 * A one-shot celebration burst — confetti + balloons always, plus either
 * rising hearts ("joy") or gentle sad faces ("bittersweet") depending on
 * which answer was picked. Fires once on mount, cleans itself up, and
 * calls onDone so the parent can clear its trigger state.
 */
export default function CelebrationOverlay({
  variant,
  onDone,
}: {
  variant: CelebrationVariant;
  onDone: () => void;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const items: Particle[] = [];

    // Confetti — shared by both variants, it's just paper in the air
    for (let i = 0; i < 42; i++) {
      items.push({
        id: uid++,
        kind: "confetti",
        left: Math.random() * 100,
        size: 6 + Math.random() * 7,
        duration: 2.6 + Math.random() * 1.8,
        delay: Math.random() * 0.9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        spin: 200 + Math.random() * 520,
      });
    }

    // Balloons — a handful, rising slowly with a gentle sway
    for (let i = 0; i < 6; i++) {
      items.push({
        id: uid++,
        kind: "balloon",
        left: 8 + Math.random() * 84,
        size: 34 + Math.random() * 20,
        duration: 4.6 + Math.random() * 2,
        delay: Math.random() * 0.6,
        color: BALLOON_COLORS[i % BALLOON_COLORS.length],
        sway: 10 + Math.random() * 14,
        swayDuration: 1.6 + Math.random() * 1,
      });
    }

    // Hearts for a joyful answer, softer sad faces for a bittersweet one
    const emojiPool = variant === "joy" ? ["💕", "❤️", "✨"] : ["🥺", "💔", "🩶"];
    for (let i = 0; i < 20; i++) {
      items.push({
        id: uid++,
        kind: "emoji",
        left: Math.random() * 100,
        size: 14 + Math.random() * 14,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 1.2,
        sway: 8 + Math.random() * 10,
        swayDuration: 1.2 + Math.random() * 0.8,
        emoji: emojiPool[Math.floor(Math.random() * emojiPool.length)],
      });
    }

    setParticles(items);

    const timeout = setTimeout(() => {
      setParticles([]);
      onDone();
    }, 5200);

    return () => clearTimeout(timeout);
    // Deliberately only re-run when the variant changes, not on every
    // onDone identity change from the parent re-rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {particles.map((p) => {
        if (p.kind === "confetti") {
          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.left}%`,
                top: 0,
                width: p.size,
                height: p.size * 0.4,
                backgroundColor: p.color,
                borderRadius: 2,
                animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
                ["--spin" as any]: `${p.spin}deg`,
                boxShadow: `0 0 6px ${p.color}66`,
              }}
            />
          );
        }
        if (p.kind === "balloon") {
          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.left}%`,
                bottom: 0,
                width: p.size,
                height: p.size * 1.25,
                animation: `celebration-rise ${p.duration}s ease-out ${p.delay}s forwards`,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  animation: `heart-sway ${p.swayDuration}s ease-in-out infinite`,
                  ["--sway" as any]: `${p.sway}px`,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "82%",
                    borderRadius: "50% 50% 50% 50% / 58% 58% 42% 42%",
                    background: `radial-gradient(circle at 32% 26%, ${p.color}dd, ${p.color})`,
                    boxShadow: `0 0 14px ${p.color}55`,
                  }}
                />
                <div
                  style={{
                    width: 1,
                    height: "20%",
                    margin: "0 auto",
                    background: "rgba(255,255,255,0.25)",
                  }}
                />
              </div>
            </div>
          );
        }
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              bottom: 0,
              fontSize: p.size,
              lineHeight: 1,
              animation: `celebration-rise ${p.duration}s ease-out ${p.delay}s forwards`,
            }}
          >
            <div
              style={{
                animation: `heart-sway ${p.swayDuration}s ease-in-out infinite`,
                ["--sway" as any]: `${p.sway}px`,
              }}
            >
              {p.emoji}
            </div>
          </div>
        );
      })}
    </div>
  );
}
