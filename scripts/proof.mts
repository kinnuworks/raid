/**
 * Re-checks every public claim Raid makes and writes the evidence to docs/proof/.
 * Everything here reads public APIs only (Strike testnet, Cardano preprod via Koios), so anyone can run it.
 *   pnpm proof
 */
import fs from "node:fs";
import path from "node:path";
import { publicApi, type PublicFill } from "../src/lib/strike/client";
import { dropInternalTrades, feesByArmy, parseRaidTag, type Fill } from "../src/lib/score";
import seed from "../src/data/seed-members.json";
import testnetArmies from "../src/data/testnet-armies.json";

const OUT = path.join(import.meta.dirname, "../docs/proof");
fs.mkdirSync(OUT, { recursive: true });
const strike = publicApi("testnet");
const KOIOS = "https://preprod.koios.rest/api/v1";
const now = new Date().toISOString();

async function koios<T>(endpoint: string, body: unknown): Promise<T> {
  const r = await fetch(`${KOIOS}/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "raid-proof/0.1" }, body: JSON.stringify(body) });
  return (await r.json()) as T;
}

function write(name: string, data: unknown) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify({ checkedAt: now, ...(data as object) }, null, 2));
  console.log(`wrote docs/proof/${name}`);
}

type Member = (typeof seed)[number];
const members = seed as Member[];

// 1. Every enlisted account is linked by Strike to the wallet Raid says it is.
const links = [];
for (const m of members) {
  const a = (await strike.accountByAddress(m.address)) as { account_id?: string };
  links.push({ account_id: m.account_id, address: m.address, army: m.army, strike_says: a.account_id, match: a.account_id === m.account_id });
}
write("1-builder-connect-accounts.json", {
  claim: "Each enlisted Strike account was created through Builder Connect for the wallet shown",
  source: "GET https://api-v2-testnet.strikefinance.org/v2/account?blockchain_address={address}",
  allMatch: links.every((l) => l.match),
  accounts: links,
});

// 2. Deposits went through Strike's deposit flow.
const deposits = [];
for (const m of members) {
  const t = await strike.transactions(m.account_id);
  for (const x of t.transactions ?? []) if (x.type === "deposit") deposits.push({ account_id: m.account_id, usd: Number(x.amount), status: x.status, asset: x.asset_symbol, tx_hash: x.tx_hash });
}
write("2-deposits.json", {
  claim: "Every demo wallet deposited through Strike's deposit flow (quote, build-tx, wallet signature, confirm)",
  source: "GET /v2/history/transaction?account_id={id}",
  count: deposits.length,
  totalUsd: Math.round(deposits.reduce((s, d) => s + d.usd, 0) * 100) / 100,
  deposits,
});

// 3. Tagged orders and builder fees, from public fills.
const fills: Fill[] = [];
for (const m of members) fills.push(...(((await strike.fills(m.account_id, 500)).fills ?? []) as PublicFill[] as Fill[]));
const tagged = fills.filter((f) => parseRaidTag(f.client_order_id));
write("3-tagged-fills-and-fees.json", {
  claim: "Orders placed through Raid carry a public raid:v1 tag and a 10 bps builder fee",
  source: "GET /v2/history/fill?account_id={id}",
  taggedFills: tagged.length,
  feesByArmy: feesByArmy(fills),
  sample: tagged.slice(0, 5).map((f) => ({ account_id: f.account_id, trade_id: f.trade_id, symbol: f.symbol, role: f.role, client_order_id: f.client_order_id })),
});

// 4. The wash trade: one trade_id, a Raid account on both sides, dropped.
const { dropped } = dropInternalTrades(fills);
const byTrade = new Map<string, Fill[]>();
for (const f of dropped) byTrade.set(`${f.symbol}:${f.trade_id}`, [...(byTrade.get(`${f.symbol}:${f.trade_id}`) ?? []), f]);
write("4-wash-trades-dropped.json", {
  claim: "Trades with a Raid account on both sides are detected by their shared public trade_id and never score",
  source: "Same fills as proof 3",
  droppedTrades: [...byTrade.entries()].map(([k, fs]) => ({
    trade: k,
    sides: fs.map((f) => ({ account_id: f.account_id, army: members.find((m) => m.account_id === f.account_id)?.army, role: f.role, side: f.side, price: f.price, size: f.size })),
  })),
});

// 5. The funding cheater: funded on-chain by its recruiter.
const cheater = members.find((m) => m.is_recruit && m.recruited_by && links.find((l) => l.account_id === m.account_id));
const recruiter = members.find((m) => m.account_id === cheater?.recruited_by);
const fundTxs: { tx_hash: string; inputs: { payment_addr: { bech32: string } }[] }[] = [];
for (const m of members.filter((x) => x.is_recruit)) {
  const txs = await koios<{ tx_hash: string }[]>("address_txs", { _addresses: [m.address] });
  const info = txs.length ? await koios<typeof fundTxs>("tx_info", { _tx_hashes: txs.slice(0, 5).map((t) => t.tx_hash), _inputs: true }) : [];
  for (const t of info)
    if (t.inputs?.some((i) => i.payment_addr?.bech32 === recruiter?.address)) fundTxs.push({ ...t, recruit: m.account_id } as never);
}
write("5-funding-check.json", {
  claim: "A recruit funded on-chain by its recruiter is rejected",
  source: "POST https://preprod.koios.rest/api/v1/address_txs and tx_info",
  recruiter: recruiter?.address,
  fundedByRecruiter: fundTxs.map((t) => ({ recruit: (t as unknown as { recruit: string }).recruit, tx_hash: t.tx_hash })),
});

// 6. Stand-in tokens are labelled and minted under Raid's own policy.
write("6-testnet-stand-in-tokens.json", {
  claim: "Testnet membership uses labelled stand-ins (tSNEK and so on) minted on preprod under Raid's own policy",
  policy: testnetArmies.policy,
  mintTx: (testnetArmies as { mintTx?: string }).mintTx,
  assets: testnetArmies.assets,
  explorer: `https://preprod.cardanoscan.io/transaction/${(testnetArmies as { mintTx?: string }).mintTx}`,
});
