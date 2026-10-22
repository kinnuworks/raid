import { NextResponse } from "next/server";
import { liveSeason, seasonSnapshot } from "@/lib/season";

/** The live season from Strike's public data. Cached for a minute; ?fresh=1 recomputes now. */
export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  return NextResponse.json(fresh ? await liveSeason(true) : await seasonSnapshot());
}
