import { NextResponse } from "next/server";

/** Short recruit links: /r/abc1234 → /join?ref=abc1234 */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return NextResponse.redirect(new URL(`/join?ref=${encodeURIComponent(code)}`, req.url), 307);
}
