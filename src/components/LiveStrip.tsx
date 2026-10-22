"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ARMY_BY_SLUG } from "@/lib/armies";

interface Season {
  network: string;
  computedAt: string;
  members: unknown[];
  tiles: { symbol: string; owner: string | null }[];
  recruitBoard: { confirmed: number; pending: number; flagged: number; rejected: number }[];
  fees: Record<string, { builderFee: number; fills: number }>;
  internalFillsDropped: number;
}

/** The live testnet season in one line, fetched in the browser so it is always current. */
export function LiveStrip() {
  const [s, setS] = useState<Season | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/season")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setS)
      .catch(() => setFailed(true));
  }, []);
  if (failed) return null;
  const sum = (k: "confirmed" | "pending" | "flagged" | "rejected") => s?.recruitBoard.reduce((a, r) => a + r[k], 0) ?? 0;
  const fees = s ? Object.values(s.fees).reduce((a, f) => a + f.builderFee, 0) : 0;
  const held = s?.tiles.filter((t) => t.owner).map((t) => `${t.symbol.replace("-USD", "")} ${ARMY_BY_SLUG[t.owner!]?.ticker}`) ?? [];
  return (
    <Link href="/recruits" className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-y-2 border-ink py-3 text-[14px] hover:bg-[var(--paper-2)]">
      <span className="flex items-center gap-2 font-semibold">
        <span className="inline-block h-2.5 w-2.5 bg-[var(--verified)]" aria-hidden />
        Season 1 live on Strike {s?.network ?? "testnet"}
      </span>
      {!s ? (
        <span className="num text-ink-2">reading the season from Strike…</span>
      ) : (
        <>
          <span className="num">{s.members.length} enlisted</span>
          <span className="num">{sum("confirmed")} recruits confirmed</span>
          <span className="num">{sum("pending")} waiting on day two</span>
          <span className="num">{sum("flagged") + sum("rejected")} cheaters caught</span>
          <span className="num">${fees.toFixed(2)} builder fees</span>
          {held.length > 0 && <span className="num text-ink-2">{held.join(" · ")}</span>}
          <span className="ml-auto font-semibold underline underline-offset-2">See every check</span>
        </>
      )}
    </Link>
  );
}
