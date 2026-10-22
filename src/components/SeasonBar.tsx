"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LIVE_NETWORK } from "@/lib/strike/config";

/** Two seasons, always labelled, so no number on the page can be mistaken for the other. */
export function SeasonBar() {
  const path = usePathname();
  const live = ["/recruits", "/proof", "/trade", "/join"].some((p) => path.startsWith(p));
  const seg = (on: boolean) => `flex min-h-9 items-center gap-2 px-3 ${on ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--paper-2)]"}`;
  return (
    <div className="rule-b">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-stretch px-4 text-[13px] md:px-8">
        <Link href="/" className={seg(!live)}>
          <span className="num font-semibold">S0</span> Strike mainnet · read-only map, last 7 days
        </Link>
        <Link href="/recruits" className={seg(live)}>
          <span className="num font-semibold">S1</span> Strike {LIVE_NETWORK} · live season, enlistment open
        </Link>
      </div>
    </div>
  );
}
