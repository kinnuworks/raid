"use client";

import { bech32 } from "bech32";

/** The subset of CIP-30 Raid uses. */
export interface Cip30Api {
  getNetworkId(): Promise<number>;
  getChangeAddress(): Promise<string>;
  getRewardAddresses(): Promise<string[]>;
  getUtxos(): Promise<string[] | undefined>;
  getBalance(): Promise<string>;
  signData(address: string, payload: string): Promise<{ signature: string; key: string }>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
}

export interface CardanoWalletInfo {
  id: string;
  name: string;
  icon: string;
}

type Injected = Record<string, { name: string; icon: string; apiVersion?: string; enable(): Promise<Cip30Api> }>;

export function listCardanoWallets(): CardanoWalletInfo[] {
  if (typeof window === "undefined") return [];
  const c = (window as unknown as { cardano?: Injected }).cardano ?? {};
  return Object.entries(c)
    .filter(([, w]) => w && typeof w.enable === "function" && w.name)
    .map(([id, w]) => ({ id, name: w.name, icon: w.icon }));
}

export async function enableCardano(id: string): Promise<Cip30Api> {
  const c = (window as unknown as { cardano?: Injected }).cardano;
  if (!c?.[id]) throw new Error(`Wallet "${id}" is not installed in this browser.`);
  return c[id].enable();
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function utf8ToHex(s: string): string {
  return [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** CIP-30 returns addresses as hex bytes; Strike and Koios want bech32. */
export function addressHexToBech32(hex: string): string {
  const bytes = hexToBytes(hex);
  const header = bytes[0];
  const network = header & 0x0f;
  const type = header >> 4;
  const prefix = type === 0x0e || type === 0x0f ? (network === 1 ? "stake" : "stake_test") : network === 1 ? "addr" : "addr_test";
  return bech32.encode(prefix, bech32.toWords(bytes), 1000);
}

export interface ConnectedCardano {
  api: Cip30Api;
  addressHex: string;
  address: string;
  stakeAddress: string | null;
  networkId: number;
}

export async function connectCardano(id: string): Promise<ConnectedCardano> {
  const api = await enableCardano(id);
  const [networkId, addressHex, rewards] = await Promise.all([api.getNetworkId(), api.getChangeAddress(), api.getRewardAddresses()]);
  return {
    api,
    addressHex,
    address: addressHexToBech32(addressHex),
    stakeAddress: rewards?.[0] ? addressHexToBech32(rewards[0]) : null,
    networkId,
  };
}

/** Signs a UTF-8 message in the format Strike expects for Cardano: "{coseSign1Hex}:{coseKeyHex}". */
export async function signMessageCardano(w: ConnectedCardano, message: string, payloadIsHex = false): Promise<string> {
  const { signature, key } = await w.api.signData(w.addressHex, payloadIsHex ? message : utf8ToHex(message));
  return `${signature}:${key}`;
}
