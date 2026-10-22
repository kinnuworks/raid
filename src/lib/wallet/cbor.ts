/**
 * Just enough CBOR to attach CIP-30 witnesses to an unsigned Cardano transaction.
 *
 * A Cardano tx is the CBOR array [body, witness_set, is_valid, auxiliary_data]. The tx hash is the
 * hash of the body's exact bytes, so we never decode and re-encode the body: we find item boundaries
 * and splice. Only the witness set is rebuilt, by merging the wallet's vkey witnesses into it.
 */

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Reads a CBOR head at `i`. Returns major type, argument and where the content starts. */
function head(b: Uint8Array, i: number): { major: number; arg: number; next: number; indefinite: boolean } {
  const ib = b[i];
  const major = ib >> 5;
  const info = ib & 0x1f;
  if (info < 24) return { major, arg: info, next: i + 1, indefinite: false };
  if (info === 24) return { major, arg: b[i + 1], next: i + 2, indefinite: false };
  if (info === 25) return { major, arg: (b[i + 1] << 8) | b[i + 2], next: i + 3, indefinite: false };
  if (info === 26) return { major, arg: ((b[i + 1] << 24) >>> 0) + (b[i + 2] << 16) + (b[i + 3] << 8) + b[i + 4], next: i + 5, indefinite: false };
  if (info === 27) {
    let v = 0;
    for (let k = 1; k <= 8; k++) v = v * 256 + b[i + k];
    return { major, arg: v, next: i + 9, indefinite: false };
  }
  if (info === 31) return { major, arg: 0, next: i + 1, indefinite: true };
  throw new Error(`Unsupported CBOR head 0x${ib.toString(16)} at ${i}`);
}

/** Returns the index just past the CBOR item starting at `i`. */
export function skip(b: Uint8Array, i: number): number {
  const h = head(b, i);
  switch (h.major) {
    case 0:
    case 1:
    case 7:
      return h.next;
    case 2:
    case 3:
      if (!h.indefinite) return h.next + h.arg;
      for (let j = h.next; ; ) {
        if (b[j] === 0xff) return j + 1;
        j = skip(b, j);
      }
    case 4:
    case 5: {
      const items = h.major === 5 ? 2 : 1;
      let j = h.next;
      if (h.indefinite) {
        while (b[j] !== 0xff) j = skip(b, j);
        return j + 1;
      }
      for (let k = 0; k < h.arg * items; k++) j = skip(b, j);
      return j;
    }
    case 6:
      return skip(b, h.next);
  }
  throw new Error("unreachable");
}

/** Splits a definite map into raw [key, value] byte ranges. */
function mapEntries(b: Uint8Array, i: number): { key: Uint8Array; val: Uint8Array; keyNum: number | null }[] {
  const h = head(b, i);
  if (h.major !== 5 || h.indefinite) throw new Error("witness set must be a definite map");
  const out = [];
  let j = h.next;
  for (let k = 0; k < h.arg; k++) {
    const ks = j;
    j = skip(b, j);
    const vs = j;
    j = skip(b, j);
    const kh = head(b, ks);
    out.push({ key: b.slice(ks, vs), val: b.slice(vs, j), keyNum: kh.major === 0 ? kh.arg : null });
  }
  return out;
}

function encodeHead(major: number, n: number): Uint8Array {
  if (n < 24) return Uint8Array.of((major << 5) | n);
  if (n < 256) return Uint8Array.of((major << 5) | 24, n);
  if (n < 65536) return Uint8Array.of((major << 5) | 25, n >> 8, n & 0xff);
  return Uint8Array.of((major << 5) | 26, (n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Items of a CBOR array (definite or not), optionally wrapped in tag 258 (a set). */
function arrayItems(b: Uint8Array): Uint8Array[] {
  let i = 0;
  let h = head(b, i);
  if (h.major === 6) {
    i = h.next;
    h = head(b, i);
  }
  const items: Uint8Array[] = [];
  let j = h.next;
  if (h.indefinite) {
    while (b[j] !== 0xff) {
      const s = j;
      j = skip(b, j);
      items.push(b.slice(s, j));
    }
  } else {
    for (let k = 0; k < h.arg; k++) {
      const s = j;
      j = skip(b, j);
      items.push(b.slice(s, j));
    }
  }
  return items;
}

/** Merges the wallet's witness set into the transaction's, keeping the body bytes untouched. */
export function attachWitnesses(txHex: string, walletWitnessHex: string): string {
  const tx = hexToBytes(txHex);
  const top = head(tx, 0);
  if (top.major !== 4) throw new Error("not a transaction");
  const bodyStart = top.next;
  const wsStart = skip(tx, bodyStart);
  const wsEnd = skip(tx, wsStart);

  const existing = mapEntries(tx, wsStart);
  const incoming = mapEntries(hexToBytes(walletWitnessHex), 0);
  const merged = new Map<number, Uint8Array[] | Uint8Array>();
  for (const e of existing) merged.set(e.keyNum ?? -1, e.keyNum === 0 ? arrayItems(e.val) : e.val);
  for (const e of incoming) {
    if (e.keyNum === 0) {
      const prev = (merged.get(0) as Uint8Array[] | undefined) ?? [];
      const seen = new Set(prev.map(bytesToHex));
      merged.set(0, [...prev, ...arrayItems(e.val).filter((w) => !seen.has(bytesToHex(w)))]);
    } else if (e.keyNum !== null && !merged.has(e.keyNum)) merged.set(e.keyNum, e.val);
  }
  const keys = [...merged.keys()].sort((a, b) => a - b);
  const parts: Uint8Array[] = [encodeHead(5, keys.length)];
  for (const k of keys) {
    parts.push(encodeHead(0, k));
    const v = merged.get(k)!;
    if (Array.isArray(v)) parts.push(Uint8Array.of(0xd9, 0x01, 0x02), encodeHead(4, v.length), ...v);
    else parts.push(v);
  }
  return bytesToHex(concat([tx.slice(0, wsStart), concat(parts), tx.slice(wsEnd)]));
}
