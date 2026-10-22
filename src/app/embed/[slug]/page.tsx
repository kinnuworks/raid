import Link from "next/link";
import { notFound } from "next/navigation";
import season0 from "@/data/season0.json";
import { ARMIES, ARMY_BY_SLUG } from "@/lib/armies";
import { fmtInt, fmtUsd, plural } from "@/lib/format";
import { Swatch } from "@/components/Swatch";
import { WarMap } from "@/components/WarMap";

export function generateStaticParams() {
  return ARMIES.map((a) => ({ slug: a.slug }));
}

/** The army card a community embeds on its own site. Enlisting opens Raid in a new tab, so wallet keys never live in the host page. */
export default async function EmbedArmy(props: PageProps<"/embed/[slug]">) {
  const { slug } = await props.params;
  const army = ARMY_BY_SLUG[slug];
  if (!army) notFound();
  const s = season0.armies.find((a) => a.slug === slug)!;
  const held = season0.tiles.filter((t) => t.owner === slug);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return (
    <main className="min-h-dvh p-4">
      <div className="flex items-center gap-3">
        <Swatch army={army} className="h-12 w-4" />
        <div>
          <p className="kicker">Raid · Strike perps</p>
          <p className="display text-[44px]">{army.ticker} army</p>
        </div>
      </div>
      <p className="mt-2 text-[15px]">
        {held.length ? `Holds ${held.map((t) => t.symbol.replace("-USD", "")).join(", ")}` : "Holds no ground yet"} ·{" "}
        <span className="num">{plural(s.traders7d, "trader")}</span> this week · <span className="num">{fmtUsd(s.volume7d)}</span> volume ·{" "}
        <span className="num">{fmtInt(s.holders)}</span> holders on Strike
      </p>
      <div className="mt-3">
        <WarMap tiles={season0.tiles} highlight={held.length ? slug : undefined} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={`${site}/join`} target="_blank" rel="noopener" className="btn">
          Enlist in {army.ticker}
        </Link>
        <Link href={`${site}/army/${slug}`} target="_blank" rel="noopener" className="link text-[14px]">
          Full army page
        </Link>
        <span className="num ml-auto text-[11px] text-ink-3">Season 0 · Strike mainnet · {season0.generatedAt.slice(0, 10)}</span>
      </div>
    </main>
  );
}
