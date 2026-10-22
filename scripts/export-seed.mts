/** Writes the current season's members to src/data/seed-members.json, for deployments without a database yet. */
import fs from "node:fs";
import path from "node:path";

const RAID = process.env.RAID_URL ?? "http://localhost:3000";
const wallets = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, ".wallets/wallets.json"), "utf8"));
const byAccount = new Map(Object.values(wallets as Record<string, { accountId?: string; address?: string }>).filter((w) => w.accountId).map((w) => [w.accountId!, w.address!]));

const { members } = (await (await fetch(`${RAID}/api/members?full=1`)).json()) as { members: Record<string, unknown>[] };
const seed = members.map((m) => ({ ...m, address: m.address ?? byAccount.get(m.account_id as string) }));
fs.writeFileSync(path.join(import.meta.dirname, "../src/data/seed-members.json"), JSON.stringify(seed, null, 2));
console.log(`exported ${seed.length} members`);
