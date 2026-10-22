"use client";

import { useEffect, useState } from "react";

/** Time until the next UTC day, when pending recruits can log their second trading day. */
export function NextDayCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return null;
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((next.getTime() - now) / 60_000));
  return (
    <span className="num">
      next trading day opens in {Math.floor(mins / 60)}h {String(mins % 60).padStart(2, "0")}m (00:00 UTC)
    </span>
  );
}
