"use client";

import { useState } from "react";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { builderFee, dropInternalTrades, feesByArmy, parseRaidTag, type Fill } from "@/lib/score";
import { publicApi } from "@/lib/strike/client";
import { LIVE_NETWORK } from "@/lib/strike/config";
import { fmtExact } from "@/lib/format";

type Rows = ReturnType<typeof feesByArmy>;

/**
 * Recomputes every army's builder fees in this browser, straight from Strike.
 * Raid's server is only asked for the member list; every fill comes from Strike's public API.
 */
export function Recompute({ server, accounts, seasonStart }: { server: Rows; accounts: string[]; seasonStart: string }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [rows, setRows] = useState<Rows | null>(null);
  const [lines, setLines] = useState<{ f: Fill; fee: number }[]>([]);
  const [err, setErr] = useState("");

  async function run() {
    setState("running");
    try {
      const pub = publicApi(LIVE_NETWORK);
      const since = Date.parse(seasonStart);
      const all = (await Promise.all(accounts.map((a) => pub.fills(a, 500).then((r) => (r.fills ?? []) as Fill[]))))
        .flat()
        .filter((f) => f.timestamp >= since);
      setRows(feesByArmy(all));
      const { kept } = dropInternalTrades(all);
      void kept;
      setLines(
        all
          .filter((f) => f.role === "taker" && parseRaidTag(f.client_order_id))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 40)
          .map((f) => ({ f, fee: builderFee(f, parseRaidTag(f.client_order_id)!.bps) })),
      );
      setState("done");
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  }

  const armies = [...new Set([...Object.keys(server), ...Object.keys(rows ?? {})])];
  const total = (r: Rows | null) => Object.values(r ?? {}).reduce((s, x) => s + x.builderFee, 0);
  const match = rows && armies.every((a) => Math.abs((server[a]?.builderFee ?? 0) - (rows[a]?.builderFee ?? 0)) < 1e-8);

  return (
    <div className="terminal p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label">Receipt · builder fees by army · {LIVE_NETWORK}</p>
        <button className="btn" style={{ background: "#ededeb", color: "#1b1a17", borderColor: "#ededeb" }} onClick={run} disabled={state === "running"}>
          {state === "running" ? "Fetching from Strike…" : "Recompute in my browser"}
        </button>
      </div>
      <table className="num mt-4 w-full text-[14px]">
        <thead>
          <tr className="label text-left">
            <th className="py-1">Army</th>
            <th className="text-right">Tagged fills</th>
            <th className="text-right">Notional</th>
            <th className="text-right">Raid server</th>
            <th className="text-right">Your browser</th>
          </tr>
        </thead>
        <tbody>
          {armies.map((a) => (
            <tr key={a} className="border-t border-[#3a3a38]">
              <td className="py-1.5">
                <span className="mr-2 inline-block h-3 w-3 align-middle" style={{ background: ARMY_BY_SLUG[a]?.ink }} />
                {ARMY_BY_SLUG[a]?.ticker ?? a}
              </td>
              <td className="text-right">{server[a]?.fills ?? 0}</td>
              <td className="text-right">${(server[a]?.notional ?? 0).toFixed(2)}</td>
              <td className="text-right">{fmtExact(server[a]?.builderFee ?? 0)}</td>
              <td className="text-right">{rows ? fmtExact(rows[a]?.builderFee ?? 0) : "—"}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-[#ededeb]">
            <td className="py-2 font-semibold">Total</td>
            <td />
            <td />
            <td className="text-right font-semibold">{fmtExact(total(server))}</td>
            <td className="text-right font-semibold">{rows ? fmtExact(total(rows)) : "—"}</td>
          </tr>
        </tbody>
      </table>
      {state === "done" && (
        <p className="mt-4">
          <span className={`stamp ${match ? "" : "reject"}`} style={match ? { color: "#9fd3b8", borderColor: "#9fd3b8" } : undefined}>
            {match ? "Browser matches server" : "Mismatch"}
          </span>
        </p>
      )}
      {state === "error" && <p className="mt-3 text-[#f3a08f]">{err}</p>}
      {lines.length > 0 && (
        <div className="mt-5">
          <p className="label">Line items, newest first: floor(price × size × bps ÷ 10,000)</p>
          <ul className="num mt-2 max-h-80 overflow-auto text-[12px]">
            {lines.map(({ f, fee }) => (
              <li key={`${f.account_id}-${f.trade_id}`} className="grid grid-cols-[70px_80px_1fr_110px] gap-2 border-t border-[#3a3a38] py-1 text-[12px] text-[#d9d9d5]">
                <span>{ARMY_BY_SLUG[parseRaidTag(f.client_order_id)!.army]?.ticker}</span>
                <span>{f.symbol}</span>
                <span className="truncate text-[#d9d9d5]">
                  {Number(f.price)} × {Number(f.size)} · trade {f.trade_id}
                </span>
                <span className="text-right">{fmtExact(fee)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
