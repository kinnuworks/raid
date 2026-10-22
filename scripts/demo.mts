/**
 * Drives the demo cast through exactly the same public endpoints a browser uses.
 *   pnpm demo enlist <wallet> [refCode]     Builder Connect + register with Raid
 *   pnpm demo deposit <wallet> <ada>        quote → build-tx → sign → submit → confirm
 *   pnpm demo trade <wallet> <symbol> <buy|sell> <usd>
 *   pnpm demo wash <maker> <taker> <symbol> wash trade between two Raid accounts (should be dropped)
 *   pnpm demo status
 * RAID_URL points at the app (default http://localhost:3000).
 */
import fs from "node:fs";
import path from "node:path";
import { builderConnect, publicApi, tradingApi } from "../src/lib/strike/client";
import { BUILDER_FEE_BPS, LIVE_NETWORK } from "../src/lib/strike/config";
import { newSeedHex, seedSigner } from "../src/lib/strike/signers";
import { raidTag } from "../src/lib/score";
import { CAST, wallet } from "./testnet.mts";

const RAID = process.env.RAID_URL ?? "http://localhost:3000";
const FILE = path.join(import.meta.dirname, ".wallets", "wallets.json");
type Store = Record<string, { mnemonic: string[]; address?: string; apiSeed?: string; accountId?: string; invite?: string; army?: string }>;
const load = (): Store => JSON.parse(fs.readFileSync(FILE, "utf8"));
const save = (s: Store) => fs.writeFileSync(FILE, JSON.stringify(s, null, 2), { mode: 0o600 });
const utf8hex = (s: string) => Buffer.from(s, "utf8").toString("hex");
const pub = publicApi(LIVE_NETWORK);

async function session(name: string) {
  const s = load()[name];
  if (!s?.apiSeed || !s.accountId) throw new Error(`${name} has not enlisted`);
  return { s, signer: await seedSigner(s.apiSeed) };
}

async function enlist(name: string, ref?: string) {
  const cast = CAST.find((c) => c.name === name);
  if (!cast) throw new Error(`unknown wallet ${name}`);
  const w = await wallet(name);
  const address = await w.getChangeAddress();
  const apiSeed = newSeedHex();
  const signer = await seedSigner(apiSeed);
  const bc = builderConnect(LIVE_NETWORK);
  const ch = await bc.requestSignature({ address, chain: "cardano", public_key: signer.publicKeyHex, fee_share_bps: BUILDER_FEE_BPS });
  const sig = await w.signData(utf8hex(ch.message_to_sign), address);
  const v = await bc.verifySignature({ nonce: ch.nonce, wallet_signature: `${sig.signature}:${sig.key}` });
  const res = await fetch(`${RAID}/api/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_id: v.account_id, address, army: cast.army, ref }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Raid refused: ${JSON.stringify(body)}`);
  const store = load();
  Object.assign(store[name], { apiSeed, accountId: v.account_id, invite: body.member.invite_code, army: cast.army });
  save(store);
  console.log(`${name} enlisted in ${cast.army}: account ${v.account_id}, invite ${body.member.invite_code}, recruit=${body.member.is_recruit}`);
}

async function deposit(name: string, ada: number) {
  const { s, signer } = await session(name);
  const w = await wallet(name);
  const t = tradingApi(LIVE_NETWORK, signer);
  const q = await t.depositQuote("cardano", "ADA", String(Math.round(ada * 1e6)));
  const built = await t.depositBuildTx(q.request_id, s.address!, await w.getUtxosHex());
  const signed = await w.signTx(built.unsigned_tx as string, true);
  const hash = await w.submitTx(signed);
  await t.depositConfirm(q.request_id, hash);
  console.log(`${name} deposited ${ada} ADA (~$${Number(q.quote.usd_value).toFixed(2)}): ${hash}`);
}

async function sizeFor(symbol: string, usd: number) {
  const m = await pub.markets();
  const cfg = m.markets[symbol];
  const step = Number(cfg.order_market_step_size ?? cfg.order_limit_step_size ?? "0.001");
  const min = Number(cfg.order_market_min_size ?? step);
  const dp = Math.max(0, Math.round(-Math.log10(step)));
  const mark = Number(cfg.mark_price);
  return { size: Math.max(min, Math.floor(usd / mark / step) * step).toFixed(dp), mark, cfg };
}

async function trade(name: string, symbol: string, side: "buy" | "sell", usd: number) {
  const { s, signer } = await session(name);
  const t = tradingApi(LIVE_NETWORK, signer);
  await t.setLeverage(symbol, 2).catch(() => undefined);
  const { size } = await sizeFor(symbol, usd);
  const r = await t.order({ symbol, side, type: "market", size, client_order_id: raidTag(s.army!, BUILDER_FEE_BPS, crypto.randomUUID().slice(0, 12)), slippage: "0.03" }, BUILDER_FEE_BPS);
  console.log(`${name} ${side} ${size} ${symbol}: ${r.status} ${r.client_order_id}`);
}

/** Maker rests a post-only order inside the spread; taker hits it. Same trade_id on both accounts. */
async function wash(maker: string, taker: string, symbol: string) {
  const mk = await session(maker);
  const tk = await session(taker);
  const book = await pub.depth(symbol, 5);
  const bid = Number(book.bids[0]?.[0]);
  const ask = Number(book.asks[0]?.[0]);
  const { size, cfg } = await sizeFor(symbol, 30);
  const tick = Number(cfg.order_tick_price ?? "0.01");
  const price = Math.round(((bid + ask) / 2) / tick) * tick;
  const pdp = Math.max(0, Math.round(-Math.log10(tick)));
  const mApi = tradingApi(LIVE_NETWORK, mk.signer);
  const tApi = tradingApi(LIVE_NETWORK, tk.signer);
  await mApi.order({ symbol, side: "sell", type: "limit", size, price: price.toFixed(pdp), post_only: true, time_in_force: "GTC", client_order_id: raidTag(mk.s.army!, 0, "wash-m" + Date.now()) });
  await new Promise((r) => setTimeout(r, 1500));
  const r = await tApi.order({ symbol, side: "buy", type: "limit", size, price: price.toFixed(pdp), time_in_force: "IOC", client_order_id: raidTag(tk.s.army!, BUILDER_FEE_BPS, "wash-t" + Date.now()) }, BUILDER_FEE_BPS);
  console.log(`wash ${maker} -> ${taker} at ${price} on ${symbol}: ${r.status}`);
}

async function status() {
  const store = load();
  for (const c of CAST) {
    const s = store[c.name];
    const f = s?.accountId ? await pub.fills(s.accountId, 50).catch(() => ({ fills: [] })) : { fills: [] };
    console.log(c.name.padEnd(11), (s?.accountId ?? "-").padEnd(38), `fills ${f.fills?.length ?? 0}`, s?.invite ?? "");
  }
}

const [cmd, ...a] = process.argv.slice(2);
const cmds: Record<string, () => Promise<void>> = {
  enlist: () => enlist(a[0], a[1]),
  deposit: () => deposit(a[0], Number(a[1])),
  trade: () => trade(a[0], a[1], a[2] as "buy" | "sell", Number(a[3])),
  wash: () => wash(a[0], a[1], a[2]),
  status,
};
if (!cmds[cmd]) {
  console.log("usage: demo enlist|deposit|trade|wash|status …");
  process.exit(1);
}
cmds[cmd]().catch((e) => {
  console.error(process.env.DEBUG ? e : (e.message ?? e));
  process.exit(1);
});
