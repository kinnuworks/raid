import { NextResponse } from "next/server";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { armiesForAssets } from "@/lib/armyAssets";
import { listMembers, memberByInvite, upsertMember } from "@/lib/db";
import { assetsOf, stakeKeyOf } from "@/lib/koios";
import { publicApi } from "@/lib/strike/client";
import { LIVE_NETWORK } from "@/lib/strike/config";

function inviteCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * POST /api/members { account_id, address, army, ref? }
 * Everything is re-checked here against public data, so a client can't claim an army or account it doesn't hold:
 *  - Strike says this wallet address owns this account
 *  - the chain says this wallet holds the army's token
 *  - a recruit is a wallet whose Strike account had no fills before it enlisted
 */
export async function POST(req: Request) {
  try {
    return await enlist(req);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function enlist(req: Request) {
  const body = (await req.json()) as { account_id?: string; address?: string; army?: string; ref?: string };
  const { account_id, address, army, ref } = body;
  if (!account_id || !address || !army || !ARMY_BY_SLUG[army]) return NextResponse.json({ error: "Missing account, address or army" }, { status: 400 });

  const strike = publicApi(LIVE_NETWORK);
  const acct = await strike.accountByAddress(address).catch(() => null);
  const owner = (acct as { account_id?: string; id?: string } | null)?.account_id ?? (acct as { id?: string } | null)?.id;
  if (owner !== account_id) return NextResponse.json({ error: "Strike does not link this account to this wallet" }, { status: 403 });

  const stakeKey = await stakeKeyOf(LIVE_NETWORK, address);
  const held = armiesForAssets(await assetsOf(LIVE_NETWORK, address, stakeKey), LIVE_NETWORK).map((a) => a.slug);
  if (!held.includes(army)) return NextResponse.json({ error: `This wallet doesn't hold the ${ARMY_BY_SLUG[army].ticker} token`, held }, { status: 403 });

  const existing = (await listMembers()).find((m) => m.account_id === account_id);
  if (existing) return NextResponse.json({ member: existing });

  let recruitedBy: string | null = null;
  if (ref) {
    const recruiter = await memberByInvite(ref);
    if (recruiter && recruiter.account_id !== account_id) {
      const prior = await strike.fills(account_id, 1).catch(() => ({ fills: [] }));
      if (!prior.fills?.length) recruitedBy = recruiter.account_id;
    }
  }

  const member = await upsertMember({
    account_id,
    address,
    chain: "cardano",
    stake_key: stakeKey,
    army,
    invite_code: inviteCode(),
    recruited_by: recruitedBy,
    is_recruit: recruitedBy !== null,
  });
  return NextResponse.json({ member });
}

export async function GET(req: Request) {
  const members = await listMembers();
  // Full rows (wallet addresses are public on Strike anyway) for exporting a seed file in development.
  if (new URL(req.url).searchParams.get("full") === "1" && process.env.NODE_ENV === "development") return NextResponse.json({ members });
  return NextResponse.json({ members: members.map(({ account_id, army, invite_code, is_recruit, joined_at }) => ({ account_id, army, invite_code, is_recruit, joined_at })) });
}
