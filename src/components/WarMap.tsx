import { ARMY_BY_SLUG, type Army, type Pattern } from "@/lib/armies";

export interface MapTile {
  symbol: string;
  weight: number;
  owner: string | null;
  runnerUp: string | null;
  margin: number;
  traders?: Record<string, number | undefined>;
  volume24h?: number;
}

/** Regions of the board. Authored, so the map reads like a designed sheet, not a grid. */
const REGIONS: { name: string; code: string; cols: number; symbols: string[] }[] = [
  {
    name: "Crypto heartland",
    code: "A",
    cols: 4,
    symbols: ["BTC", "ETH", "SOL", "ADA", "HYPE", "XRP", "BNB", "NEAR", "ZEC", "PUMP", "NIGHT", "DOGE"],
  },
  { name: "US equities", code: "B", cols: 3, symbols: ["NVDA", "TSLA", "GOOGL", "COIN", "CRCL", "MU", "SNDK", "AAOI"] },
  { name: "Pre-IPO frontier", code: "C", cols: 3, symbols: ["SPCX", "UNITREE", "MINIMAX", "ZHIPU", "CXMT", "SKHYNIX", "DRAM"] },
  { name: "Commodities & indices", code: "D", cols: 3, symbols: ["XAU", "XAG", "WTI", "SP500", "NAS100"] },
];

const T = 92; // tile size
const G = 8; // gutter
const RG = 44; // region gap

function base(sym: string) {
  return sym.replace(/-USD$/, "");
}

function layout(tiles: MapTile[]) {
  const bySym = new Map(tiles.map((t) => [base(t.symbol), t]));
  const placed: { tile: MapTile; x: number; y: number; region: string }[] = [];
  const labels: { name: string; code: string; x: number; y: number; w: number }[] = [];
  const used = new Set<string>();

  // Two columns of regions: heartland + equities on the left, frontier + commodities on the right.
  const columns = [
    [REGIONS[0], REGIONS[1]],
    [REGIONS[2], REGIONS[3]],
  ];
  let x0 = 0;
  for (const col of columns) {
    let y0 = 0;
    let colW = 0;
    for (const r of col) {
      const syms = r.symbols.filter((s) => bySym.has(s));
      const w = r.cols * (T + G) + T / 2;
      labels.push({ name: r.name, code: r.code, x: x0, y: y0, w });
      syms.forEach((s, i) => {
        const row = Math.floor(i / r.cols);
        const c = i % r.cols;
        placed.push({ tile: bySym.get(s)!, x: x0 + c * (T + G) + (row % 2 ? T / 2 : 0), y: y0 + 34 + row * (T + G), region: r.code });
        used.add(s);
      });
      const rows = Math.ceil(syms.length / r.cols);
      y0 += 34 + rows * (T + G) + RG;
      colW = Math.max(colW, w);
    }
    x0 += colW + RG * 1.4;
  }
  // Anything newly listed that isn't in a region yet lands at the frontier edge.
  const extra = tiles.filter((t) => !used.has(base(t.symbol)));
  const ex = x0;
  extra.forEach((t, i) => placed.push({ tile: t, x: ex, y: i * (T + G) + 34, region: "E" }));
  if (extra.length) labels.push({ name: "New listings", code: "E", x: ex, y: 0, w: T });

  const width = Math.max(...placed.map((p) => p.x + T)) + 4;
  const height = Math.max(...placed.map((p) => p.y + T)) + 4;
  return { placed, labels, width, height };
}

function patternId(a: Army) {
  return `pat-${a.slug}`;
}

function PatternDef({ army }: { army: Army }) {
  const id = patternId(army);
  const c = army.ink;
  const p: Pattern = army.pattern;
  return (
    <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform={p === "diagonal" ? "rotate(45)" : undefined}>
      <rect width="8" height="8" fill={c} opacity={p === "solid" ? 0.92 : 0.3} />
      {p === "diagonal" && <rect width="3.2" height="8" fill={c} />}
      {p === "cross" && (
        <>
          <rect width="8" height="2.2" fill={c} />
          <rect width="2.2" height="8" fill={c} />
        </>
      )}
      {p === "dots" && <circle cx="4" cy="4" r="2" fill={c} />}
      {p === "rows" && <rect width="8" height="3" fill={c} />}
    </pattern>
  );
}

