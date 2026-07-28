"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const MIN_PING_GAP_MS = 15 * 1000;

export default function SessionHeartbeat() {
  const pathname = usePathname();
  const lastPingRef = useRef(0);

  const ping = useCallback(
    (force = false) => {
      if (!pathname || pathname.startsWith("/login")) return;
      if (document.visibilityState === "hidden") return;

      const now = Date.now();
      if (!force && now - lastPingRef.current < MIN_PING_GAP_MS) return;
      lastPingRef.current = now;

      fetch("/api/session/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {});
    },
    [pathname],
  );

  useEffect(() => {
    ping(true);

    const interval = window.setInterval(() => ping(), HEARTBEAT_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") ping(true);
    };
    const onFocus = () => ping(true);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [ping]);

  return null;
}
