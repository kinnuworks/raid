import Link from "next/link";
import season0 from "@/data/season0.json";
import { ARMIES, ARMY_BY_SLUG } from "@/lib/armies";
import { fmtInt, fmtUsd, plural } from "@/lib/format";
import { Provenance } from "@/components/Provenance";
import { Replay } from "@/components/Replay";
import { Swatch } from "@/components/Swatch";
import { LiveStrip } from "@/components/LiveStrip";

export default function Home() {
  const tiles = season0.tiles;
  const held = new Map<string, number>();
  for (const t of tiles) if (t.owner) held.set(t.owner, (held.get(t.owner) ?? 0) + 1);
  const garrisonHeld = held.get("strike") ?? 0;
  const communityHeld = tiles.length - garrisonHeld - tiles.filter((t) => !t.owner).length;

  const armies = [...season0.armies]
    .filter((a) => !ARMY_BY_SLUG[a.slug].garrison)
    .sort((a, b) => (held.get(b.slug) ?? 0) - (held.get(a.slug) ?? 0) || b.volume7d - a.volume7d);
  const garrison = season0.armies.find((a) => ARMY_BY_SLUG[a.slug].garrison)!;
  const snek = season0.armies.find((a) => a.slug === "snek")!;
  const topCommunity = [...held.entries()].filter(([s]) => !ARMY_BY_SLUG[s].garrison).sort((a, b) => b[1] - a[1])[0];

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-24 md:px-8">
      <section className="grid gap-8 pt-8 lg:grid-cols-[1fr_380px] lg:pt-12">
        <div>
          <p className="kicker">
            Season 0 · computed from Strike mainnet public data, last {season0.windowDays} days, {tiles.length} markets listed today
          </p>
          <h1 className="display mt-3 text-[clamp(40px,7vw,96px)]">
            <span className="block max-w-[15ch]">Your token is your army.</span>
            <span className="block max-w-[15ch]">Take Strike&apos;s markets.</span>
          </h1>
          <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-2">
            Raid turns Cardano communities (SNEK, HOSKY, NIGHT and eleven more) into trading armies on Strike. Hold the token, enlist with one
            signature, and claim markets by bringing traders who pay real fees. Wash trades and self-funded recruits never score, and you can check
            every fee yourself.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/join" className="btn">
              Enlist your wallet
            </Link>
            <Link href="/rules" className="btn ghost">
              How a market is claimed
            </Link>
          </div>
          <ul className="mt-4 flex flex-col gap-1 text-[13px] text-ink-2 sm:flex-row sm:gap-0 sm:[&>li+li]:before:mx-3 sm:[&>li+li]:before:content-['·']">
            <li>Live on Strike testnet</li>
            <li>No wallet needed to look around</li>
            <li>Your trading key never leaves your browser</li>
          </ul>
        </div>

        <aside className="self-end border-l-4 border-ink pl-5">
          <p className="label">Dispatch from the front</p>
          <p className="display mt-2 text-[34px]">
            The garrison holds {garrisonHeld}&nbsp;of&nbsp;{tiles.length}. Your&nbsp;move.
          </p>
          <p className="mt-3 text-[15px] text-ink-2">
            Community armies hold {communityHeld}
            {topCommunity ? `, led by ${ARMY_BY_SLUG[topCommunity[0]].ticker} with ${plural(topCommunity[1], "market")}` : ""}.{" "}
            {fmtInt(snek.holders)} wallets on Strike hold SNEK; the Snek army holds {plural(held.get("snek") ?? 0, "market")}.
          </p>
          <Link href="/army/snek" className="link mt-3 inline-block text-[15px] font-semibold">
            The Snek army needs ground
          </Link>
          <p className="mt-4 border-t border-[var(--rule)] pt-3 text-[13px] text-ink-2">
            Spoils: each army&apos;s share of builder fees goes to its community treasury at season end, and the army holding the most markets flies its
            banner over next season&apos;s map.
          </p>
        </aside>
      </section>

      <LiveStrip />

      <section className="mt-10 grid gap-10 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="rule-b flex flex-wrap items-baseline justify-between gap-2 pb-2">
            <h2 className="display text-[30px]">The board</h2>
            <span className="label">A market goes to the army whose traders paid the most fees there this week</span>
          </div>
          <div className="mt-4">
            <Replay final={tiles} days={season0.days} generatedAt={season0.generatedAt} />
          </div>
          <Legend />
        </div>

        <section aria-label="Armies">
          <div className="rule-b flex items-baseline justify-between pb-2">
            <h2 className="display text-[30px]">Armies</h2>
            <span className="label">markets held, then volume</span>
          </div>
          <table className="w-full text-[14px]">
            <thead className="sr-only">
              <tr>
                <th>Rank</th>
                <th>Army</th>
                <th>Markets held and volume, 7 days</th>
              </tr>
            </thead>
            <tbody>
              {armies.map((a, i) => {
                const army = ARMY_BY_SLUG[a.slug];
                const above = armies[i - 1];
                return (
                  <tr key={a.slug} className="rule-b">
                    <td className="num w-8 py-2 pr-2 text-right align-top text-[15px] font-semibold">{i + 1}</td>
                    <td className="py-2 align-top">
                      <Link href={`/army/${a.slug}`} className="flex items-start gap-2.5 hover:underline">
                        <Swatch army={army} className="mt-1 h-5 w-3" />
                        <span>
                          <span className="display block text-[22px]">{army.ticker}</span>
                          <span className="block text-[12px] text-ink-2">
                            {plural(a.traders7d, "trader")} this week · {fmtInt(a.holders)} holders
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="num py-2 text-right align-top">
                      <span className="block text-[15px] font-semibold">{plural(held.get(a.slug) ?? 0, "market")}</span>
                      <span className="block text-[12px] text-ink-2">{fmtUsd(a.volume7d)} volume</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 flex items-start gap-2.5 text-[13px] text-ink-2">
            <Swatch army={ARMY_BY_SLUG.strike} className="mt-0.5 h-5 w-3" />
            <span>
              Garrison: wallets that hold only STRIKE. {plural(garrison.traders7d, "trader")}, {fmtUsd(garrison.volume7d)} this week, holding{" "}
              {plural(garrisonHeld, "market")}. Shown in grey so the community race stays readable.
            </span>
          </p>
        </section>
      </section>

      <Worth armies={season0.armies.filter((a) => !ARMY_BY_SLUG[a.slug].garrison)} />

      <Faq />

      <Provenance
        className="mt-14"
        generatedAt={season0.generatedAt}
        rows={[
          ["Leaderboard", season0.sources.leaderboard],
          ["Holdings", season0.sources.holdings],
          ["Fills", season0.sources.fills],
          ["24h volume", season0.sources.volume],
        ]}
        footnote={`${fmtInt(season0.totals.leaderboardAccounts)} accounts read, ${fmtInt(season0.totals.resolvedStakeKeys)} Cardano stake keys resolved, ${fmtInt(
          season0.totals.armyMembers,
        )} wallets hold an army token, ${fmtInt(season0.totals.fillsScanned)} fills scanned, ${fmtInt(season0.totals.internalFillsDropped)} dropped as trades between army members.`}
      />
    </main>
  );
}

function Legend() {
  const sample = ARMIES.filter((a) => ["snek", "indy", "fren"].includes(a.slug));
  return (
    <dl className="mt-5 grid gap-x-8 gap-y-2 text-[13px] text-ink-2 sm:grid-cols-2">
      <div className="flex items-center gap-2">
        <dt className="flex gap-1">
          {sample.map((a) => (
            <Swatch key={a.slug} army={a} />
          ))}
        </dt>
        <dd>Each army has its own ink and pattern</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="flex flex-col items-center border border-ink bg-[var(--vermilion)] px-1.5 leading-tight text-[var(--paper)]">
          <span className="display text-[12px]">IAG</span>
          <span className="num text-[10px] font-semibold">3</span>
        </dt>
        <dd>Counter: the army holding the market, and how many of its traders paid fees there this week</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="flex items-end gap-[3px]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="inline-block h-[5px] w-[3px] bg-ink" />
          ))}
        </dt>
        <dd>Ticks over a counter: quiet market, low 24h volume</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="inline-block h-4 w-4 border border-ink" style={{ background: "repeating-linear-gradient(45deg,var(--field) 0 4px,var(--ochre) 4px 8px)" }} />
        <dd>Two inks striped: contested, lead under 15%</dd>
      </div>
    </dl>
  );
}

