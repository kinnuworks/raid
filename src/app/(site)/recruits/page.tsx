import { Suspense } from "react";
import { connection } from "next/server";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { RECRUIT_RULES } from "@/lib/score";
import { seasonSnapshot } from "@/lib/season";
import { Provenance } from "@/components/Provenance";
import { Swatch } from "@/components/Swatch";
import { NextDayCountdown } from "@/components/Countdown";

const short = (id: string) => `…${id.slice(-6)}`;

async function RecruitsPageContent() {
  await connection();
  const s = await seasonSnapshot();
  const order = { confirmed: 0, pending: 1, flagged: 2, rejected: 3 } as const;
  const recruits = [...s.recruits].sort((a, b) => order[a.check.status] - order[b.check.status]);
  return (
    <main className="mx-auto max-w-[1300px] px-4 pb-24 pt-8 md:px-8">
      <p className="kicker">Season 1 · Strike {s.network} · live</p>
      <h1 className="display mt-2 text-[clamp(40px,6vw,76px)]">New traders who stayed</h1>
      <p className="mt-3 max-w-[70ch] text-[17px] text-ink-2">
        An army scores for a recruit only when a wallet that never traded on Strike joins through a member&apos;s link, deposits at least $
        {RECRUIT_RULES.minDepositUsd}, trades against someone outside every army, was not funded by a Raid member, and trades on {RECRUIT_RULES.minTradingDays}{" "}
        separate days. Each recruiter is credited for at most {RECRUIT_RULES.maxCreditedPerRecruiter}.
      </p>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-[var(--rule-strong)] py-3">
          <span className="label">Recruit board</span>
          {s.recruitBoard.length === 0 && <span className="text-ink-2">No recruits yet.</span>}
          {s.recruitBoard.map((r, i) => (
            <Link key={r.army} href={`/army/${r.army}`} className="flex items-baseline gap-2 hover:underline">
              <span className="num font-semibold">{i + 1}</span>
              <Swatch army={ARMY_BY_SLUG[r.army]} className="h-3.5 w-3.5 self-center" />
              <span className="display text-[22px]">{ARMY_BY_SLUG[r.army].ticker}</span>
              <span className="num text-[13px] text-ink-2">
                {r.confirmed} confirmed · {r.pending} waiting on day two · {r.flagged} flagged · {r.rejected} rejected · score {r.score.toFixed(3)}
              </span>
            </Link>
          ))}
          <span className="ml-auto text-[13px] text-ink-2">
            <NextDayCountdown />
          </span>
        </div>

        <table className="mt-2 w-full text-[14px]">
          <thead>
            <tr className="label text-left">
              <th className="w-[90px] py-2 font-medium">Account</th>
              <th className="w-[100px] font-medium">Army</th>
              <th className="w-[100px] pr-6 text-right font-medium">Deposit</th>
              <th className="w-[70px] font-medium">Days</th>
              <th className="pl-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {recruits.map((r) => (
              <tr key={r.account_id} className="rule-t align-top">
                <td className="num whitespace-nowrap py-3" title={r.account_id}>{short(r.account_id)}</td>
                <td className="py-3">
                  <span className="flex items-center gap-2">
                    <Swatch army={ARMY_BY_SLUG[r.army]} className="h-3.5 w-3.5" />
                    <span className="display text-[18px]">{ARMY_BY_SLUG[r.army]?.ticker}</span>
                  </span>
                </td>
                <td className="num py-3 pr-6 text-right">${r.depositedUsd.toFixed(2)}</td>
                <td className="py-3">
                  <span className="inline-flex gap-1.5" aria-label={`${r.check.tradingDays} of ${RECRUIT_RULES.minTradingDays} days`}>
                    {Array.from({ length: RECRUIT_RULES.minTradingDays }).map((_, i) => (
                      <span key={i} className="inline-block h-4 w-4 border-2 border-ink" style={{ background: i < r.check.tradingDays ? "var(--ink)" : "transparent" }} />
                    ))}
                  </span>
                </td>
                <td className="py-3 pl-2">
                  {r.check.status === "confirmed" && <span className="stamp text-[14px]">Confirmed</span>}
                  {r.check.status === "pending" && <span className="display text-[17px] text-ink-2">Waiting</span>}
                  {r.check.status === "flagged" && <span className="display text-[17px]">Flagged</span>}
                  {r.check.status === "rejected" && <span className="display text-[17px] line-through decoration-2">Rejected</span>}
                  {r.check.reasons.length > 0 && <p className="mt-1 text-[13px] text-ink-2">{r.check.reasons.join(" · ")}</p>}
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
