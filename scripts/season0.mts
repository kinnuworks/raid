/**
 * Season 0: rebuilds the whole board from public data.
 *   1. Strike mainnet leaderboard (every account, with its wallet address)
 *   2. Koios: Cardano address -> stake key -> token holdings -> armies
 *   3. Strike mainnet fills for the last 7 days of every army member -> the 31-tile map
 * Run: pnpm season0   (writes src/data/season0.json)
 */
import fs from "node:fs";
import path from "node:path";
import { ARMIES, ARMY_BY_ASSET } from "../src/lib/armies";
import { api, SERVER_HEADERS } from "../src/lib/strike/config";
import { claimTile, dropInternalTrades, feesPaid, flowScore, frontierWeights, type Fill } from "../src/lib/score";

const MAIN = api("mainnet");
const KOIOS = "https://api.koios.rest/api/v1";
const CACHE = path.join(import.meta.dirname, ".cache");
const OUT = path.join(import.meta.dirname, "../src/data/season0.json");
const WINDOW_DAYS = 7;
fs.mkdirSync(CACHE, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, init?: RequestInit, tries = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { ...SERVER_HEADERS, ...(init?.headers ?? {}) } });
      if (res.ok) return (await res.json()) as T;
      if (i >= tries - 1) throw new Error(`${res.status} ${url}`);
    } catch (e) {
      // Koios and Strike both drop the odd connection under load; retry those too.
      if (i >= tries - 1) throw e;
    }
    await sleep(1500 * (i + 1));
  }
}

async function cached<T>(name: string, maxAgeMin: number, fn: () => Promise<T>): Promise<T> {
  const f = path.join(CACHE, name);
  if (fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs < maxAgeMin * 60_000) return JSON.parse(fs.readFileSync(f, "utf8"));
  const v = await fn();
  fs.writeFileSync(f, JSON.stringify(v));
  return v;
}

async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

interface LbEntry {
  account_id: string;
  blockchain_address: string;
  volume: string;
  total_pnl: string;
  realized_pnl: string;
  win_rate_pct: string;
  total_trades: number;
  equity: string;
}

async function leaderboard(): Promise<LbEntry[]> {
  return cached("leaderboard.json", 60, async () => {
    const all: LbEntry[] = [];
    for (let offset = 0; ; offset += 500) {
      const page = await getJson<{ entries: LbEntry[]; has_more: boolean }>(
        `${MAIN.stat}/v1/stats/leaderboard?limit=500&offset=${offset}&time_range=all_time`,
      );
      all.push(...page.entries);
      if (!page.has_more || page.entries.length === 0) break;
    }
    return all;
  });
}

