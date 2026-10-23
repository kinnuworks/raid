import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import season0 from "@/data/season0.json";
import { ARMIES, ARMY_BY_SLUG } from "@/lib/armies";
import { fmtInt, fmtSignedUsd, fmtUsd, plural } from "@/lib/format";
import { seasonSnapshot } from "@/lib/season";
import { Loading } from "@/components/Loading";
import { Swatch } from "@/components/Swatch";
import { WarMap } from "@/components/WarMap";
import { ShareButton } from "@/components/ShareButton";
import { EmbedSnippet } from "@/components/EmbedSnippet";

export function generateStaticParams() {
  return ARMIES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props: PageProps<"/army/[slug]">) {
  const { slug } = await props.params;
  const a = ARMY_BY_SLUG[slug];
  return a ? { title: `${a.ticker} army · Raid`, description: `Where the ${a.ticker} army stands on Strike, from public data.` } : {};
}

async function ArmyPageContent(props: PageProps<"/army/[slug]">) {
  await connection();
  const { slug } = await props.params;
  const army = ARMY_BY_SLUG[slug];
  if (!army) notFound();
  const s0 = season0.armies.find((a) => a.slug === slug)!;
  const held = season0.tiles.filter((t) => t.owner === slug);
  const contested = season0.tiles.filter((t) => t.runnerUp === slug);
  const foughtIn = season0.tiles.filter((t) => (t.traders as Record<string, number | undefined>)[slug]);
  const heldBy = (s: string) => season0.tiles.filter((t) => t.owner === s).length;
  const ranked = [...season0.armies]
    .filter((a) => !ARMY_BY_SLUG[a.slug].garrison)
    .sort((a, b) => heldBy(b.slug) - heldBy(a.slug) || b.volume7d - a.volume7d);
  const rank = ranked.findIndex((a) => a.slug === slug) + 1;

  const live = await seasonSnapshot();
  const liveMembers = live.members.filter((m) => m.army === slug);
  const board = live.recruitBoard.find((r) => r.army === slug);
  const fees = live.fees[slug];
  const liveHeld = live.tiles.filter((t) => t.owner === slug).map((t) => t.symbol.replace("-USD", ""));

  const facts: [string, string][] = [
    [fmtInt(s0.holders), "wallets on Strike hold the token"],
    [fmtInt(s0.members), `hold ${army.ticker} as their rarest army token`],
    [fmtInt(s0.traders7d), s0.traders7d === 1 ? "trader active this week" : "traders active this week"],
    [fmtUsd(s0.volume7d), "volume this week"],
    [fmtSignedUsd(s0.pnl), `net PnL all time, ${fmtInt(s0.inProfit)} of ${fmtInt(s0.traded)} in profit`],
  ];

  return (
    <main className="mx-auto max-w-[1300px] px-4 pb-24 pt-8 md:px-8">
      <p className="kicker">{army.garrison ? "Garrison" : `Army · ${rank} of ${ranked.length} by markets held this week`}</p>
      <div className="mt-2 flex items-center gap-4">
        <Swatch army={army} className="h-16 w-6 md:h-24 md:w-8" />
        <h1 className="display text-[clamp(64px,10vw,140px)]">{army.ticker}</h1>
      </div>

      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--rule-strong)] py-3">
        {facts.map(([v, k]) => (
          <div key={k} className="flex items-baseline gap-2">
            <dt className="num text-[20px] font-semibold">{v}</dt>
            <dd className="text-[14px] text-ink-2">{k}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10 grid gap-10 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="rule-b flex flex-wrap items-baseline justify-between gap-2 pb-2">
            <h2 className="display text-[28px]">Season 0 · Strike mainnet</h2>
            <span className="label">last {season0.windowDays} days, read-only</span>
          </div>
          {held.length === 0 && (
            <p className="mt-4 border-l-4 pl-4 text-[17px]" style={{ borderColor: army.ink }}>
              No ground held. {plural(foughtIn.length, "market")} where {army.ticker} traders fought this week
              {contested.length ? `, runner-up in ${contested.map((t) => t.symbol.replace("-USD", "")).join(", ")}` : ""}.
            </p>
          )}
          {held.length > 0 && (
            <p className="mt-4 border-l-4 pl-4 text-[17px]" style={{ borderColor: army.ink }}>
              Holds {held.map((t) => t.symbol.replace("-USD", "")).join(", ")}
              {contested.length ? `. Runner-up in ${contested.map((t) => t.symbol.replace("-USD", "")).join(", ")}` : ""}.
            </p>
          )}
          <div className="mt-4">
            <WarMap tiles={season0.tiles} highlight={slug} />
          </div>
        </div>

        <aside>
          <div className="rule-b flex items-baseline justify-between pb-2">
            <h2 className="display text-[28px]">Season 1 · live</h2>
            <span className="label">Strike {live.network}</span>
          </div>
          {live.network === "testnet" && (
            <p className="mt-2 text-[13px] text-ink-2">
              Testnet wallets can&apos;t hold the real {army.ticker}, so membership here is checked against t{army.ticker}, a labelled stand-in Raid minted on
              Cardano preprod. On mainnet the same check reads the real token.
            </p>
          )}
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-2 text-[15px]">
            <dt className="text-ink-2">Enlisted through Raid</dt>
            <dd className="num">{liveMembers.length}</dd>
            <dt className="text-ink-2">Confirmed recruits</dt>
            <dd className="num">{board?.confirmed ?? 0}</dd>
            <dt className="text-ink-2">Recruits waiting on day two</dt>
            <dd className="num">{board?.pending ?? 0}</dd>
            <dt className="text-ink-2">Flagged or rejected</dt>
            <dd className="num">{(board?.flagged ?? 0) + (board?.rejected ?? 0)}</dd>
            <dt className="text-ink-2">Testnet markets held</dt>
            <dd className="num">{liveHeld.length ? liveHeld.join(", ") : "none"}</dd>
            <dt className="text-ink-2">Builder fees from this army</dt>
            <dd className="num">
              <Link href="/proof" className="link">
                ${(fees?.builderFee ?? 0).toFixed(4)}
              </Link>
            </dd>
          </dl>
          <p className="mt-3 text-[13px] text-ink-2">
            Builder fees are paid to Raid&apos;s builder account by Strike on every fill. At the end of the season each army&apos;s share goes to the
            treasury wallet its community names, and every payout will be listed on the Proof of Fees page.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/join" className="btn">
              Enlist in {army.ticker}
            </Link>
            <ShareButton army={army.slug} text={`${army.ticker} on Raid: ${plural(held.length, "market")} held on Strike this week, ${plural(s0.traders7d, "trader")} in the field. Come take ground.`} />
          </div>
          <EmbedSnippet army={army.slug} />
          <p className="mt-6 text-[13px] text-ink-3">
            Net PnL is shown as it is, losses included. It never affects the score: armies rank on traders who pay fees to outsiders and on new traders who stay.
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
