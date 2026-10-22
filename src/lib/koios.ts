import type { Network } from "./strike/config";
import { SERVER_HEADERS } from "./strike/config";

const BASE: Record<Network, string> = {
  mainnet: "https://api.koios.rest/api/v1",
  testnet: "https://preprod.koios.rest/api/v1",
};

async function post<T>(network: Network, endpoint: string, body: unknown): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(`${BASE[network]}/${endpoint}`, {
        method: "POST",
        headers: { ...SERVER_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (res.ok) return (await res.json()) as T;
      if (i >= 3) throw new Error(`Koios ${res.status} ${endpoint}`);
    } catch (e) {
      if (i >= 3) throw e;
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
}

export async function stakeKeyOf(network: Network, address: string): Promise<string | null> {
  const rows = await post<{ stake_address: string | null }[]>(network, "address_info", { _addresses: [address] });
  return rows[0]?.stake_address ?? null;
}

/** Every asset held by the wallet: by stake key when there is one, otherwise by address. */
export async function assetsOf(network: Network, address: string, stakeKey: string | null): Promise<string[]> {
  if (stakeKey) {
    const rows = await post<{ policy_id: string; asset_name: string | null }[]>(network, "account_assets", { _stake_addresses: [stakeKey] });
    return rows.map((r) => `${r.policy_id}.${r.asset_name ?? ""}`);
  }
  const rows = await post<{ policy_id: string; asset_name: string | null }[]>(network, "address_assets", { _addresses: [address] });
  return rows.map((r) => `${r.policy_id}.${r.asset_name ?? ""}`);
}

/**
 * Where a wallet's money came from: the addresses (and their stake keys) on the input side of
 * every transaction that paid into it, excluding the wallet itself.
 */
export async function fundingSources(network: Network, address: string, stakeKey: string | null): Promise<string[]> {
  const txs = await post<{ tx_hash: string }[]>(network, "address_txs", { _addresses: [address] });
  if (!txs.length) return [];
  const info = await post<{ inputs: { payment_addr: { bech32: string }; stake_addr: string | null }[] }[]>(network, "tx_info", {
    _tx_hashes: txs.slice(0, 25).map((t) => t.tx_hash),
    _inputs: true,
  });
  const out = new Set<string>();
  for (const t of info)
    for (const i of t.inputs ?? []) {
      if (i.payment_addr?.bech32 === address || (stakeKey && i.stake_addr === stakeKey)) continue;
      if (i.payment_addr?.bech32) out.add(i.payment_addr.bech32);
      if (i.stake_addr) out.add(i.stake_addr);
    }
  return [...out];
}
