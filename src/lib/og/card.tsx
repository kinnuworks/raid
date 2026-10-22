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

/** A strip of every market as a small square, inked by its owner: the board at thumbnail size. */
export function MiniBoard({ highlight }: { highlight?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: 444, gap: 6, marginBottom: 8 }}>
      {season0.tiles.map((t) => {
        const a = t.owner ? ARMY_BY_SLUG[t.owner] : undefined;
        const on = !highlight || t.owner === highlight;
        return (
          <div
            key={t.symbol}
            style={{
              width: 58,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${INK}`,
              background: a ? (a.garrison ? "#E2D9C4" : a.ink) : PAPER,
              opacity: on ? 1 : 0.25,
              color: a && !a.garrison ? PAPER : INK,
              fontFamily: "Mono",
              fontSize: t.symbol.length > 10 ? 9 : 11,
            }}
          >
            {t.symbol.replace("-USD", "")}
          </div>
        );
      })}
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
      <div style={{ display: "flex", borderTop: `2px solid ${INK}`, paddingTop: 14, fontFamily: "Mono", fontSize: 17, color: "#4A4639" }}>{footer}</div>
    </div>
  );
}
