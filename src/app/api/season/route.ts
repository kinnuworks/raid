import { NextResponse } from "next/server";
import { liveSeason } from "@/lib/season";

/** The live season, recomputed from Strike's public data at most every 20 seconds. */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("fresh") === "1";
  return NextResponse.json(await liveSeason(force));
}
