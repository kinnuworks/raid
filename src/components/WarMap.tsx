import { ARMY_BY_SLUG, type Army } from "@/lib/armies";

export interface MapTile {
  symbol: string;
  weight: number;
  owner: string | null;
  runnerUp: string | null;
  margin: number;
  traders?: Record<string, number | undefined>;
  volume24h?: number;
  strength?: number;
}

/**
 * The board: flat-top hexes in authored regions, like a printed wargame map.
 * Tiles share edges; a region's outline is every edge it doesn't share with itself.
 */
const R = 42; // hex radius
const W = R * 2;
const H = Math.sqrt(3) * R;

interface Region {
  code: string;
  name: string;
  col: number;
  row: number;
  cols: number;
  symbols: string[];
}

const REGIONS: Region[] = [
  { code: "A", name: "Crypto heartland", col: 0, row: 0, cols: 4, symbols: ["BTC", "ETH", "SOL", "ADA", "HYPE", "XRP", "BNB", "NEAR", "ZEC", "PUMP", "NIGHT", "DOGE", "LIT"] },
  { code: "B", name: "US equities", col: 0, row: 4.8, cols: 4, symbols: ["NVDA", "TSLA", "GOOGL", "COIN", "CRCL", "MU", "SNDK", "AAOI"] },
  { code: "C", name: "Pre-IPO frontier", col: 5, row: 0, cols: 3, symbols: ["SPCX", "UNITREE", "MINIMAX", "ZHIPU", "CXMT", "SKHYNIX", "DRAM"] },
  { code: "D", name: "Commodities & indices", col: 5, row: 4.1, cols: 3, symbols: ["XAU", "XAG", "WTI", "SP500", "NAS100"] },
];

const base = (sym: string) => sym.replace(/-USD$/, "");

function center(col: number, row: number) {
  return { x: R + col * 1.5 * R, y: H / 2 + row * H + (Math.round(col) % 2 ? H / 2 : 0) };
}

function hexPoints(cx: number, cy: number, r = R) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    // Rounded so server and browser print identical coordinates (their trig differs in the last digits).
    return [Math.round((cx + r * Math.cos(a)) * 100) / 100, Math.round((cy + r * Math.sin(a)) * 100) / 100] as [number, number];
  });
}

interface Placed {
  tile: MapTile;
  cx: number;
  cy: number;
  region: string;
  index: number;
}

function layout(tiles: MapTile[], mode: "wide" | "stacked") {
  const bySym = new Map(tiles.map((t) => [base(t.symbol), t]));
  const placed: Placed[] = [];
  const used = new Set<string>();
  // Phones get the regions stacked in one column, sized to fit the screen without panning.
  let stackRow = 0;
  const order = mode === "stacked" ? ["A", "C", "B", "D"].map((c) => REGIONS.find((r) => r.code === c)!) : REGIONS;
  for (const r of order) {
    let i = 0;
    const origin = mode === "stacked" ? { col: 0, row: stackRow } : { col: r.col, row: r.row };
    const count = r.symbols.filter((x) => bySym.has(x)).length;
    for (const s of r.symbols) {
      const t = bySym.get(s);
      if (!t) continue;
      const { x, y } = center(origin.col + (i % r.cols), origin.row + Math.floor(i / r.cols));
      placed.push({ tile: t, cx: x, cy: y, region: r.code, index: i + 1 });
      used.add(s);
      i++;
    }
    stackRow += Math.ceil(count / r.cols) + 1.1;
  }
  // Markets listed after the map was drawn join a frontier column.
  let extra = 0;
  for (const t of tiles) {
    if (used.has(base(t.symbol))) continue;
    const { x, y } = mode === "stacked" ? center(extra++ % 4, stackRow + 0.2) : center(8.5, extra++);
    placed.push({ tile: t, cx: x, cy: y, region: "E", index: extra });
  }

  // Region outlines: the edges only one hex of the region uses.
  const outlines: Record<string, [number, number, number, number][]> = {};
  for (const code of new Set(placed.map((p) => p.region))) {
    const seen = new Map<string, { e: [number, number, number, number]; n: number }>();
    for (const p of placed.filter((q) => q.region === code)) {
      const pts = hexPoints(p.cx, p.cy);
      for (let k = 0; k < 6; k++) {
        const [a, b] = [pts[k], pts[(k + 1) % 6]];
        const key = `${((a[0] + b[0]) / 2).toFixed(0)},${((a[1] + b[1]) / 2).toFixed(0)}`;
        const cur = seen.get(key);
        if (cur) cur.n++;
        else seen.set(key, { e: [a[0], a[1], b[0], b[1]], n: 1 });
      }
    }
    outlines[code] = [...seen.values()].filter((v) => v.n === 1).map((v) => v.e);
  }
  const labels = REGIONS.filter((r) => placed.some((p) => p.region === r.code)).map((r) => {
    const ps = placed.filter((p) => p.region === r.code);
    return { ...r, x: Math.min(...ps.map((p) => p.cx)) - R, y: Math.min(...ps.map((p) => p.cy)) - H / 2 - 12 };
  });
  const xs = placed.map((p) => p.cx);
  const ys = placed.map((p) => p.cy);
  const box = {
    x: Math.min(...xs) - R - 6,
    y: Math.min(...ys) - H / 2 - 30,
    w: Math.max(...xs) - Math.min(...xs) + W + 12,
    h: Math.max(...ys) - Math.min(...ys) + H + 40,
  };
  return { placed, outlines, labels, box };
}

