import { readFile } from "node:fs/promises";
import path from "node:path";
import season0 from "@/data/season0.json";
import { ARMY_BY_SLUG } from "@/lib/armies";

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = path.join(process.cwd(), "src/app/fonts");
  const [display, mono, text] = await Promise.all([
    readFile(path.join(dir, "BigShoulders-Black.ttf")),
    readFile(path.join(dir, "PlexMono-SemiBold.ttf")),
    readFile(path.join(dir, "Schibsted-400.ttf")),
  ]);
  return [
    { name: "Display", data: display, weight: 900 as const, style: "normal" as const },
    { name: "Mono", data: mono, weight: 600 as const, style: "normal" as const },
    { name: "Text", data: text, weight: 400 as const, style: "normal" as const },
  ];
}

const PAPER = "#EDE6D6";
const INK = "#1B1A17";

/** The ground community armies hold, at a size that still reads in an X thumbnail. */
export function MiniBoard({ highlight }: { highlight?: string }) {
  const held = season0.tiles.filter((t) => t.owner && !ARMY_BY_SLUG[t.owner].garrison);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", fontFamily: "Mono", fontSize: 16, color: "#4A4639" }}>{`Community ground: ${held.length} of ${season0.tiles.length} markets`}</div>
      <div style={{ display: "flex", flexWrap: "wrap", width: 440, gap: 8 }}>
        {held.map((t) => {
          const a = ARMY_BY_SLUG[t.owner!];
          const on = !highlight || t.owner === highlight;
          return (
            <div
              key={t.symbol}
              style={{
                width: 80,
                height: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${INK}`,
                background: a.ink,
                opacity: on ? 1 : 0.35,
                color: PAPER,
              }}
            >
              <div style={{ display: "flex", fontFamily: "Mono", fontSize: 14 }}>{t.symbol.replace("-USD", "")}</div>
              <div style={{ display: "flex", fontFamily: "Display", fontSize: 18 }}>{a.code}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CardFrame({ children, footer }: { children: React.ReactNode; footer: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAPER, color: INK, padding: "48px 60px", fontFamily: "Text" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width="34" height="34" viewBox="0 0 30 30">
          <rect x="1" y="1" width="28" height="28" fill={INK} />
          <path d="M9 23V7l12 4.5L11 16" fill="none" stroke={PAPER} strokeWidth="2.6" />
        </svg>
        <div style={{ fontFamily: "Display", fontSize: 38, letterSpacing: 1 }}>RAID</div>
        <div style={{ marginLeft: "auto", fontFamily: "Mono", fontSize: 18, color: "#4A4639" }}>token armies on Strike</div>
      </div>
      <div style={{ display: "flex", flex: 1, marginTop: 28, marginBottom: 18 }}>{children}</div>
      <div style={{ display: "flex", borderTop: `2px solid ${INK}`, paddingTop: 14, fontFamily: "Mono", fontSize: 20, color: "#4A4639" }}>{footer}</div>
    </div>
  );
}
