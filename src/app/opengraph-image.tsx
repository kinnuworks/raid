import { ImageResponse } from "next/og";
import season0 from "@/data/season0.json";
import { CardFrame, MiniBoard, OG_SIZE, ogFonts } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Raid: your token is your army. Take Strike's markets.";

export default async function Image() {
  const garrison = season0.tiles.filter((t) => t.owner === "strike").length;
  return new ImageResponse(
    (
      <CardFrame footer={`${season0.totals.armyMembers} Strike traders already hold a community token · wash trades never score`}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontFamily: "Display", fontSize: 84, lineHeight: 0.9 }}>YOUR TOKEN IS YOUR ARMY.</div>
          <div style={{ fontFamily: "Display", fontSize: 84, lineHeight: 0.9 }}>TAKE STRIKE&apos;S MARKETS.</div>
          <div style={{ fontFamily: "Mono", fontSize: 24, marginTop: 20, color: "#4A4639" }}>{`The garrison holds ${garrison} of ${season0.tiles.length}. Your move.`}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <MiniBoard />
        </div>
      </CardFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
