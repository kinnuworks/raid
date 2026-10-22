/**
 * Raid scoring. Pure functions only, so every number on the site can be recomputed
 * from Strike's public data by anyone, in the browser or in a test.
 */

export interface Fill {
  account_id: string;
  trade_id: number;
  symbol: string;
  role: "maker" | "taker";
  side: "buy" | "sell";
  price: string;
  size: string;
  fee: string;
  timestamp: number;
  client_order_id: string;
  auto_close_type?: string;
}

/**
 * Drops every fill whose trade has a Raid account on both sides.
 * Both sides of a Strike trade carry the same public trade_id, so a trade between any two
 * Raid accounts (same army or rival armies) shows up twice in our data and is removed.
 */
export function dropInternalTrades(fills: Fill[]): { kept: Fill[]; dropped: Fill[] } {
  const owners = new Map<string, Set<string>>();
  for (const f of fills) {
    const key = `${f.symbol}:${f.trade_id}`;
    const set = owners.get(key) ?? new Set<string>();
    set.add(f.account_id);
    owners.set(key, set);
  }
  const kept: Fill[] = [];
  const dropped: Fill[] = [];
  for (const f of fills) {
    ((owners.get(`${f.symbol}:${f.trade_id}`)?.size ?? 0) > 1 ? dropped : kept).push(f);
  }
  return { kept, dropped };
}

/** Fees actually paid. Maker rebates are negative and count as zero. */
export function feesPaid(fills: Fill[]): number {
  return fills.reduce((s, f) => s + Math.max(0, Number(f.fee)), 0);
}

export function notional(f: Fill): number {
  return Number(f.price) * Number(f.size);
}

/**
 * How much a market counts on the map. Quiet markets count up to 3x, the busiest 1x.
 * Uses log volume so one giant market doesn't flatten the rest.
 */
export function frontierWeights(volume24h: Record<string, number>): Record<string, number> {
  const entries = Object.entries(volume24h);
  const logs = entries.map(([, v]) => Math.log10(1 + Math.max(0, v)));
  const lo = Math.min(...logs);
  const hi = Math.max(...logs);
  const out: Record<string, number> = {};
  entries.forEach(([sym], i) => {
    const t = hi === lo ? 1 : (logs[i] - lo) / (hi - lo);
    out[sym] = Math.round((3 - 2 * t) * 100) / 100;
  });
  return out;
}

/**
 * Flow score for one army on one market: each distinct member contributes the square root
 * of the fees they paid there, so ten traders beat one whale paying the same total.
 * `shares` lets a member who belongs to several armies split their weight (Season 0 only).
 */
export function flowScore(feesByMember: Map<string, number>, shares?: Map<string, number>): number {
  let s = 0;
  for (const [member, fee] of feesByMember) s += Math.sqrt(Math.max(0, fee)) * (shares?.get(member) ?? 1);
  return s;
}

export interface TileResult {
  symbol: string;
  weight: number;
  owner: string | null;
  runnerUp: string | null;
  scores: Record<string, number>;
  /** owner's lead over runner-up as a share of the owner's score; 0 means contested */
  margin: number;
}

export function claimTile(symbol: string, weight: number, scores: Record<string, number>): TileResult {
  const ranked = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  return {
    symbol,
    weight,
    owner: first?.[0] ?? null,
    runnerUp: second?.[0] ?? null,
    scores,
    margin: first ? (first[1] - (second?.[1] ?? 0)) / first[1] : 0,
  };
}

// ---------- Recruits ----------

export interface RecruitEvidence {
  depositedUsd: number;
  /** fills that survived dropInternalTrades */
  outsideFills: Fill[];
  /** stake keys / addresses that funded this wallet on-chain */
  fundingSources: string[];
}

export interface RecruitCheck {
  status: "confirmed" | "pending" | "rejected";
  reasons: string[];
  tradingDays: number;
  score: number;
}

