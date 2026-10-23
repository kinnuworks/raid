"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { raidTag, RECRUIT_RULES } from "@/lib/score";
import { publicApi, tradingApi, type MarketConfig, type PublicFill, type PublicPosition } from "@/lib/strike/client";
import { BUILDER_FEE_BPS, LIVE_NETWORK } from "@/lib/strike/config";
import { loadSession } from "@/lib/wallet/apiKey";
import { attachWitnesses } from "@/lib/wallet/cbor";
import { connectCardano, listCardanoWallets } from "@/lib/wallet/cardano";
import { fmtExact } from "@/lib/format";

type Session = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

/** Points only count at this leverage or below. */
const MAX_POINTS_LEVERAGE = 3;
/** Daily loss cap enforced by this ticket (the community can lower it). */
const DAILY_LOSS_CAP = 50;
const STRIKE_TAKER_BPS = 5;

/** A real recruit's account, shown read-only to visitors without a key so the ticket and its guardrails are visible. */
const PREVIEW_ACCOUNT = process.env.NEXT_PUBLIC_RAID_PREVIEW_ACCOUNT ?? "";

export function Terminal({ army, isRecruit }: { army?: string; isRecruit?: boolean }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [markets, setMarkets] = useState<Record<string, MarketConfig>>({});
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [fills, setFills] = useState<PublicFill[]>([]);
  const [positions, setPositions] = useState<PublicPosition[]>([]);
  const [symbol, setSymbol] = useState("SOL-USD");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [usd, setUsd] = useState(25);
  const [lev, setLev] = useState(1); // first trades default to no leverage
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [depositAda, setDepositAda] = useState(150);

  const pub = useMemo(() => publicApi(LIVE_NETWORK), []);

  const refresh = useCallback(
    async (s: { accountId: string }) => {
      const [f, p] = await Promise.all([pub.fills(s.accountId, 200).catch(() => ({ fills: [] })), pub.positions(s.accountId).catch(() => ({ positions: [] }))]);
      setFills(f.fills ?? []);
      setPositions((p.positions ?? []).filter((x) => Number(x.size) !== 0));
    },
    [pub],
  );

  useEffect(() => {
    loadSession().then((s) => {
      setSession(s);
      if (s) refresh(s);
      else if (PREVIEW_ACCOUNT) refresh({ accountId: PREVIEW_ACCOUNT });
    });
    pub.markets().then((m) => {
      setMarkets(m.markets);
      setMarks(Object.fromEntries(Object.values(m.markets).map((x) => [x.symbol, Number(x.mark_price)])));
    });
  }, [pub, refresh]);

  const mark = marks[symbol] ?? 0;
  const cfg = markets[symbol];
  const step = Number(cfg?.order_market_step_size ?? cfg?.order_limit_step_size ?? "0.001") || 0.001;
  const minSize = Number(cfg?.order_market_min_size ?? step) || step;
  const size = mark ? Math.max(minSize, Math.floor(usd / mark / step) * step) : 0;
  const notional = size * mark;
  const margin = notional / lev;
  const fees = (notional * (STRIKE_TAKER_BPS + BUILDER_FEE_BPS)) / 1e4;
  const mmr = Number(cfg?.margin_tiers?.[0]?.maintenance_margin_rate ?? 0.01);
  const liq = side === "buy" ? mark * (1 - 1 / lev + mmr) : mark * (1 + 1 / lev - mmr);

  const today = new Date().toISOString().slice(0, 10);
  const lostToday = -fills
    .filter((f) => new Date(f.timestamp).toISOString().slice(0, 10) === today)
    .reduce((s, f) => s + Number(f.realized_pnl) - Math.max(0, Number(f.fee)), 0);
  const capLeft = Math.max(0, (isRecruit ? RECRUIT_RULES.seasonLossCapUsd : DAILY_LOSS_CAP) - Math.max(0, lostToday));
  const worstCase = margin + fees;
  const blocked = worstCase > capLeft ? `This order could lose $${worstCase.toFixed(2)}; you have $${capLeft.toFixed(2)} of today's cap left.` : null;

  async function placeOrder() {
    if (!session || !army || blocked) return;
    setBusy(true);
    setMsg(null);
    try {
      const t = tradingApi(LIVE_NETWORK, session.signer);
      await t.setLeverage(symbol, lev).catch(() => undefined);
      const dp = Math.max(0, Math.round(-Math.log10(step)));
      const r = await t.order(
        { symbol, side, type: "market", size: size.toFixed(dp), client_order_id: raidTag(army, BUILDER_FEE_BPS, crypto.randomUUID().slice(0, 12)), slippage: "0.02" },
        BUILDER_FEE_BPS,
      );
      setMsg({ kind: "ok", text: `Order ${r.status}. Tag ${r.client_order_id}` });
      setTimeout(() => refresh(session), 2500);
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function deposit() {
    if (!session) return;
    setBusy(true);
    setMsg(null);
    try {
      const walletId = listCardanoWallets()[0]?.id;
      if (!walletId) throw new Error("No Cardano wallet found");
      const w = await connectCardano(walletId);
      if (w.address !== session.address) throw new Error("Switch to the wallet you enlisted with.");
      const t = tradingApi(LIVE_NETWORK, session.signer);
      const q = await t.depositQuote("cardano", "ADA", String(Math.round(depositAda * 1e6)));
      const utxos = (await w.api.getUtxos()) ?? [];
      const built = await t.depositBuildTx(q.request_id, w.address, utxos);
      const unsigned = built.unsigned_tx as string;
      const witness = await w.api.signTx(unsigned, true);
      const signed = attachWitnesses(unsigned, witness);
      const hash = await w.api.submitTx(signed);
      await t.depositConfirm(q.request_id, hash);
      setMsg({ kind: "ok", text: `Deposit of ${depositAda} ADA (~$${Number(q.quote.usd_value).toFixed(2)}) sent: ${hash.slice(0, 16)}…` });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (session === undefined) return <p className="num text-ink-2">Loading your key…</p>;
  const preview = !session;
  const a = army ? ARMY_BY_SLUG[army] : preview ? ARMY_BY_SLUG.snek : undefined;
  return (
    <>
    {preview && (
      <div className="mb-6 flex flex-wrap items-center gap-4 border-l-4 border-ink pl-4">
        <p className="max-w-[70ch] text-[15px] text-ink-2">
          You have no trading key in this browser yet, so this is a read-only view of a real SNEK recruit on Strike {LIVE_NETWORK}. The ticket shows what
          you would see before every order: margin, fees, liquidation price and the most you can lose.
        </p>
        <Link href="/join" className="btn">
          Enlist to trade
        </Link>
      </div>
    )}
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section>
        <div className="flex items-baseline justify-between rule-b pb-2">
          <h2 className="display text-[26px]">Positions</h2>
          <span className="num text-[12px] text-ink-3">{session?.accountId ?? `${PREVIEW_ACCOUNT} · read-only`}</span>
        </div>
        {positions.length === 0 ? (
          <p className="py-6 text-ink-2">No open positions.</p>
        ) : (
          <table className="mt-2 w-full text-[14px]">
            <thead>
              <tr className="label text-left">
                <th className="py-2">Market</th>
                <th className="text-right">Size</th>
                <th className="text-right">Entry</th>
                <th className="text-right">Liq.</th>
                <th className="text-right">uPnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.symbol} className="rule-t num">
                  <td className="py-2">{p.symbol}</td>
                  <td className="text-right">{Number(p.size)}</td>
                  <td className="text-right">{Number(p.entry_price).toFixed(2)}</td>
                  <td className="text-right">{Number(p.liquidation_price) > 0 ? Number(p.liquidation_price).toFixed(2) : p.margin_mode === "cross" ? "cross" : "—"}</td>
                  <PnlCell value={Number(p.upnl ?? p.unrealized_pnl ?? 0)} />
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-8 flex items-baseline justify-between rule-b pb-2">
          <h2 className="display text-[26px]">Recent fills</h2>
          <span className="label">public on Strike</span>
        </div>
        <ul className="num mt-1 text-[13px]">
          {fills.slice(0, 12).map((f) => (
            <li key={f.id} className="grid grid-cols-[90px_50px_1fr_90px] gap-3 rule-b py-1.5">
              <span>{f.symbol}</span>
              <span style={{ color: f.side === "buy" ? "var(--gain)" : "var(--loss)" }}>{f.side}</span>
              <span className="truncate text-ink-3">{f.client_order_id}</span>
              <span className="text-right">{fmtExact(Number(f.fee), 4)}</span>
            </li>
          ))}
          {fills.length === 0 && <li className="py-4 text-ink-2">No fills yet.</li>}
        </ul>
      </section>

      <aside className="terminal p-5">
        <p className="label">Field terminal · {LIVE_NETWORK}</p>
        <p className="display mt-1 text-[30px]">{a ? `${a.ticker} order` : "Order"}</p>

        <div className="mt-4 grid grid-cols-4 gap-1">
          {Object.keys(markets).map((s) => (
            <button key={s} onClick={() => setSymbol(s)} className="num min-h-10 border text-[13px]" style={{ borderColor: "#5c5c5a", background: s === symbol ? "#ededeb" : "transparent", color: s === symbol ? "#1b1a17" : "#ededeb" }}>
              {s.replace("-USD", "")}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className="display min-h-11 text-[20px]"
              style={{ background: side === s ? (s === "buy" ? "var(--verified)" : "var(--loss)") : "transparent", border: "1px solid #5c5c5a", color: "#ededeb" }}
            >
              {s === "buy" ? "▲ Long" : "▼ Short"}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="label">Size (USD)</span>
          <input type="number" min={5} value={usd} onChange={(e) => setUsd(Number(e.target.value))} className="num mt-1 w-full border border-[#5c5c5a] bg-transparent p-2 text-[18px]" />
        </label>
        <label className="mt-3 block">
          <span className="label">Leverage · orders above {MAX_POINTS_LEVERAGE}x never score</span>
          <input type="range" min={1} max={MAX_POINTS_LEVERAGE} value={lev} onChange={(e) => setLev(Number(e.target.value))} className="mt-2 w-full accent-[#ededeb]" />
          <span className="num text-[14px]">{lev}x</span>
        </label>

        <dl className="num mt-4 grid grid-cols-2 gap-y-1 text-[13px]">
          <dt className="text-[#a3a3a0]">Mark</dt>
          <dd className="text-right">{mark ? mark.toFixed(2) : "…"}</dd>
          <dt className="text-[#a3a3a0]">Size</dt>
          <dd className="text-right">{size ? `${size} ${symbol.replace("-USD", "")}` : "…"}</dd>
          <dt className="text-[#a3a3a0]">Margin</dt>
          <dd className="text-right">${margin.toFixed(2)}</dd>
          <dt className="text-[#a3a3a0]">
            Fees
            <span className="block text-[11px]">Strike {STRIKE_TAKER_BPS} + Raid {BUILDER_FEE_BPS} bps</span>
          </dt>
          <dd className="text-right">${fees.toFixed(4)}</dd>
          <dt className="text-[#a3a3a0]">Est. liquidation</dt>
          <dd className="text-right">{mark ? liq.toFixed(2) : "…"}</dd>
        </dl>

        <div className="mt-4 border border-[#ededeb] p-3">
          <p className="label">Max you can lose</p>
          <p className="num text-[22px]">${worstCase.toFixed(2)}</p>
          <p className="num text-[12px] text-[#a3a3a0]">
            {isRecruit ? "Season" : "Daily"} cap left: ${capLeft.toFixed(2)} of ${isRecruit ? RECRUIT_RULES.seasonLossCapUsd : DAILY_LOSS_CAP}
          </p>
        </div>

        {blocked && <p className="mt-3 text-[13px] text-[#f3a08f]">{blocked}</p>}
        <button className="btn mt-4 w-full" style={{ background: "#ededeb", color: "#1b1a17", borderColor: "#ededeb" }} disabled={preview || busy || !army || !!blocked || !size} onClick={placeOrder}>
          {preview ? "Enlist to place orders" : busy ? "Sending…" : `${side === "buy" ? "Long" : "Short"} ${symbol.replace("-USD", "")}`}
        </button>

        <div className="mt-6 border-t border-[#5c5c5a] pt-4">
          <p className="label">Deposit from your wallet</p>
          <div className="mt-2 flex gap-2">
            <input type="number" min={25} value={depositAda} onChange={(e) => setDepositAda(Number(e.target.value))} className="num w-28 border border-[#5c5c5a] bg-transparent p-2" />
            <span className="num self-center text-[13px]">ADA</span>
            <button className="btn ghost ml-auto" style={{ color: "#ededeb", borderColor: "#ededeb" }} onClick={deposit} disabled={preview || busy}>
              Deposit
            </button>
          </div>
          <p className="mt-2 text-[12px] text-[#a3a3a0]">Strike swaps ADA to USDM and refunds the DEX fee. Withdrawals only ever go back to this wallet.</p>
        </div>

        {msg && (
          <p className="num mt-4 break-all text-[12px]" style={{ color: msg.kind === "ok" ? "#9fd3b8" : "#f3a08f" }}>
            {msg.text}
          </p>
        )}
      </aside>
    </div>
    </>
  );
}

/** Strike's own uPnL. Zero is plain ink; gains and losses carry a sign and a colour. */
function PnlCell({ value }: { value: number }) {
  const zero = Math.abs(value) < 0.005;
  return (
    <td className="text-right" style={{ color: zero ? "var(--ink-2)" : value > 0 ? "var(--gain)" : "var(--loss)" }}>
      {zero ? "$0.00" : `${value > 0 ? "▲ +" : "▼ −"}$${Math.abs(value).toFixed(2)}`}
    </td>
  );
}