const FAQ: [string, string][] = [
  [
    "Is this real money?",
    "Not yet. Season 0 reads Strike's real mainnet data, but every trade, deposit and fee in Season 1 runs on Strike testnet, which uses test funds. Mainnet is a single setting in the code; the team runs on testnet because it is based in a country on Strike's restricted list, with Strike's permission.",
  ],
  [
    "Can an army farm the board?",
    "Trading between Raid accounts never counts, in the same army or across armies, because both sides of a Strike trade share a public trade_id. A recruit funded by any member is rejected. Each member's weight is the square root of the fees they paid, so splitting one wallet into many costs more than it earns.",
  ],
  [
    "Who gets the fees?",
    "Orders that take liquidity carry a 0.1% builder fee on top of Strike's own fee. Strike pays it to Raid's builder account on every fill. Each army's share is tracked on the Proof of Fees page, where you can recompute it from Strike's data in your browser.",
  ],
  [
    "Why is STRIKE grey on the map?",
    "Wallets that hold only the STRIKE token are Strike's home crowd, and they trade the most. Shown in full colour they would cover the board, so they appear as a grey garrison and the community armies stay readable.",
  ],
  [
    "Can Raid move my funds?",
    "No. Your trading key is created in your browser and can't be exported, and Strike's API keys can trade but cannot withdraw. Withdrawals always go back to the wallet you enlisted with and need that wallet's signature.",
  ],
  [
    "How is my army decided?",
    "When you enlist, by you: Raid reads the tokens your wallet holds and you pick one of those armies for the season. The Season 0 map has no enlistments, so there each wallet is placed in its rarest army token, the clearest sign of which community it belongs to.",
  ],
];

