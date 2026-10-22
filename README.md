# Raid

**Your token is your army. Take Strike's markets.**

Raid turns Cardano token communities (SNEK, HOSKY, NIGHT and eleven more) into trading armies on [Strike](https://strikefinance.org). Armies claim Strike's markets by bringing traders who pay real fees. They also compete to recruit new traders who stay. Trades between Raid accounts never score, recruits funded by a member are rejected, and every score and every builder fee can be recomputed from Strike's public API.

Built for the first Strike Hackathon (Oct 21 to 23, 2026) by Dhiraj Kavuri ([@heykinnu](https://x.com/heykinnu)).

- Live app: https://raid-armies.vercel.app
- Demo video: _link added after recording_
- Every claim, with evidence and the command that re-checks it: [CLAIMS.md](CLAIMS.md)

## Why it exists

Strike has about 6,100 users and 300 traders a day, and ten accounts do 85% of its volume. Its biggest gap is new traders.

Meanwhile 1,538 of the wallets on Strike's leaderboard already hold a Cardano community token, and 501 of them hold SNEK. Communities like these already coordinate on X every day. Raid gives them a reason to bring their members to Strike, and it pays them for it through Strike's Builder Codes.

## What is live and what is not

| Part | Status |
| --- | --- |
| Season 0 map from Strike mainnet (2,997 accounts, 1,998 stake keys, 13,254 fills) | Live, rebuilt with one command |
| 7-day replay of the map | Live, from real daily snapshots |
| Enlistment through Strike Builder Connect, builder code `raid` | Live on Strike testnet |
| Deposits through Strike's deposit flow (CIP-30) | Live on testnet; 10 demo wallets deposited about $32 each |
| Tagged orders with a 10 bps builder fee | Live on testnet, visible in Strike's public fills |
| Wash-trade filter across armies | Live; a staged wash trade between two members was dropped |
| Funding-source check on recruits | Live; a wallet funded by its recruiter was rejected |
| Two-day recruit confirmation | Live; it confirms on the second UTC trading day |
| Proof of Fees recomputed in the browser | Live; it matches the server to 8 decimals |
| Share cards for X, embeddable army card | Live |
| Mainnet trading | One env var away (`NEXT_PUBLIC_RAID_NETWORK=mainnet`). Not run, because the team is in a country on Strike's restricted list |
| Treasury payouts to communities | Accrued and shown per army. The end-of-season claim (below) is specified, not built |

### Why testnet

The team is based in India, which is on Strike's restricted list. Before building, we asked in Strike's Discord whether a builder there could enter using the public API and run everything live on testnet, with no mainnet trading and no VPN. Shan replied: "its fine use it 🫡". Season 0 reads mainnet public data only. All trading, onboarding and fees run on Strike testnet (Cardano preprod).

Testnet wallets can't hold the real community tokens, so the testnet season checks membership against stand-ins (tSNEK, tHOSKY, and so on) minted on preprod under Raid's own policy. The same code checks the real tokens on mainnet.

## How it uses Strike

- **Builder Connect** (`/auth/builder/request-signature`, `/auth/builder/verify-signature`). One wallet signature creates the Strike account and an API wallet tied to the `raid` builder code.
- **Deposits** (`/v2/deposit/quote`, `/build-tx`, `/v2/deposit`). Strike builds the transaction, and the user's Cardano wallet signs it. A hand-written CBOR splice adds the witnesses without touching the body bytes.
- **Orders** (`/v2/order`, `/v2/leverage`). Every order carries `X-Builder-Fee-Bps: 10` and a public tag in `client_order_id`: `raid:v1:<army>:<bps>:<nonce>`.
- **Public history** (`/v2/history/fill`, `/v2/history/transaction`, `/v2/account`, `/v2/positions`). Scoring, deposits and account ownership are all checked against data anyone can read.
- **Stats** (`/stat/v1/stats/leaderboard`) and markets (`/v2/markets`, `/price/v2/ticker/24hr`). Season 0 and the frontier weights come from these.
- **Koios**, mainnet and preprod. Raid resolves wallets to stake keys and token holdings, and traces a recruit's on-chain funding.

## Scoring

All scoring lives in `src/lib/score` as pure functions with unit tests.

- **Trades between Raid accounts are dropped.** Both sides of a Strike trade carry the same public `trade_id`. If a trade has a Raid account on both sides, in the same army or in rival armies, both fills are removed before anything is scored. We checked this on 252 testnet trades.
- **Markets.** Each day a market goes to the army whose distinct members paid the most fees there, scored as the sum of √fees per member. Ten traders beat one whale paying the same total.
- **Daily cap.** Fees count toward a market up to $5 per wallet per UTC day, so overtrading never buys ground.
- **Recruits.** A wallet that had never traded on Strike joins through a member's link. It counts once it has:
  - deposited at least $20
  - paid fees against a counterparty outside every army
  - not been funded on-chain by any Raid member
  - traded on two separate UTC days

  A confirmed recruit scores √(fees paid). Each recruiter is credited for at most 10.
- **Guardrails.** The order ticket shows the most you can lose and refuses orders past a daily cap. Recruits have a $50 season cap. Orders above 3x leverage never score. There is no wagering and no token buyback.

## Known limits

These are written down so nobody has to discover them.

- **Collusion with outside wallets.** Strike's public data shows when two Raid accounts trade with each other, and those trades are dropped. It does not show who sits on the other side of a trade with an account outside Raid. A recruit that trades only with an unenlisted colluding wallet is held back by cost, not by detection. The costs are:
  - a $20 deposit
  - fees on both sides
  - trades on two separate days
  - a $5-per-wallet daily fee cap
  - at most ten credited recruits per recruiter
- **Funding is traced two hops back** through Cardano transactions. Money routed through an exchange breaks the trail.
- **The fix needs Strike.** If Strike shared maker identity with builders, or published a market-maker allow-list, Raid would require every recruit to trade at least once against a known market maker. That closes the collusion path.
- **Testnet membership uses stand-in tokens** (tSNEK and others) that Raid minted, so on testnet the token check proves the mechanism, not real community membership. Mainnet reads the real tokens.

## Payouts (specified, not built)

1. At season end, Raid publishes a ledger: each army's builder-fee share, recomputed from tagged public fills, plus its root hash.
2. Each community names a treasury wallet by signing with a wallet that holds its token.
3. Raid withdraws its builder balance and sends each share in one transaction that references the ledger root.
4. Anyone can recompute the ledger from public fills and check the transaction.

## Proof of Fees

`/proof` lists builder fees by army. The **Recompute in my browser** button fetches every member's fills straight from Strike and recomputes `floor(price × size × bps ÷ 10,000)` in integer arithmetic. It then compares the result with Raid's server and stamps whether the browser and server agree. Both come from Strike's public fills. Strike's own builder ledger is visible to the code owner on Strike's builder dashboard.

Floating point gets this wrong. For example, 2443.07 × 0.01 × 10 ÷ 10,000 floors to 0.02443069 instead of 0.0244307. One of the unit tests caught that bug before it shipped.

## Security model

- **The trading key never leaves the browser.** It is a WebCrypto Ed25519 key created as non-extractable and kept in IndexedDB. Strike's API allows browser calls, so orders are signed and sent from the user's browser. Raid's server never holds anything that can trade.
- **The key can't withdraw.** Strike API wallets can trade but not withdraw. Withdrawals always go to the connected wallet and need its signature.
- **The server re-checks every enlistment** against public data. Strike must link the account to the wallet, and the chain must show the wallet holds the army's token.
- **The embed is a sandboxed iframe.** Enlisting opens Raid in a new tab, so a host page never sees a wallet or a key.

## Run it

```bash
pnpm install
cp .env.example .env.local   # testnet by default; leave DATABASE_URL empty to use the embedded Postgres
pnpm dev
```

```bash
pnpm test        # scoring, wash filter, recruit checks, fee math, CBOR witness merge
pnpm season0     # rebuild Season 0 from Strike mainnet and Koios
```

Testnet demo cast (keys stay in `scripts/.wallets`, which is gitignored):

```bash
pnpm testnet wallets                 # create the demo wallets
pnpm testnet mint-and-fund <addr…>   # mint tSNEK, tHOSKY, … and fund the wallets in one transaction
pnpm demo enlist snek-1              # Builder Connect plus registration with Raid
pnpm demo deposit snek-1 150         # Strike deposit flow from the wallet
pnpm demo trade snek-1 SOL-USD buy 25
pnpm demo wash snek-2 cheat-wash ETH-USD   # should be dropped by the wash filter
```

## Business case

Raid earns its builder fee of 10 bps on orders that take liquidity. Strike did about $8M a day over the last two weeks (`/stat/v1/dashboard/volumes`, $123M for October 1 to 21). Suppose armies bring $1M of daily taker volume. That pays $1,000 a day in builder fees, of which each army's share goes to its community treasury. It also means about $500 a day in Strike's own taker fees, from traders Strike did not have before.

Season 0 also gives Strike a ranked list of which communities already trade there and how many of their holders have not yet.

## Stack

Next.js 16 and React 19, TypeScript, Postgres (embedded PGlite locally), `@noble/ed25519`, WebCrypto, Satori for share cards and Vitest. The map is hand-built SVG.
