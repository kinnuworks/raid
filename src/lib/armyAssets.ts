import { ARMIES, type Army } from "./armies";
import type { Network } from "./strike/config";
import testnet from "@/data/testnet-armies.json";

/**
 * Which token proves membership on each network. Mainnet uses the real community tokens.
 * Testnet wallets can't hold those, so Strike's testnet season uses clearly labelled stand-ins
 * (tSNEK, tHOSKY, …) minted on Cardano preprod under Raid's own policy.
 */
export function armyAsset(army: Army, network: Network): string | null {
  if (network === "mainnet") return army.asset;
  return (testnet.assets as Record<string, string>)[army.slug] ?? null;
}

export function armiesForAssets(assets: string[], network: Network): Army[] {
  const held = new Set(assets);
  return ARMIES.filter((a) => {
    const id = armyAsset(a, network);
    return id !== null && held.has(id);
  });
}

export const TESTNET_FAUCETS: string[] = testnet.faucets;