function fillFor(a: Army) {
  if (a.garrison) return "var(--paper-2)"; // flat: stripes are reserved for contested ground
  return a.pattern === "solid" ? a.ink : `url(#pat-${a.slug})`;
}

function Patterns({ armies, contests }: { armies: Army[]; contests: [Army, Army][] }) {
  return (
    <defs>
      {armies.map((a) =>
        a.pattern === "diagonal" ? (
          <pattern key={a.slug} id={`pat-${a.slug}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill={a.garrison ? "var(--paper-2)" : a.ink} opacity={a.garrison ? 1 : 0.35} />
            <rect width={a.garrison ? 1.2 : 3.2} height="7" fill={a.ink} opacity={a.garrison ? 0.45 : 1} />
          </pattern>
        ) : a.pattern === "dots" ? (
          <pattern key={a.slug} id={`pat-${a.slug}`} width="7" height="7" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill={a.ink} opacity="0.3" />
            <circle cx="3.5" cy="3.5" r="2.1" fill={a.ink} />
          </pattern>
        ) : null,
      )}
      {contests.map(([a, b]) => (
        <pattern key={`${a.slug}-${b.slug}`} id={`contest-${a.slug}-${b.slug}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill={a.garrison ? "var(--paper-3)" : a.ink} />
          <rect x="6" width="6" height="12" fill={b.garrison ? "var(--paper-3)" : b.ink} />
        </pattern>
      ))}
      <filter id="chit-shadow" x="-20%" y="-20%" width="160%" height="160%">
        <feOffset dx="2" dy="2" in="SourceAlpha" result="off" />
        <feComponentTransfer in="off" result="soft">
          <feFuncA type="linear" slope="0.35" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="soft" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export function WarMap({
  tiles,
  highlight,
  contestedBelow = 0.15,
  animateKey,
}: {
  tiles: MapTile[];
  highlight?: string;
  contestedBelow?: number;
  /** When set, tiles whose owner changed replay the ink-in wipe. */
  animateKey?: string;
}) {
  const armies = [...new Set(tiles.flatMap((t) => [t.owner, t.runnerUp]).filter(Boolean) as string[])].map((s) => ARMY_BY_SLUG[s]).filter(Boolean);
  const contests = tiles
    .filter((t) => t.owner && t.runnerUp && t.margin < contestedBelow)
    .map((t) => [ARMY_BY_SLUG[t.owner!], ARMY_BY_SLUG[t.runnerUp!]] as [Army, Army])
    .filter(([a, b]) => a && b);

  return (
    <>
      <Board mode="wide" className="hidden md:block" {...{ tiles, highlight, contestedBelow, animateKey, armies, contests }} />
      <Board mode="stacked" className="md:hidden" {...{ tiles, highlight, contestedBelow, animateKey, armies, contests }} />
    </>
  );
}

function Board({
  mode,
  className,
  tiles,
  highlight,
  contestedBelow,
  animateKey,
  armies,
  contests,
}: {
  mode: "wide" | "stacked";
  className: string;
  tiles: MapTile[];
  highlight?: string;
  contestedBelow: number;
  animateKey?: string;
  armies: Army[];
  contests: [Army, Army][];
}) {
  const { placed, outlines, labels, box } = layout(tiles, mode);
  return (
    <div className={className}>
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="h-auto w-full" role="img" aria-label="Map of Strike markets and the armies that hold them">
        <Patterns armies={armies} contests={contests} />

        {/* contour lines through the open ground between regions */}
        <g display={mode === "wide" ? undefined : "none"} fill="none" stroke="var(--contour)" strokeWidth="1" opacity="0.8">
          {[0, 1, 2, 3].map((i) => (
            <path
              key={`h${i}`}
              d={`M ${box.x} ${box.y + box.h * (0.5 + i * 0.025)} C ${box.x + box.w * 0.3} ${box.y + box.h * (0.44 + i * 0.025)}, ${box.x + box.w * 0.5} ${box.y + box.h * (0.6 + i * 0.025)}, ${box.x + box.w} ${box.y + box.h * (0.5 + i * 0.025)}`}
            />
          ))}
          {[0, 1, 2].map((i) => (
            <path
              key={`v${i}`}
              d={`M ${box.x + box.w * (0.555 + i * 0.012)} ${box.y} C ${box.x + box.w * (0.52 + i * 0.012)} ${box.y + box.h * 0.4}, ${box.x + box.w * (0.6 + i * 0.012)} ${box.y + box.h * 0.6}, ${box.x + box.w * (0.56 + i * 0.012)} ${box.y + box.h}`}
            />
          ))}
        </g>

        {labels.map((l) => (
          <text key={l.code} x={l.x} y={l.y} className="num" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }} fill="var(--ink-2)">
            {l.code} · {l.name}
          </text>
        ))}

        {placed.map(({ tile, cx, cy, region, index }) => {
          const owner = tile.owner ? ARMY_BY_SLUG[tile.owner] : undefined;
          const runner = tile.runnerUp ? ARMY_BY_SLUG[tile.runnerUp] : undefined;
          const contested = !!(owner && runner && tile.margin < contestedBelow);
          const fill = contested ? `url(#contest-${owner!.slug}-${runner!.slug})` : owner ? fillFor(owner) : "var(--paper)";
          const faded = !!highlight && tile.owner !== highlight;
          const fought = !!highlight && tile.runnerUp === highlight;
          const strength = tile.strength ?? (owner ? tile.traders?.[owner.slug] ?? 0 : 0);
          const ticks = Math.min(3, Math.round((tile.weight - 1) * 1.5));
          const pts = hexPoints(cx, cy).map((p) => p.join(",")).join(" ");
          const lightLabel = owner && !owner.garrison && !faded && owner.pattern === "solid" && !contested;
          return (
            <g key={tile.symbol}>
              <title>{`${base(tile.symbol)}: ${owner ? `held by ${owner.ticker}${owner.garrison ? " (garrison)" : ""}` : "unclaimed"}${contested ? `, contested by ${runner!.ticker}` : ""}. ${strength} traders, last 7 days. Frontier weight ${tile.weight}x.`}</title>
              <polygon points={pts} fill="var(--paper)" />
              <polygon
                key={`${tile.symbol}-${tile.owner}-${animateKey ?? ""}`}
                points={pts}
                fill={fill}
                opacity={faded ? 0.35 : 0.94}
                className={animateKey ? "ink-in" : undefined}
              />
              <polygon points={pts} fill="none" stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray={owner ? undefined : "3 3"} />
              {fought && (
                <polygon points={hexPoints(cx, cy, R - 5).map((p) => p.join(",")).join(" ")} fill="none" stroke={ARMY_BY_SLUG[highlight!].ink} strokeWidth="2.5" strokeDasharray="5 4" />
              )}
              <text x={cx} y={cy - H / 2 + 15} textAnchor="middle" className="num" style={{ fontSize: 11, fontWeight: 600 }} fill={lightLabel ? "var(--paper)" : "var(--ink)"}>
                {base(tile.symbol)}
              </text>
              <text x={cx - R + 9} y={cy + 4} className="num" style={{ fontSize: 9.5 }} fill={lightLabel ? "var(--paper)" : "var(--ink)"} opacity="0.6">
                {region}
                {String(index).padStart(2, "0")}
              </text>
              {owner?.garrison && (
                <text x={cx} y={cy + 12} textAnchor="middle" className="num" style={{ fontSize: 12, fontWeight: 600 }} fill="var(--ink-2)" opacity={faded ? 0.45 : 0.8}>
                  {strength}
                </text>
              )}
              {owner && !owner.garrison && (
                <g transform={`translate(${cx - 16},${cy - 5})`} opacity={faded ? 0.6 : 1} filter="url(#chit-shadow)">
                  {Array.from({ length: ticks }).map((_, i) => (
                    <rect key={i} x={16 - ticks * 3 + i * 6} y={-7} width="4" height="4" fill="var(--ink)" />
                  ))}
                  <rect width="32" height="30" fill={owner.garrison ? "var(--paper)" : owner.ink} stroke="var(--ink)" strokeOpacity={owner.garrison ? 0.6 : 1} strokeWidth="1.2" opacity={owner.garrison ? 0.85 : 1} />
                  <text x="16" y="13" textAnchor="middle" className="display" style={{ fontSize: 12 }} fill={owner.garrison ? "var(--ink)" : "var(--paper)"}>
                    {owner.code}
                  </text>
                  <text x="16" y="25" textAnchor="middle" className="num" style={{ fontSize: 10, fontWeight: 600 }} fill={owner.garrison ? "var(--ink)" : "var(--paper)"}>
                    {strength}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {Object.entries(outlines).map(([code, edges]) => (
          <g key={code} stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round">
            {edges.map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
