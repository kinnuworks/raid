import * as ed from "@noble/ed25519";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import type { ApiWalletSigner } from "./sign";

/** Seed-based signer for scripts and tests. Browsers use webCryptoSigner so the key can't be exported. */
export async function seedSigner(seedHex: string): Promise<ApiWalletSigner> {
  const seed = hexToBytes(seedHex);
  const pub = await ed.getPublicKeyAsync(seed);
  return { publicKeyHex: bytesToHex(pub), sign: (m) => ed.signAsync(m, seed) };
}

export function newSeedHex(): string {
  return bytesToHex(ed.utils.randomSecretKey());
}

/** Wraps a WebCrypto Ed25519 key pair. The private key is created non-extractable. */
export async function webCryptoSigner(pair: CryptoKeyPair): Promise<ApiWalletSigner> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {
    publicKeyHex: bytesToHex(raw),
    sign: async (m) => new Uint8Array(await crypto.subtle.sign("Ed25519", pair.privateKey, m as BufferSource)),
  };
}