function Faq() {
  return (
    <section className="mt-16 max-w-[860px]" aria-labelledby="faq">
      <h2 id="faq" className="display rule-b pb-2 text-[30px]">
        Before you enlist
      </h2>
      {FAQ.map(([q, a]) => (
        <details key={q} className="rule-b group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-6 py-3 text-[17px] font-semibold">
            {q}
            <span aria-hidden className="num text-[20px] text-ink-2 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="max-w-[68ch] pb-4 text-[15px] leading-relaxed text-ink-2">{a}</p>
        </details>
      ))}
    </section>
  );
}

/** What these armies' real mainnet trading would be worth through Raid, at the same 10 bps builder fee. */
function Worth({ armies }: { armies: { slug: string; volume7d: number; traders7d: number; members: number }[] }) {
  const volume = armies.reduce((s, a) => s + a.volume7d, 0);
  const traders = armies.reduce((s, a) => s + a.traders7d, 0);
  // Each wallet is counted once, in the army of its rarest token.
  const holders = armies.reduce((s, a) => s + a.members, 0);
  const builderWeek = (volume * 10) / 1e4;
  return (
    <section className="mt-16 grid gap-6 border-y-2 border-ink py-6 md:grid-cols-[1fr_2fr]" aria-labelledby="worth">
      <h2 id="worth" className="display text-[30px]">
        What the armies are worth to Strike
      </h2>
      <div>
        <dl className="grid grid-cols-1 gap-y-2 text-[15px] sm:grid-cols-[1fr_auto]">
          <dt className="text-ink-2">Mainnet volume from community-army traders, last 7 days</dt>
          <dd className="num text-right font-semibold">{fmtUsd(volume)}</dd>
          <dt className="text-ink-2">Traders behind it</dt>
          <dd className="num text-right font-semibold">{fmtInt(traders)}</dd>
          <dt className="text-ink-2">Builder fees at 10 bps if that volume came through Raid, per week</dt>
          <dd className="num text-right font-semibold">{fmtUsd(builderWeek)}</dd>
          <dt className="text-ink-2">Strike wallets that hold a community army token, each counted once</dt>
          <dd className="num text-right font-semibold">{fmtInt(holders)}</dd>
        </dl>
        <p className="mt-3 max-w-[70ch] text-[13px] text-ink-2">
          Computed from Season 0&apos;s mainnet fills. The testnet season&apos;s fees are small because they come from ten test wallets; these are the
          same armies&apos; real numbers on mainnet, before Raid recruits a single new trader.
        </p>
      </div>
    </section>
  );
}
