import { Suspense } from "react";
import { connection } from "next/server";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { RECRUIT_RULES } from "@/lib/score";
import { liveSeason } from "@/lib/season";
import { Provenance } from "@/components/Provenance";

const short = (id: string) => `${id.slice(0, 8)}…${id.slice(-4)}`;

async function RecruitsPageContent() {
  await connection();
  const s = await liveSeason();
  const order = { confirmed: 0, pending: 1, rejected: 2 } as const;
  const recruits = [...s.recruits].sort((a, b) => order[a.check.status] - order[b.check.status]);
  return (
    <main className="mx-auto max-w-[1300px] px-4 pb-24 pt-8 md:px-8">
      <p className="label">Season 1 · Strike {s.network} · live</p>
      <h1 className="display mt-2 text-[clamp(40px,6vw,76px)]">New traders who stayed</h1>
      <p className="mt-3 max-w-[70ch] text-[17px] text-ink-2">
        An army scores for a recruit only when a wallet that never traded on Strike joins through a member&apos;s link, deposits at least $
        {RECRUIT_RULES.minDepositUsd}, trades against someone outside every army, was not funded by a Raid member, and trades on {RECRUIT_RULES.minTradingDays}{" "}
        separate days. Each recruiter is credited for at most {RECRUIT_RULES.maxCreditedPerRecruiter}.
      </p>

      <section className="mt-8 grid gap-10 lg:grid-cols-[380px_1fr]">
        <div>
          <div className="rule-b flex items-baseline justify-between pb-2">
            <h2 className="display text-[26px]">Recruit board</h2>
            <span className="label">√ fees from confirmed recruits</span>
          </div>
          {s.recruitBoard.length === 0 && <p className="py-6 text-ink-2">No recruits yet. Every member has a link on their army page.</p>}
          <ol>
            {s.recruitBoard.map((r, i) => {
              const a = ARMY_BY_SLUG[r.army];
              return (
                <li key={r.army} className="rule-b grid grid-cols-[30px_8px_1fr_auto] items-center gap-3 py-2">
                  <span className="num text-right font-semibold">{i + 1}</span>
                  <span className="h-8 w-2" style={{ background: a.ink }} />
                  <span>
                    <Link href={`/army/${r.army}`} className="display text-[22px]">
                      {a.ticker}
                    </Link>
                    <span className="num block text-[12px] text-ink-2">
                      {r.confirmed} confirmed · {r.pending} pending · {r.rejected} rejected
                    </span>
                  </span>
                  <span className="num text-[16px] font-semibold">{r.score.toFixed(3)}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div>
          <div className="rule-b flex items-baseline justify-between pb-2">
            <h2 className="display text-[26px]">Every recruit, checked</h2>
            <span className="label">recomputed {new Date(s.computedAt).toISOString().slice(11, 19)} UTC</span>
          </div>
          <table className="mt-1 w-full text-[14px]">
            <thead>
              <tr className="label text-left">
                <th className="py-2">Account</th>
                <th>Army</th>
                <th className="text-right">Deposit</th>
                <th className="text-center">Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recruits.map((r) => (
                <tr key={r.account_id} className="rule-t align-top">
                  <td className="num py-2.5">{short(r.account_id)}</td>
                  <td className="display text-[18px]">{ARMY_BY_SLUG[r.army]?.ticker}</td>
                  <td className="num text-right">${r.depositedUsd.toFixed(2)}</td>
                  <td className="text-center">
                    <span className="num inline-flex gap-1" aria-label={`${r.check.tradingDays} of ${RECRUIT_RULES.minTradingDays} days`}>
                      {Array.from({ length: RECRUIT_RULES.minTradingDays }).map((_, i) => (
                        <span key={i} className="inline-block h-3 w-3 border border-ink" style={{ background: i < r.check.tradingDays ? "var(--ink)" : "transparent" }} />
                      ))}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`stamp text-[14px] ${r.check.status === "rejected" ? "reject" : ""}`} style={r.check.status === "pending" ? { borderColor: "var(--ink-3)", color: "var(--ink-2)", transform: "none" } : undefined}>
                      {r.check.status}
                    </span>
                    {r.check.reasons.length > 0 && <p className="mt-1 text-[12px] text-ink-2">{r.check.reasons.join(" · ")}</p>}
                  </td>
                </tr>
              ))}
              {recruits.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-ink-2">
                    Nobody has joined through a recruit link yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <Provenance className="mt-12" generatedAt={s.computedAt} rows={Object.entries(s.sources)} footnote={`${s.internalFillsDropped} fills dropped as trades between Raid accounts.`} />
    </main>
  );
}

export default function RecruitsPage() {
  return (
    <Suspense fallback={<Loading text="Checking every recruit against Strike and the chain…" />}>
      <RecruitsPageContent  />
    </Suspense>
  );
}
