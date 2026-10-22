import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/** Anything that can produce an Ed25519 signature: a WebCrypto key in the browser, a seed in scripts. */
export interface ApiWalletSigner {
  publicKeyHex: string;
  sign(message: Uint8Array): Promise<Uint8Array>;
}

export function bodyHash(body: string): string {
  return bytesToHex(sha256(utf8ToBytes(body)));
}

/** Builds Strike's API wallet headers. The signed message is METHOD:PATH:TIMESTAMP:NONCE:SHA256(body). */
export async function signedHeaders(
  signer: ApiWalletSigner,
  method: string,
  pathWithQuery: string,
  body: string,
  clockOffsetMs = 0,
): Promise<Record<string, string>> {
  const timestamp = Math.floor((Date.now() + clockOffsetMs) / 1000).toString();
  const nonce = crypto.randomUUID();
  const message = `${method.toUpperCase()}:${pathWithQuery}:${timestamp}:${nonce}:${bodyHash(body)}`;
  const signature = await signer.sign(utf8ToBytes(message));
  return {
    "X-API-Wallet-Public-Key": signer.publicKeyHex,
    "X-API-Wallet-Signature": bytesToHex(signature),
    "X-API-Wallet-Timestamp": timestamp,
    "X-API-Wallet-Nonce": nonce,
  };
}

/** Signs the user-stream logon: session.logon:{timestamp_ms}:{apiKey}. */
export async function logonSignature(signer: ApiWalletSigner, timestampMs: number) {
  const sig = await signer.sign(utf8ToBytes(`session.logon:${timestampMs}:${signer.publicKeyHex}`));
  return bytesToHex(sig);
}
