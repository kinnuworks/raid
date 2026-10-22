import { describe, expect, it } from "vitest";
import { attachWitnesses, skip } from "./cbor";

// [body={0:[],1:[],2:0}, witness_set={}, true, null]
const UNSIGNED = "84a3008001800200a0f5f6";
// {0: 258([[h'aa', h'bb']])}
const WALLET = "a100d9010281824161" + "4162";

describe("attachWitnesses", () => {
  it("keeps body bytes identical and inserts the vkey witnesses", () => {
    const out = attachWitnesses(UNSIGNED, WALLET);
    expect(out.startsWith("84a3008001800200")).toBe(true);
    expect(out).toBe("84a3008001800200" + "a100d9010281824161" + "4162" + "f5f6");
  });

  it("skips over every item type it meets", () => {
    const b = Uint8Array.from(Buffer.from(UNSIGNED, "hex"));
    expect(skip(b, 0)).toBe(b.length);
  });

  it("does not duplicate a witness the tx already carries", () => {
    const once = attachWitnesses(UNSIGNED, WALLET);
    expect(attachWitnesses(once, WALLET)).toBe(once);
  });
});
