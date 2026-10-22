"use client";

import { webCryptoSigner } from "@/lib/strike/signers";
import type { ApiWalletSigner } from "@/lib/strike/sign";

/**
 * The Strike API wallet key lives only in this browser, in IndexedDB, as a non-extractable
 * WebCrypto Ed25519 key. Raid's server never sees it, and page scripts can't read its bytes.
 */
const DB = "raid-keys";
const STORE = "keys";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export interface StoredSession {
  pair: CryptoKeyPair;
  accountId: string;
  address: string;
  chain: "cardano" | "ethereum" | "solana";
  network: string;
  expiresAt: string;
}

export async function newKeyPair(): Promise<CryptoKeyPair> {
  return (await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"])) as CryptoKeyPair;
}

export async function saveSession(s: StoredSession) {
  await tx("readwrite", (st) => st.put(s, "session"));
}

export async function loadSession(): Promise<(StoredSession & { signer: ApiWalletSigner }) | null> {
  const s = (await tx("readonly", (st) => st.get("session"))) as StoredSession | undefined;
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() < Date.now()) return null;
  return { ...s, signer: await webCryptoSigner(s.pair) };
}

export async function clearSession() {
  await tx("readwrite", (st) => st.delete("session"));
}
