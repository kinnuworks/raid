/**
 * Testnet setup for the live season (Cardano preprod).
 *   pnpm testnet wallets             create the demo wallets (keys stay in scripts/.wallets, gitignored)
 *   pnpm testnet mint-and-fund       mint labelled stand-in army tokens and fund every demo wallet in one tx
 *
 * Stand-ins are named tSNEK, tHOSKY, … so nobody mistakes them for the real community tokens.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ForgeScript, KoiosProvider, MeshTxBuilder, MeshWallet, resolveScriptHash, stringToHex } from "@meshsdk/core";
import { ARMIES } from "../src/lib/armies";

const DIR = path.join(import.meta.dirname, ".wallets");
const FILE = path.join(DIR, "wallets.json");
const ARMY_FILE = path.join(import.meta.dirname, "../src/data/testnet-armies.json");
const provider = new KoiosProvider("preprod");

/** Demo cast. Members trade; recruits join through a member's link; two cheaters try to game the board. */
export const CAST: { name: string; army: string; role: "member" | "recruit" | "cheat-wash" | "cheat-fund"; ada: number }[] = [
  { name: "snek-1", army: "snek", role: "member", ada: 900 },
  { name: "snek-2", army: "snek", role: "member", ada: 600 },
  { name: "hosky-1", army: "hosky", role: "member", ada: 600 },
  { name: "hosky-2", army: "hosky", role: "member", ada: 600 },
  { name: "night-1", army: "night", role: "member", ada: 600 },
  { name: "rec-1", army: "snek", role: "recruit", ada: 400 },
  { name: "rec-2", army: "snek", role: "recruit", ada: 400 },
  { name: "rec-3", army: "snek", role: "recruit", ada: 400 },
  { name: "cheat-wash", army: "snek", role: "cheat-wash", ada: 400 },
  // cheat-fund gets its ADA from snek-1 (its recruiter), not the treasury. That is the point.
  { name: "cheat-fund", army: "snek", role: "cheat-fund", ada: 0 },
];

type Store = Record<string, { mnemonic: string[]; address?: string; seedHex?: string }>;
const load = (): Store => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {});
const save = (s: Store) => {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2), { mode: 0o600 });
};

export async function wallet(name: string) {
  const store = load();
  if (!store[name]) {
    store[name] = { mnemonic: MeshWallet.brew() as string[] };
    save(store);
  }
  const w = new MeshWallet({ networkId: 0, fetcher: provider, submitter: provider, key: { type: "mnemonic", words: store[name].mnemonic } });
  await w.init();
  if (!store[name].address) {
    store[name].address = await w.getChangeAddress();
    save(store);
  }
  return w;
}

async function cmdWallets() {
  for (const c of CAST) {
    const w = await wallet(c.name);
    console.log(c.name.padEnd(11), c.role.padEnd(10), await w.getChangeAddress());
  }
}

async function cmdMintAndFund(extra: string[]) {
  const treasury = await wallet("treasury");
  const tAddr = await treasury.getChangeAddress();
  const forging = ForgeScript.withOneSignature(tAddr);
  const policyId = resolveScriptHash(forging);
  const utxos = await treasury.getUtxos();
  const tx = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  // Mint 1,000,000 of each stand-in to the treasury.
  const assets: Record<string, string> = {};
  for (const a of ARMIES) {
    const name = `t${a.ticker}`;
    const unit = policyId + stringToHex(name);
    assets[a.slug] = `${policyId}.${stringToHex(name)}`;
    tx.mint("1000000", policyId, stringToHex(name)).mintingScript(forging);
    void unit;
  }

  const send = async (addr: string, lovelace: number, slug?: string) => {
    const amount = [{ unit: "lovelace", quantity: String(lovelace) }];
    if (slug) amount.push({ unit: assets[slug].replace(".", ""), quantity: "1000" });
    tx.txOut(addr, amount);
  };

  for (const c of CAST) {
    const w = await wallet(c.name);
    const addr = await w.getChangeAddress();
    if (c.role === "cheat-fund") continue;
    // The washing cheater holds tSNEK too, so it can enlist; its problem is who it trades with.
    await send(addr, c.ada * 1_000_000, c.army);
  }
  // Team wallets passed on the command line (e.g. the founder's own Lace) get ADA and tSNEK.
  for (const addr of extra) await send(addr, 1000 * 1_000_000, "snek");

  const unsigned = await tx.changeAddress(tAddr).selectUtxosFrom(utxos).complete();
  const signed = await treasury.signTx(unsigned);
  const hash = await treasury.submitTx(signed);

  const data = JSON.parse(fs.readFileSync(ARMY_FILE, "utf8"));
  data.policy = policyId;
  data.assets = assets;
  data.mintTx = hash;
  fs.writeFileSync(ARMY_FILE, JSON.stringify(data, null, 2));
  console.log("minted + funded in", hash, "policy", policyId);
}

/** The recruiter funds the second cheater directly. Raid's funding check should catch exactly this. */
async function cmdFundCheater() {
  const snek1 = await wallet("snek-1");
  const cheat = await wallet("cheat-fund");
  const data = JSON.parse(fs.readFileSync(ARMY_FILE, "utf8"));
  const tx = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsigned = await tx
    .txOut(await cheat.getChangeAddress(), [
      { unit: "lovelace", quantity: String(300 * 1_000_000) },
      { unit: data.assets.snek.replace(".", ""), quantity: "100" },
    ])
    .changeAddress(await snek1.getChangeAddress())
    .selectUtxosFrom(await snek1.getUtxos())
    .complete();
  const hash = await snek1.submitTx(await snek1.signTx(unsigned));
  console.log("snek-1 funded cheat-fund in", hash);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const [cmd, ...rest] = isMain ? process.argv.slice(2) : ["__imported__"];
const run = { wallets: cmdWallets, "mint-and-fund": () => cmdMintAndFund(rest), "fund-cheater": cmdFundCheater }[cmd ?? ""];
if (!isMain) {
  // imported for its helpers
} else if (!run) {
  console.log("usage: testnet wallets | mint-and-fund [extra addr…] | fund-cheater");
  process.exit(1);
}
if (isMain && run)
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
