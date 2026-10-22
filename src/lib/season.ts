import "server-only";
import { ARMY_BY_SLUG } from "./armies";
import { TESTNET_FAUCETS } from "./armyAssets";
import { listMembers, type Member } from "./db";
import { fundingSources } from "./koios";
import { publicApi, type PublicFill } from "./strike/client";
import { LIVE_NETWORK } from "./strike/config";
import {
  checkRecruit,
  claimTile,
  creditedRecruitScore,
  dropInternalTrades,
  feesByArmy,
  feesPaid,
  flowScore,
  frontierWeights,
  RECRUIT_RULES,
  type Fill,
  type RecruitCheck,
  type TileResult,
} from "./score";

export const SEASON_START = Date.parse(process.env.RAID_SEASON_START ?? "2026-10-22T00:00:00Z");

export interface RecruitRow {
  account_id: string;
  army: string;
  recruited_by: string | null;
  depositedUsd: number;
  check: RecruitCheck;
}

export interface LiveSeason {
  network: string;
  computedAt: string;
  seasonStart: string;
  members: { account_id: string; army: string; is_recruit: boolean; qualified: boolean; depositedUsd: number; feesPaid: number; fills: number }[];
  tiles: (TileResult & { traders: Record<string, number> })[];
  recruits: RecruitRow[];
  recruitBoard: { army: string; confirmed: number; pending: number; rejected: number; score: number }[];
  fees: ReturnType<typeof feesByArmy>;
  internalFillsDropped: number;
  sources: Record<string, string>;
}

let cache: { at: number; value: LiveSeason } | null = null;

/** Runs `fn` over `items` with at most `n` in flight, so Strike's rate limit is respected. */
async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

function depositsUsd(txs: { type?: string; status?: string; amount?: string; timestamp?: number }[]) {
  return txs
    .filter((t) => t.type === "deposit" && !["failed", "rejected", "cancelled", "canceled", "expired"].includes(t.status ?? ""))
    .reduce((s, t) => s + Math.max(0, Number(t.amount ?? 0)), 0);
}

export async function liveSeason(force = false): Promise<LiveSeason> {
  if (!force && cache && Date.now() - cache.at < 20_000) return cache.value;
  const strike = publicApi(LIVE_NETWORK);
  const members = await listMembers();

  const perMember = await pool(members, 4, async (m) => {
      const [f, t] = await Promise.all([
        strike.fills(m.account_id, 500).catch(() => ({ fills: [] as PublicFill[] })),
        strike.transactions(m.account_id).catch(() => ({ transactions: [] })),
      ]);
      const fills = (f.fills ?? []).filter((x) => x.timestamp >= SEASON_START) as Fill[];
      return { m, fills, deposited: depositsUsd((t.transactions ?? []) as never) };
  });

  const { kept, dropped } = dropInternalTrades(perMember.flatMap((p) => p.fills));
  const keptBy = new Map<string, Fill[]>();
  for (const f of kept) keptBy.set(f.account_id, [...(keptBy.get(f.account_id) ?? []), f]);

  const qualified = new Set(perMember.filter((p) => p.deposited >= RECRUIT_RULES.minDepositUsd).map((p) => p.m.account_id));
  const armyOf = new Map(members.map((m) => [m.account_id, m.army]));

  // Recruits.
  const memberSources = (except: Member) =>
    new Set(members.filter((m) => m.account_id !== except.account_id).flatMap((m) => [m.address, m.stake_key].filter(Boolean) as string[]));
  const ignored = new Set(TESTNET_FAUCETS);
  const recruits: RecruitRow[] = await Promise.all(
    perMember
      .filter((p) => p.m.is_recruit)
      .map(async (p) => {
        const sources = await fundingSources(LIVE_NETWORK, p.m.address, p.m.stake_key).catch(() => []);
        const check = checkRecruit({ depositedUsd: p.deposited, outsideFills: keptBy.get(p.m.account_id) ?? [], fundingSources: sources }, memberSources(p.m), ignored);
        const ownTrades = p.fills.length > 0 && (keptBy.get(p.m.account_id) ?? []).length === 0;
        if (check.status === "pending" && ownTrades) check.reasons.unshift("every trade so far was against another Raid account");
        return { account_id: p.m.account_id, army: p.m.army, recruited_by: p.m.recruited_by, depositedUsd: p.deposited, check };
      }),
  );

  const recruitBoard = Object.keys(ARMY_BY_SLUG)
    .map((army) => {
      const rs = recruits.filter((r) => r.army === army);
      const byRecruiter = new Map<string, number[]>();
      for (const r of rs) if (r.check.status === "confirmed") byRecruiter.set(r.recruited_by ?? "", [...(byRecruiter.get(r.recruited_by ?? "") ?? []), r.check.score]);
      const score = [...byRecruiter.values()].reduce((s, v) => s + creditedRecruitScore(v), 0);
      return {
        army,
        confirmed: rs.filter((r) => r.check.status === "confirmed").length,
        pending: rs.filter((r) => r.check.status === "pending").length,
        rejected: rs.filter((r) => r.check.status === "rejected").length,
        score,
      };
    })
    .filter((r) => r.confirmed + r.pending + r.rejected > 0)
    .sort((a, b) => b.score - a.score || b.confirmed - a.confirmed);

  // Tiles: the live network's markets, claimed by fees from distinct qualified members.
  const [mk, tick] = await Promise.all([strike.markets(), strike.ticker24h()]);
  const symbols = Object.keys(mk.markets).sort();
  const weights = frontierWeights(Object.fromEntries(symbols.map((s) => [s, Number(tick.find((t) => t.symbol === s)?.quoteVolume ?? 0)])));
  const tiles = symbols.map((sym) => {
    const byArmy: Record<string, Map<string, number>> = {};
    for (const f of kept) {
      if (f.symbol !== sym || !qualified.has(f.account_id)) continue;
      const army = armyOf.get(f.account_id)!;
      const mm = (byArmy[army] ??= new Map());
      mm.set(f.account_id, (mm.get(f.account_id) ?? 0) + Math.max(0, Number(f.fee)));
    }
    const scores = Object.fromEntries(Object.entries(byArmy).map(([a, mm]) => [a, Math.round(flowScore(mm) * 10000) / 10000]));
    return { ...claimTile(sym, weights[sym], scores), traders: Object.fromEntries(Object.entries(byArmy).map(([a, mm]) => [a, mm.size])) };
  });

  const value: LiveSeason = {
    network: LIVE_NETWORK,
    computedAt: new Date().toISOString(),
    seasonStart: new Date(SEASON_START).toISOString(),
    members: perMember.map((p) => ({
      account_id: p.m.account_id,
      army: p.m.army,
      is_recruit: p.m.is_recruit,
      qualified: qualified.has(p.m.account_id),
      depositedUsd: p.deposited,
      feesPaid: feesPaid(keptBy.get(p.m.account_id) ?? []),
      fills: p.fills.length,
    })),
    tiles,
    recruits,
    recruitBoard,
    fees: feesByArmy(perMember.flatMap((p) => p.fills)),
    internalFillsDropped: dropped.length,
    sources: {
      fills: `${strike.host}/v2/history/fill?account_id={member}&limit=500`,
      deposits: `${strike.host}/v2/history/transaction?account_id={member}`,
      funding: `https://${LIVE_NETWORK === "mainnet" ? "api" : "preprod"}.koios.rest/api/v1/address_txs → tx_info`,
      markets: `${strike.host}/v2/markets`,
    },
  };
  cache = { at: Date.now(), value };
  return value;
}
