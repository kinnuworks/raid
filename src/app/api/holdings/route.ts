import { NextResponse } from "next/server";
import { armiesForAssets } from "@/lib/armyAssets";
import { assetsOf, stakeKeyOf } from "@/lib/koios";
import { LIVE_NETWORK } from "@/lib/strike/config";

/** GET /api/holdings?address=addr_test1… → the armies this wallet can join, read from chain. */
export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address") ?? "";
  if (!/^addr(_test)?1[0-9a-z]{20,}$/.test(address)) return NextResponse.json({ error: "Not a Cardano address" }, { status: 400 });
  const stakeKey = await stakeKeyOf(LIVE_NETWORK, address);
  const assets = await assetsOf(LIVE_NETWORK, address, stakeKey);
  const armies = armiesForAssets(assets, LIVE_NETWORK).map((a) => a.slug);
  return NextResponse.json({ address, stakeKey, armies, network: LIVE_NETWORK, checkedAt: new Date().toISOString() });
}
