"use client";

import { useEffect, useRef, useState } from "react";

interface HeartParticle {
  id: number;
  leftPct: number;
  topPct: number;
  size: number;
  duration: number;
  drift: number;
  sway: number;
  swayDuration: number;
  rotate: number;
  warm: boolean; // slight red/pink color variance
}

interface HeartsShowerProps {
  /** Whether the planets are currently touching — hearts spawn continuously while true */
  active: boolean;
  /** Origin point, in percent of the container, where hearts spawn from */
  originXPct: number;
  originYPct: number;
}

let uid = 0;

export default function HeartsShower({ active, originXPct, originYPct }: HeartsShowerProps) {
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originRef = useRef({ x: originXPct, y: originYPct });

  // Keep latest origin available to the spawn loop without resetting the interval
  useEffect(() => {
    originRef.current = { x: originXPct, y: originYPct };
  }, [originXPct, originYPct]);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const spawn = () => {
      const id = uid++;
      const duration = 2.4 + Math.random() * 1.6;
      const heart: HeartParticle = {
        id,
        leftPct: originRef.current.x + (Math.random() - 0.5) * 12,
        topPct: originRef.current.y + (Math.random() - 0.5) * 6,
        size: 12 + Math.random() * 18,
        duration,
        drift: (Math.random() - 0.5) * 90,
        sway: 6 + Math.random() * 10,
        swayDuration: 1 + Math.random() * 0.8,
        rotate: (Math.random() - 0.5) * 24,
        warm: Math.random() > 0.45,
      };
      setHearts((prev) => [...prev.slice(-45), heart]);
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== id));
      }, (duration + 0.3) * 1000);
    };

    // Burst a few immediately so the moment of contact feels celebratory
    spawn();
    spawn();
    const burstTimeout = setTimeout(spawn, 90);

    intervalRef.current = setInterval(spawn, 160);

    return () => {
      clearTimeout(burstTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [active]);

  if (hearts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          style={{
            position: "absolute",
            left: `${h.leftPct}%`,
            top: `${h.topPct}%`,
            width: h.size,
            height: h.size,
            animation: `heart-rise ${h.duration}s ease-out forwards`,
            ["--drift" as any]: `${h.drift}px`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              animation: `heart-sway ${h.swayDuration}s ease-in-out infinite`,
              ["--sway" as any]: `${h.sway}px`,
            }}
          >
            <svg
              viewBox="0 0 32 29"
              width="100%"
              height="100%"
              style={{ transform: `rotate(${h.rotate}deg)`, overflow: "visible" }}
            >
              <defs>
                <radialGradient id={`heart-grad-${h.id}`} cx="35%" cy="28%" r="75%">
                  <stop offset="0%" stopColor={h.warm ? "#ffb0b8" : "#ffc2dd"} />
                  <stop offset="50%" stopColor={h.warm ? "#ff3b56" : "#ff5c9e"} />
                  <stop offset="100%" stopColor={h.warm ? "#c21030" : "#c22672"} />
                </radialGradient>
              </defs>
              <path
                d="M16 29 C16 29 0 18.5 0 8.8 C0 3.9 3.9 0 8.7 0 C11.9 0 14.6 1.8 16 4.5 C17.4 1.8 20.1 0 23.3 0 C28.1 0 32 3.9 32 8.8 C32 18.5 16 29 16 29 Z"
                fill={`url(#heart-grad-${h.id})`}
                style={{ filter: "drop-shadow(0 0 6px rgba(255,60,100,0.55))" }}
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