function ContestDef({ a, b }: { a: Army; b: Army }) {
  return (
    <pattern id={`contest-${a.slug}-${b.slug}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="12" fill={a.ink} />
      <rect x="6" width="6" height="12" fill={b.ink} />
    </pattern>
  );
}

export function WarMap({ tiles, highlight, contestedBelow = 0.15 }: { tiles: MapTile[]; highlight?: string; contestedBelow?: number }) {
  const { placed, labels, width, height } = layout(tiles);
  const owners = [...new Set(tiles.flatMap((t) => [t.owner, t.runnerUp]).filter(Boolean) as string[])].map((s) => ARMY_BY_SLUG[s]).filter(Boolean);
  const contests = tiles
    .filter((t) => t.owner && t.runnerUp && t.margin < contestedBelow)
    .map((t) => [ARMY_BY_SLUG[t.owner!], ARMY_BY_SLUG[t.runnerUp!]] as const)
    .filter(([a, b]) => a && b);

  return (
    <svg viewBox={`-2 -2 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Map of Strike markets and the armies that hold them">
      <defs>
        {owners.map((a) => (
          <PatternDef key={a.slug} army={a} />
        ))}
        {contests.map(([a, b]) => (
          <ContestDef key={`${a.slug}-${b.slug}`} a={a} b={b} />
        ))}
      </defs>

      {labels.map((l) => (
        <g key={l.code}>
          <text x={l.x} y={l.y + 14} className="label" style={{ fontSize: 12 }} fill="var(--ink-2)">
            {l.code} · {l.name}
          </text>
          <line x1={l.x} x2={l.x + l.w} y1={l.y + 22} y2={l.y + 22} stroke="var(--rule-strong)" strokeWidth="1" />
        </g>
      ))}

      {placed.map(({ tile, x, y }) => {
        const owner = tile.owner ? ARMY_BY_SLUG[tile.owner] : undefined;
        const runner = tile.runnerUp ? ARMY_BY_SLUG[tile.runnerUp] : undefined;
        const contested = owner && runner && tile.margin < contestedBelow;
        const fill = contested ? `url(#contest-${owner!.slug}-${runner!.slug})` : owner ? `url(#${patternId(owner)})` : "var(--paper-2)";
        const dim = highlight && tile.owner !== highlight;
        const traders = owner ? tile.traders?.[owner.slug] ?? 0 : 0;
        const pips = Math.round((tile.weight - 1) * 1.5); // 0..3 frontier pips
        return (
          <g key={tile.symbol} transform={`translate(${x},${y})`} opacity={dim ? 0.28 : 1}>
            <title>
              {`${base(tile.symbol)}: ${owner ? `held by ${owner.ticker}` : "unclaimed"}${contested ? `, contested by ${runner!.ticker}` : ""}. Weight ${tile.weight}x.`}
            </title>
            <rect width={T} height={T} fill={fill} />
            <rect width={T} height={T} fill="none" stroke="var(--ink)" strokeWidth={owner ? 2 : 1} strokeDasharray={owner ? undefined : "3 3"} />
            {/* market code plate */}
            <rect x="0" y="0" width={T} height="22" fill="var(--paper)" opacity={owner ? 0.94 : 0} />
            <text x="6" y="16" className="num" style={{ fontSize: 12, fontWeight: 600 }} fill="var(--ink)">
              {base(tile.symbol)}
            </text>
            {Array.from({ length: pips }).map((_, i) => (
              <rect key={i} x={T - 10 - i * 7} y="8" width="5" height="5" fill="var(--ink)" />
            ))}
            {/* army counter */}
            {owner && (
              <g transform={`translate(${T / 2 - 26},${T - 40})`}>
                <rect width="52" height="32" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
                <text x="26" y="14" textAnchor="middle" className="display" style={{ fontSize: 13 }} fill="var(--ink)">
                  {owner.ticker}
                </text>
                <text x="26" y="27" textAnchor="middle" className="num" style={{ fontSize: 10 }} fill="var(--ink-2)">
                  {traders} tr
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
