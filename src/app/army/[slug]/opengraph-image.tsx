import { ImageResponse } from "next/og";
import season0 from "@/data/season0.json";
import { ARMIES, ARMY_BY_SLUG } from "@/lib/armies";
import { CardFrame, MiniBoard, OG_SIZE, ogFonts } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Where this army stands on Strike";

export function generateStaticParams() {
  return ARMIES.map((a) => ({ slug: a.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ARMY_BY_SLUG[slug] ?? ARMY_BY_SLUG.snek;
  const s = season0.armies.find((x) => x.slug === a.slug)!;
  const held = season0.tiles.filter((t) => t.owner === a.slug).length;
  return new ImageResponse(
    (
      <CardFrame footer={`Season 0 · read from Strike mainnet ${season0.generatedAt.slice(0, 10)} · every number checks against public data`}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 26, height: 150, background: a.garrison ? "#B9AE97" : a.ink, border: "2px solid #1B1A17" }} />
            <div style={{ fontFamily: "Display", fontSize: 168, lineHeight: 0.9 }}>{a.ticker}</div>
          </div>
          <div style={{ fontFamily: "Display", fontSize: 54, marginTop: 22, lineHeight: 1 }}>
            {held === 0 ? `Holds no ground yet` : `Holds ${held} of ${season0.tiles.length} markets`}
          </div>
          <div style={{ fontFamily: "Mono", fontSize: 24, marginTop: 16, color: "#4A4639" }}>
            {`${s.holders} holders on Strike · ${s.traders7d} traders this week`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <MiniBoard highlight={a.slug} />
        </div>
      </CardFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
