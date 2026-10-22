import { describe, expect, it } from "vitest";
import {
  builderFee,
  checkRecruit,
  claimTile,
  creditedRecruitScore,
  dropInternalTrades,
  feesByArmy,
  flowScore,
  frontierWeights,
  parseRaidTag,
  raidTag,
  type Fill,
} from "./index";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 22, 20);

function fill(p: Partial<Fill>): Fill {
  return {
    account_id: "a",
    trade_id: 1,
    symbol: "ETH-USD",
    role: "taker",
    side: "buy",
    price: "2400",
    size: "0.01",
    fee: "0.012",
    timestamp: T0,
    client_order_id: "",
    ...p,
  };
}

describe("dropInternalTrades", () => {
  it("drops both sides of a trade between two Raid accounts, in any army", () => {
    const fills = [
      fill({ account_id: "snek-1", trade_id: 7, role: "taker" }),
      fill({ account_id: "hosky-1", trade_id: 7, role: "maker" }),
      fill({ account_id: "snek-1", trade_id: 8 }),
    ];
    const { kept, dropped } = dropInternalTrades(fills);
    expect(dropped.map((f) => f.account_id).sort()).toEqual(["hosky-1", "snek-1"]);
    expect(kept).toHaveLength(1);
    expect(kept[0].trade_id).toBe(8);
  });

  it("keys on symbol and trade_id together", () => {
    const { dropped } = dropInternalTrades([
      fill({ account_id: "x", trade_id: 5, symbol: "BTC-USD" }),
      fill({ account_id: "y", trade_id: 5, symbol: "ETH-USD" }),
    ]);
    expect(dropped).toHaveLength(0);
  });
});

describe("frontierWeights", () => {
  it("gives the quietest market 3x and the busiest 1x", () => {
    const w = frontierWeights({ "BTC-USD": 3_000_000, "SPCX-USD": 100_000, "NAS100-USD": 60 });
    expect(w["BTC-USD"]).toBe(1);
    expect(w["NAS100-USD"]).toBe(3);
    expect(w["SPCX-USD"]).toBeGreaterThan(1);
    expect(w["SPCX-USD"]).toBeLessThan(3);
  });
});

describe("flowScore and claimTile", () => {
  it("ten small traders beat one whale paying the same total", () => {
    const ten = new Map(Array.from({ length: 10 }, (_, i) => [`m${i}`, 1]));
    const whale = new Map([["w", 10]]);
    expect(flowScore(ten)).toBeGreaterThan(flowScore(whale));
  });

  it("claims for the top army and reports a contested margin", () => {
    const t = claimTile("SOL-USD", 1.4, { snek: 9, hosky: 6, night: 0 });
    expect(t.owner).toBe("snek");
    expect(t.runnerUp).toBe("hosky");
    expect(t.margin).toBeCloseTo(1 / 3);
    expect(claimTile("XAU-USD", 3, {}).owner).toBeNull();
  });
});

describe("checkRecruit", () => {
  const members = new Set(["stake_recruiter"]);
  const faucet = new Set(["addr_faucet"]);
  const outside = [fill({ timestamp: T0 }), fill({ timestamp: T0 + DAY, trade_id: 2 })];

  it("confirms a funded, retained recruit that traded against outsiders", () => {
    const r = checkRecruit({ depositedUsd: 25, outsideFills: outside, fundingSources: ["addr_faucet"] }, members, faucet);
    expect(r.status).toBe("confirmed");
    expect(r.tradingDays).toBe(2);
    expect(r.score).toBeCloseTo(Math.sqrt(0.024));
  });

  it("keeps a one-day recruit pending with the reason shown", () => {
    const r = checkRecruit({ depositedUsd: 25, outsideFills: outside.slice(0, 1), fundingSources: [] }, members, faucet);
    expect(r.status).toBe("pending");
    expect(r.reasons).toContain("traded on 1 of 2 days");
    expect(r.score).toBe(0);
  });

  it("rejects a wallet funded by a member", () => {
    const r = checkRecruit({ depositedUsd: 25, outsideFills: outside, fundingSources: ["stake_recruiter"] }, members, faucet);
    expect(r.status).toBe("rejected");
    expect(r.reasons[0]).toMatch(/funding source/);
  });

  it("a recruit whose only trades were against members never confirms", () => {
    const r = checkRecruit({ depositedUsd: 25, outsideFills: [], fundingSources: [] }, members, faucet);
    expect(r.status).toBe("pending");
    expect(r.reasons).toContain("no trade against an outside counterparty yet");
  });

  it("credits at most ten recruits per recruiter", () => {
    expect(creditedRecruitScore(Array(12).fill(1))).toBe(10);
  });
});

describe("Proof of Fees", () => {
  it("round-trips the order tag", () => {
    expect(parseRaidTag(raidTag("snek", 10, "abc"))).toEqual({ army: "snek", bps: 10 });
    expect(parseRaidTag("copy:123")).toBeNull();
  });

  it("matches Strike's floor(notional * bps / 1e4)", () => {
    expect(builderFee(fill({ price: "2443.07", size: "0.01" }), 10)).toBe(0.0244307);
  });

  it("counts only tagged taker fills", () => {
    const rows = feesByArmy([
      fill({ client_order_id: raidTag("snek", 10, "1") }),
      fill({ client_order_id: raidTag("snek", 10, "2"), role: "maker" }),
      fill({ client_order_id: "copy:9" }),
    ]);
    expect(rows.snek.fills).toBe(1);
    expect(rows.snek.builderFee).toBeCloseTo(0.024);
  });
});

describe("cappedFeesByMember", () => {
  it("caps each wallet's counted fees per UTC day", async () => {
    const { cappedFeesByMember } = await import("./index");
    const m = cappedFeesByMember(
      [
        fill({ account_id: "whale", fee: "40", timestamp: T0 }),
        fill({ account_id: "whale", fee: "40", timestamp: T0 + DAY }),
        fill({ account_id: "small", fee: "2", timestamp: T0 }),
      ],
      5,
    );
    expect(m.get("whale")).toBe(10);
    expect(m.get("small")).toBe(2);
  });
});
