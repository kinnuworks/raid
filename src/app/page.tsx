import Link from "next/link";
import season0 from "@/data/season0.json";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { fmtInt, fmtUsd } from "@/lib/format";
import { Tower } from "@/components/Tower";
import { WarMap } from "@/components/WarMap";
import { Provenance } from "@/components/Provenance";

export default function Home() {
  const tiles = season0.tiles;
  const held = new Map<string, number>();
  for (const t of tiles) if (t.owner) held.set(t.owner, (held.get(t.owner) ?? 0) + 1);

  const byVolume = [...season0.armies].sort((a, b) => b.volume - a.volume);
  const towerRows = byVolume.map((a) => ({
    slug: a.slug,
    primary: a.volume,
    primaryLabel: "volume, all time",
    secondary: `${fmtInt(a.holders)} holders · ${fmtInt(a.members)} fight here · ${held.get(a.slug) ?? 0} tiles`,
  }));

  const snek = season0.armies.find((a) => a.slug === "snek")!;
  const leaderTiles = [...held.entries()].sort((a, b) => b[1] - a[1])[0];
  const leaderArmy = leaderTiles ? ARMY_BY_SLUG[leaderTiles[0]] : undefined;

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-24 md:px-8">
      <section className="grid gap-8 pt-8 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="label">Season 0 · Strike mainnet · last {season0.windowDays} days</p>
          <h1 className="display mt-2 max-w-[18ch] text-[clamp(44px,7vw,92px)]">
            {leaderArmy ? `${leaderArmy.ticker === "STRIKE" ? "The home army" : leaderArmy.ticker} holds ${leaderTiles![1]} of ${tiles.length} markets` : `${tiles.length} markets, no owner yet`}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[17px] text-ink-2">
            {fmtInt(season0.totals.armyMembers)} of Strike&apos;s traders already hold a community token. Raid groups them into armies and
            maps who trades where. Armies claim a market by bringing it traders who pay real fees, never by trading with each other.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/join" className="btn">
              Enlist your wallet
            </Link>
            <Link href="/rules" className="btn ghost">
              How a market is claimed
            </Link>
          </div>
        </div>
        <aside className="self-end border-2 border-ink p-4">
          <p className="label">Dispatch</p>
          <p className="display mt-1 text-[30px]">{fmtInt(snek.holders)} SNEK holders already trade on Strike</p>
          <p className="num mt-2 text-[14px] text-ink-2">
            {fmtInt(snek.members)} fight for SNEK · {held.get("snek") ?? 0} markets held
          </p>
          <Link href="/army/snek" className="link mt-3 inline-block text-[14px] font-semibold">
            The Snek army needs ground →
          </Link>
        </aside>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex items-baseline justify-between rule-b pb-2">
            <h2 className="display text-[26px]">The board</h2>
            <span className="label">Pips = frontier weight, up to 3x on quiet markets</span>
          </div>
          <div className="mt-4">
            <WarMap tiles={tiles} />
          </div>
          <Legend />
        </div>
        <Tower rows={towerRows} unit="usd" title="Armies" note="volume of members, all time" />
      </section>

      <Provenance
        className="mt-12"
        generatedAt={season0.generatedAt}
        rows={[
          ["Leaderboard", season0.sources.leaderboard],
          ["Holdings", season0.sources.holdings],
          ["Fills", season0.sources.fills],
          ["24h volume", season0.sources.volume],
        ]}
        footnote={`${fmtInt(season0.totals.leaderboardAccounts)} accounts read, ${fmtInt(season0.totals.resolvedStakeKeys)} Cardano stake keys resolved, ${fmtInt(
          season0.totals.fillsScanned,
        )} fills scanned, ${fmtInt(season0.totals.internalFillsDropped)} fills dropped as trades between army members.`}
      />
    </main>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-2">
      <span className="flex items-center gap-2">
        <span className="inline-block h-4 w-4 border-2 border-ink" style={{ background: "var(--field)" }} /> Held
      </span>
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-4 border-2 border-ink"
          style={{ background: "repeating-linear-gradient(45deg,var(--field) 0 4px,var(--ochre) 4px 8px)" }}
        />
        Contested: lead under 15%
      </span>
      <span className="flex items-center gap-2">
        <span className="inline-block h-4 w-4 border border-dashed border-ink bg-[var(--paper-2)]" /> Unclaimed
      </span>
    </div>
  );
}