export const RECRUIT_RULES = {
  minDepositUsd: 20,
  minTradingDays: 2,
  maxCreditedPerRecruiter: 10,
  seasonLossCapUsd: 50,
} as const;

function utcDay(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * A recruit is confirmed when it deposited enough, traded against someone outside every army,
 * was not funded by any Raid member, and traded on two separate UTC days.
 * Confirmed recruits score sqrt(fees paid to outside counterparties).
 */
export function checkRecruit(ev: RecruitEvidence, memberSources: Set<string>, ignoredSources: Set<string>): RecruitCheck {
  const reasons: string[] = [];
  const funded = ev.fundingSources.filter((s) => !ignoredSources.has(s));
  if (funded.some((s) => memberSources.has(s))) {
    return { status: "rejected", reasons: ["same funding source as a Raid member"], tradingDays: 0, score: 0 };
  }
  const days = new Set(ev.outsideFills.map((f) => utcDay(f.timestamp))).size;
  if (ev.depositedUsd < RECRUIT_RULES.minDepositUsd) reasons.push(`deposit below $${RECRUIT_RULES.minDepositUsd}`);
  if (ev.outsideFills.length === 0) reasons.push("no trade against an outside counterparty yet");
  if (days < RECRUIT_RULES.minTradingDays) reasons.push(`traded on ${days} of ${RECRUIT_RULES.minTradingDays} days`);
  const confirmed = reasons.length === 0;
  return {
    status: confirmed ? "confirmed" : "pending",
    reasons,
    tradingDays: days,
    score: confirmed ? Math.sqrt(feesPaid(ev.outsideFills)) : 0,
  };
}

/** A recruiter earns credit for at most N confirmed recruits per season (best N by score). */
export function creditedRecruitScore(scores: number[]): number {
  return [...scores].sort((a, b) => b - a).slice(0, RECRUIT_RULES.maxCreditedPerRecruiter).reduce((a, b) => a + b, 0);
}

// ---------- Proof of Fees ----------

/** Order tag Raid puts in client_order_id. Public in Strike's fill history. */
export function raidTag(army: string, bps: number, nonce: string) {
  return `raid:v1:${army}:${bps}:${nonce}`;
}

export function parseRaidTag(id: string): { army: string; bps: number } | null {
  const m = /^raid:v1:([a-z0-9]+):(\d{1,3}):/.exec(id);
  return m ? { army: m[1], bps: Number(m[2]) } : null;
}

const SCALE = 18;
function toUnits(decimal: string): bigint {
  const [whole, frac = ""] = decimal.trim().split(".");
  return BigInt(whole + frac.padEnd(SCALE, "0").slice(0, SCALE));
}

/**
 * Strike charges builder fees as floor(notional * bps / 1e4), kept to 8 decimals.
 * Done in integers: with floats, 2443.07 * 0.01 * 10 / 1e4 floors to 0.02443069 instead of 0.0244307.
 */
export function builderFee(f: Fill, bps: number): number {
  const notionalUnits = (toUnits(f.price) * toUnits(f.size)) / 10n ** BigInt(SCALE);
  const fee8 = (notionalUnits * BigInt(bps)) / 10_000n / 10n ** BigInt(SCALE - 8);
  return Number(fee8) / 1e8;
}

/** Builder fees per army, recomputed from public fills. Only taker fills with a Raid tag count. */
export function feesByArmy(fills: Fill[]): Record<string, { fills: number; notional: number; builderFee: number }> {
  const out: Record<string, { fills: number; notional: number; builderFee: number }> = {};
  for (const f of fills) {
    const tag = parseRaidTag(f.client_order_id);
    if (!tag || f.role !== "taker") continue;
    const row = (out[tag.army] ??= { fills: 0, notional: 0, builderFee: 0 });
    row.fills += 1;
    row.notional += notional(f);
    row.builderFee += builderFee(f, tag.bps);
  }
  return out;
}