async function koios<T>(endpoint: string, body: unknown): Promise<T> {
  return getJson<T>(`${KOIOS}/${endpoint}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

async function holdings(addresses: string[]) {
  return cached("holdings.json", 24 * 60, async () => {
    const stakeOf: Record<string, string> = {};
    const batches = Array.from({ length: Math.ceil(addresses.length / 10) }, (_, i) => addresses.slice(i * 10, i * 10 + 10));
    await pool(batches, 3, async (b) => {
      const rows = await koios<{ address: string; stake_address: string | null }[]>("address_info", { _addresses: b });
      for (const r of rows) if (r.stake_address) stakeOf[r.address] = r.stake_address;
    });
    const stakes = [...new Set(Object.values(stakeOf))];
    const armiesOf: Record<string, string[]> = {};
    const sBatches = Array.from({ length: Math.ceil(stakes.length / 10) }, (_, i) => stakes.slice(i * 10, i * 10 + 10));
    await pool(sBatches, 3, async (b) => {
      const rows = await koios<{ stake_address: string; policy_id: string; asset_name: string | null }[]>("account_assets", { _stake_addresses: b });
      for (const r of rows) {
        const army = ARMY_BY_ASSET[`${r.policy_id}.${r.asset_name ?? ""}`];
        if (army) (armiesOf[r.stake_address] ??= []).includes(army.slug) || armiesOf[r.stake_address].push(army.slug);
      }
    });
    return { stakeOf, armiesOf, resolved: Object.keys(stakeOf).length };
  });
}

async function recentFills(accountId: string, since: number): Promise<Fill[]> {
  return cached(`fills-${accountId}.json`, 60, async () => {
    const d = await getJson<{ fills: Fill[] | null }>(`${MAIN.rest}/v2/history/fill?account_id=${accountId}&limit=500`);
    return (d.fills ?? []).filter((f) => f.timestamp >= since);
  });
}

async function main() {
  const startedAt = new Date();
  const since = startedAt.getTime() - WINDOW_DAYS * 86_400_000;

  const lb = await leaderboard();
  const cardano = lb.filter((e) => e.blockchain_address?.startsWith("addr1"));
  console.log(`leaderboard ${lb.length} accounts, ${cardano.length} Cardano`);

  const { stakeOf, armiesOf, resolved } = await holdings(cardano.map((e) => e.blockchain_address));
  console.log(`resolved ${resolved} stake keys`);

  const holders = cardano
    .map((e) => ({ e, held: armiesOf[stakeOf[e.blockchain_address]] ?? [] }))
    .filter((m) => m.held.length > 0);
  // Almost every Strike trader holds STRIKE, and NIGHT was a broad airdrop. A wallet holding several
  // army tokens is assigned to the rarest one among Strike traders: the clearest signal of its community.
  const heldCount: Record<string, number> = {};
  for (const h of holders) for (const a of h.held) heldCount[a] = (heldCount[a] ?? 0) + 1;
  const members = holders.map((h) => ({ e: h.e, held: h.held, armies: [[...h.held].sort((a, b) => heldCount[a] - heldCount[b] || a.localeCompare(b))[0]] }));

  // Per-army totals from the leaderboard (all time).
  const armyRows = ARMIES.map((a) => {
    const ms = members.filter((m) => m.armies.includes(a.slug));
    const holdersOnStrike = heldCount[a.slug] ?? 0;
    const traded = ms.filter((m) => Number(m.e.volume) > 0);
    return {
      slug: a.slug,
      members: ms.length,
      holders: holdersOnStrike,
      traded: traded.length,
      volume: ms.reduce((s, m) => s + Number(m.e.volume), 0),
      pnl: ms.reduce((s, m) => s + Number(m.e.total_pnl), 0),
      inProfit: traded.filter((m) => Number(m.e.total_pnl) > 0).length,
      equity: ms.reduce((s, m) => s + Number(m.e.equity), 0),
    };
  });

  // Market volumes for frontier weights.
  const tickers = await getJson<{ symbol: string; quoteVolume: string }[]>(`${MAIN.price}/v2/ticker/24hr`);
  const markets = await getJson<{ markets: Record<string, { status: string }> }>(`${MAIN.rest}/v2/markets`);
  const symbols = Object.entries(markets.markets).filter(([, m]) => m.status === "trading").map(([s]) => s).sort();
  const vol24 = Object.fromEntries(symbols.map((s) => [s, Number(tickers.find((t) => t.symbol === s)?.quoteVolume ?? 0)]));
  const weights = frontierWeights(vol24);

  // Fills for active members, last 7 days.
  const active = members.filter((m) => Number(m.e.volume) > 0);
  let done = 0;
  const fillsPer = await pool(active, 4, async (m) => {
    const f = await recentFills(m.e.account_id, since);
    if (++done % 100 === 0) console.log(`fills ${done}/${active.length}`);
    return f;
  });
  const { kept, dropped } = dropInternalTrades(fillsPer.flat());

  // Tile scores: per market, per army, sqrt(fees) per distinct member. Each member fights for one army.
  const armiesByAccount = new Map(members.map((m) => [m.e.account_id, m.armies]));
  function tilesFor(fills: Fill[]) {
    return symbols.map((sym) => {
      const byArmy: Record<string, Map<string, number>> = {};
      for (const f of fills) {
        if (f.symbol !== sym) continue;
        for (const a of armiesByAccount.get(f.account_id) ?? []) {
          const mm = (byArmy[a] ??= new Map());
          mm.set(f.account_id, (mm.get(f.account_id) ?? 0) + Math.max(0, Number(f.fee)));
        }
      }
      const scores = Object.fromEntries(Object.entries(byArmy).map(([a, mm]) => [a, Math.round(flowScore(mm) * 1000) / 1000]));
      const traders = Object.fromEntries(Object.entries(byArmy).map(([a, mm]) => [a, mm.size]));
      return { ...claimTile(sym, weights[sym], scores), volume24h: vol24[sym], traders };
    });
  }
  const tiles = tilesFor(kept);

  // Daily frames for the replay: the board as it stood at the end of each day, counting that day's window so far.
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const end = since + (i + 1) * 86_400_000;
    const frame = tilesFor(kept.filter((f) => f.timestamp < end));
    return {
      date: new Date(end - 1).toISOString().slice(0, 10),
      tiles: frame.map((t) => ({ symbol: t.symbol, owner: t.owner, runnerUp: t.runnerUp, margin: Math.round(t.margin * 100) / 100, strength: t.owner ? t.traders[t.owner] ?? 0 : 0 })),
    };
  });

  const armyVolume7d = Object.fromEntries(
    ARMIES.map((a) => [a.slug, kept.filter((f) => armiesByAccount.get(f.account_id)?.includes(a.slug)).reduce((s, f) => s + Number(f.price) * Number(f.size), 0)]),
  );
  const armyTraders7d = Object.fromEntries(
    ARMIES.map((a) => [a.slug, new Set(kept.filter((f) => armiesByAccount.get(f.account_id)?.includes(a.slug)).map((f) => f.account_id)).size]),
  );
  const armyFees7d = Object.fromEntries(
    ARMIES.map((a) => [a.slug, feesPaid(kept.filter((f) => armiesByAccount.get(f.account_id)?.includes(a.slug)))]),
  );

  const out = {
    season: 0,
    network: "mainnet",
    generatedAt: startedAt.toISOString(),
    windowDays: WINDOW_DAYS,
    sources: {
      leaderboard: `${MAIN.stat}/v1/stats/leaderboard?limit=500&offset=0&time_range=all_time`,
      holdings: `${KOIOS}/address_info -> ${KOIOS}/account_assets`,
      fills: `${MAIN.rest}/v2/history/fill?account_id={id}&limit=500`,
      volume: `${MAIN.price}/v2/ticker/24hr`,
    },
    totals: {
      leaderboardAccounts: lb.length,
      cardanoAccounts: cardano.length,
      resolvedStakeKeys: resolved,
      armyMembers: members.length,
      assignment: "rarest held army token among Strike traders",
      fillsScanned: kept.length + dropped.length,
      internalFillsDropped: dropped.length,
    },
    armies: armyRows.map((r) => ({ ...r, fees7d: armyFees7d[r.slug], volume7d: armyVolume7d[r.slug], traders7d: armyTraders7d[r.slug] })),
    days,
    tiles,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`wrote ${OUT}: ${tiles.filter((t) => t.owner).length}/${tiles.length} tiles claimed, ${dropped.length} internal fills dropped`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
