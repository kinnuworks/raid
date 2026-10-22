import { Suspense } from "react";
import { connection } from "next/server";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import season0 from "@/data/season0.json";
import { ARMIES, ARMY_BY_SLUG } from "@/lib/armies";
import { fmtInt, fmtSignedUsd, fmtUsd } from "@/lib/format";
import { liveSeason } from "@/lib/season";
import { WarMap } from "@/components/WarMap";

export function generateStaticParams() {
  return ARMIES.map((a) => ({ slug: a.slug }));
}

async function ArmyPageContent(props: PageProps<"/army/[slug]">) {
  await connection();
  const { slug } = await props.params;
  const army = ARMY_BY_SLUG[slug];
  if (!army) notFound();
  const s0 = season0.armies.find((a) => a.slug === slug)!;
  const held = season0.tiles.filter((t) => t.owner === slug);
  const contested = season0.tiles.filter((t) => t.runnerUp === slug);
  const live = await liveSeason();
  const liveMembers = live.members.filter((m) => m.army === slug);
  const board = live.recruitBoard.find((r) => r.army === slug);
  const fees = live.fees[slug];
  const rank = [...season0.armies].sort((a, b) => b.volume - a.volume).findIndex((a) => a.slug === slug) + 1;

  return (
    <main className="mx-auto max-w-[1300px] px-4 pb-24 pt-8 md:px-8">
      <div className="flex items-start gap-5">
        <span className="mt-2 h-20 w-4 shrink-0" style={{ background: army.ink }} aria-hidden />
        <div>
          <p className="label">Army · rank {rank} of {season0.armies.length} by volume</p>
          <h1 className="display text-[clamp(56px,9vw,120px)]">{army.ticker}</h1>
          <p className="max-w-[60ch] text-[17px] text-ink-2">
            Holders of the {army.name} token who trade on Strike. Membership is read from the chain, never self-declared.
          </p>
        </div>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-px border-2 border-ink bg-ink md:grid-cols-5">
        {[
          ["Holders on Strike", fmtInt(s0.holders), "hold the token, any army"],
          ["Fight for " + army.ticker, fmtInt(s0.members), `${fmtInt(s0.traded)} have traded`],
          ["Volume", fmtUsd(s0.volume), "all time"],
          ["Net PnL", fmtSignedUsd(s0.pnl), `${fmtInt(s0.inProfit)} of ${fmtInt(s0.traded)} in profit`],
          ["Markets held", `${held.length}`, `${contested.length} more as runner-up`],
        ].map(([k, v, sub]) => (
          <div key={k} className="bg-[var(--paper)] p-4">
            <p className="label">{k}</p>
            <p className="num mt-1 text-[28px] font-semibold" style={k === "Net PnL" ? { color: s0.pnl >= 0 ? "var(--gain)" : "var(--loss)" } : undefined}>
              {v}
            </p>
            <p className="text-[12px] text-ink-3">{sub}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="rule-b flex items-baseline justify-between pb-2">
            <h2 className="display text-[26px]">Where {army.ticker} holds ground</h2>
            <span className="label">Season 0 · last {season0.windowDays} days</span>
          </div>
          <div className="mt-4">
            <WarMap tiles={season0.tiles} highlight={slug} />
          </div>
        </div>
        <aside>
          <div className="rule-b pb-2">
            <h2 className="display text-[26px]">Season 1 · live</h2>
            <p className="label">Strike {live.network}</p>
          </div>
          <dl className="num mt-2 grid grid-cols-[1fr_auto] gap-y-2 text-[15px]">
            <dt className="text-ink-2">Enlisted</dt>
            <dd>{liveMembers.length}</dd>
            <dt className="text-ink-2">Confirmed recruits</dt>
            <dd>{board?.confirmed ?? 0}</dd>
            <dt className="text-ink-2">Pending recruits</dt>
            <dd>{board?.pending ?? 0}</dd>
            <dt className="text-ink-2">Treasury share (builder fees)</dt>
            <dd>${(fees?.builderFee ?? 0).toFixed(4)}</dd>
            <dt className="text-ink-2">Markets held</dt>
            <dd>{live.tiles.filter((t) => t.owner === slug).length} of {live.tiles.length}</dd>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/join" className="btn">
              Enlist in {army.ticker}
            </Link>
            <Link href="/proof" className="btn ghost">
              Audit the fees
            </Link>
          </div>
          <p className="mt-6 text-[12px] text-ink-3">
            Net PnL is shown as it is, including losses. It never affects the score: armies are ranked on new traders and fees paid to outsiders.
          </p>
        </aside>
      </section>
    </main>
  );
}

export default function ArmyPage(props: PageProps<"/army/[slug]">) {
  return (
    <Suspense fallback={<Loading text="Reading the army's ground…" />}>
      <ArmyPageContent {...props} />
    </Suspense>
  );
}
