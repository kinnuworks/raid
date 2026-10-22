"use client";

import { useEffect, useState } from "react";
import { loadSession } from "@/lib/wallet/apiKey";
import { Terminal } from "./Terminal";

/** Looks up this browser's membership so the ticket knows the army and whether the recruit cap applies. */
export function TradeShell() {
  const [info, setInfo] = useState<{ army?: string; isRecruit?: boolean } | null>(null);
  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (!s) return setInfo({ army: "snek", isRecruit: true }); // read-only preview of a SNEK recruit
      const res = await fetch("/api/members");
      const { members } = (await res.json()) as { members: { account_id: string; army: string; is_recruit: boolean }[] };
      const me = members.find((m) => m.account_id === s.accountId);
      setInfo({ army: me?.army, isRecruit: me?.is_recruit });
    })();
  }, []);
  if (!info) return <p className="num text-ink-2">Loading…</p>;
  return <Terminal army={info.army} isRecruit={info.isRecruit} />;
}
