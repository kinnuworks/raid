export type Network = "testnet" | "mainnet";

const HOSTS: Record<Network, string> = {
  mainnet: "https://api.strikefinance.org",
  testnet: "https://api-v2-testnet.strikefinance.org",
};

/** Live trading network. Mainnet is one env var away: NEXT_PUBLIC_RAID_NETWORK=mainnet. */
export const LIVE_NETWORK: Network =
  (process.env.NEXT_PUBLIC_RAID_NETWORK as Network) === "mainnet" ? "mainnet" : "testnet";

export const BUILDER_CODE = process.env.NEXT_PUBLIC_RAID_BUILDER_CODE ?? "raid";
/** Fee charged on taker orders only. Maker orders carry no builder fee. */
export const BUILDER_FEE_BPS = Number(process.env.NEXT_PUBLIC_RAID_FEE_BPS ?? 10);

export function api(network: Network) {
  const host = HOSTS[network];
  return {
    host,
    rest: host,
    price: `${host}/price`,
    stat: `${host}/stat`,
    wsPrice: host.replace("https", "wss") + "/ws/price",
    wsUser: host.replace("https", "wss") + "/ws/user-api",
  };
}

/** Strike's edge returns 403 to some default user agents, so server-side calls name themselves. */
export const SERVER_HEADERS = { "User-Agent": "raid/0.1 (+https://github.com/kinnuworks/raid)", Accept: "application/json" };
