import { api, BUILDER_CODE, type Network, SERVER_HEADERS } from "./config";
import { type ApiWalletSigner, signedHeaders } from "./sign";

export class StrikeError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string,
  ) {
    super(`Strike ${status} on ${path}: ${body.slice(0, 300)}`);
  }
}

const isServer = typeof window === "undefined";

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(isServer ? SERVER_HEADERS : {}), ...(init.headers as Record<string, string>) };
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new StrikeError(res.status, text, new URL(url).pathname);
  return (text ? JSON.parse(text) : {}) as T;
}

export type Chain = "cardano" | "ethereum" | "solana";

/** Public, unauthenticated reads. Anyone can make these calls, which is the point. */
export function publicApi(network: Network) {
  const a = api(network);
  return {
    host: a.host,
    markets: () => call<{ markets: Record<string, MarketConfig> }>(`${a.rest}/v2/markets`),
    time: () => call<{ serverTime: number }>(`${a.rest}/v2/time`),
    ticker24h: () => call<{ symbol: string; lastPrice: string; quoteVolume: string; priceChangePercent: string }[]>(`${a.price}/v2/ticker/24hr`),
    markPrice: (symbol: string) => call<{ symbol: string; markPrice: string; indexPrice: string }>(`${a.price}/v2/markPrice?symbol=${symbol}`),
    depth: (symbol: string, limit = 20) => call<{ bids: [string, string][]; asks: [string, string][] }>(`${a.price}/v2/depth?symbol=${symbol}&limit=${limit}`),
    fills: (accountId: string, limit = 500) => call<{ fills: PublicFill[] | null }>(`${a.rest}/v2/history/fill?account_id=${accountId}&limit=${limit}`),
    accountByAddress: (address: string) => call<{ account_id?: string; id?: string }>(`${a.rest}/v2/account?blockchain_address=${encodeURIComponent(address)}`),
    transactions: (accountId: string) => call<{ transactions?: PublicTransaction[] | null }>(`${a.rest}/v2/history/transaction?account_id=${accountId}&limit=200`),
    balances: (accountId: string) => call<unknown>(`${a.rest}/v2/balances?account_id=${accountId}`),
    positions: (accountId: string) => call<{ positions?: PublicPosition[] | null }>(`${a.rest}/v2/positions?account_id=${accountId}`),
  };
}

/** Builder Connect: two public calls. The user's wallet signs in between. */
export function builderConnect(network: Network) {
  const a = api(network);
  return {
    requestSignature: (p: { address: string; chain: Chain; public_key: string; fee_share_bps: number; code?: string }) =>
      call<{ nonce: string; message_to_sign: string }>(`${a.rest}/auth/builder/request-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: BUILDER_CODE, ...p }),
      }),
    verifySignature: (p: { nonce: string; wallet_signature: string }) =>
      call<{ account_id: string; builder_code: string; fee_share_bps: number; api_wallet_public_key: string; api_wallet_expired_at: string }>(
        `${a.rest}/auth/builder/verify-signature`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) },
      ),
  };
}

/** Signed calls with an API wallet. Keys sign in the browser; nothing secret reaches Raid's server. */
export function tradingApi(network: Network, signer: ApiWalletSigner, clockOffsetMs = 0) {
  const a = api(network);
  async function signed<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown, extra: Record<string, string> = {}) {
    const raw = body === undefined ? "" : JSON.stringify(body);
    const auth = await signedHeaders(signer, method, path, raw, clockOffsetMs);
    return call<T>(`${a.rest}${path}`, {
      method,
      body: raw || undefined,
      headers: { ...auth, ...(raw ? { "Content-Type": "application/json" } : {}), ...extra },
    });
  }
  return {
    account: () => signed<Record<string, unknown>>("GET", "/v2/account"),
    balances: () => signed<unknown>("GET", "/v2/balances"),
    positions: () => signed<{ positions?: PublicPosition[] | null }>("GET", "/v2/positions"),
    setLeverage: (symbol: string, leverage: number) => signed("POST", "/v2/leverage", { symbol, leverage }),
    order: (o: OrderRequest, builderFeeBps?: number) =>
      signed<{ client_order_id: string; status: string; sequence_id?: number }>(
        "POST",
        "/v2/order",
        o,
        builderFeeBps ? { "X-Builder-Fee-Bps": String(builderFeeBps) } : {},
      ),
    depositQuote: (blockchain: Chain, asset_symbol: string, asset_amount: string) =>
      signed<{ request_id: string; quote: { usd_value: string; exchange_rate: string; expiration_at: number }; deposit_address: string }>(
        "POST",
        "/v2/deposit/quote",
        { blockchain, asset_symbol, asset_amount },
      ),
    depositBuildTx: (request_id: string, user_address: string, utxos?: string[]) =>
      signed<{ blockchain: Chain; unsigned_tx: unknown; format: string; expires_at?: number }>("POST", "/v2/deposit/build-tx", {
        request_id,
        user_address,
        ...(utxos ? { utxos } : {}),
      }),
    depositConfirm: (request_id: string, tx_hash: string) =>
      signed<{ request_id: string; status: string }>("POST", "/v2/deposit", { request_id, tx_hash }),
  };
}

export interface OrderRequest {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  size: string;
  price?: string;
  client_order_id?: string;
  reduce_only?: boolean;
  post_only?: boolean;
  time_in_force?: "GTC" | "IOC" | "FOK";
  slippage?: string;
}

export interface MarketConfig {
  symbol: string;
  status: string;
  base_prec: number;
  quote_prec: number;
  default_leverage: number;
  order_market_min_size?: string;
  order_market_step_size?: string;
  order_limit_step_size?: string;
  order_tick_price?: string;
  order_min_notional?: string;
  mark_price?: string;
  margin_tiers: { max_notional: string; max_leverage: number; maintenance_margin_rate: string; maintenance_amount: string }[];
  [k: string]: unknown;
}

export interface PublicFill {
  id: number;
  trade_id: number;
  order_id: number;
  account_id: string;
  symbol: string;
  side: "buy" | "sell";
  role: "maker" | "taker";
  price: string;
  size: string;
  realized_pnl: string;
  fee: string;
  fee_type: string;
  timestamp: number;
  auto_close_type: string;
  client_order_id: string;
}

export interface PublicTransaction {
  type?: string;
  amount?: string;
  usd_value?: string;
  asset?: string;
  status?: string;
  timestamp?: number;
  [k: string]: unknown;
}

export interface PublicPosition {
  symbol: string;
  size: string;
  entry_price: string;
  mark_price?: string;
  leverage?: number;
  liquidation_price?: string;
  unrealized_pnl?: string;
  [k: string]: unknown;
}
