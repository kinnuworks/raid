# Claims and how to check them

Each claim Raid makes is listed here with its evidence file and the command that rebuilds it. `pnpm proof` reads only public sources (Strike's testnet API and Cardano preprod through Koios) and rewrites `docs/proof/`. `pnpm season0` does the same for the mainnet map.

| # | Claim | Evidence | Re-check |
| --- | --- | --- | --- |
| 1 | Ten Strike accounts were created through Builder Connect with the `raid` builder code. Strike links each one to the wallet shown | [`docs/proof/1-builder-connect-accounts.json`](docs/proof/1-builder-connect-accounts.json) (`allMatch: true`) | `pnpm proof` |
| 2 | Every demo wallet deposited through Strike's deposit flow: quote, build-tx, wallet signature, confirm. That is 10 deposits, $327.75 in total | [`docs/proof/2-deposits.json`](docs/proof/2-deposits.json) | `pnpm proof` |
| 3 | Orders sent through Raid carry the public tag `raid:v1:<army>:<bps>:<nonce>` and a 10 bps builder fee | [`docs/proof/3-tagged-fills-and-fees.json`](docs/proof/3-tagged-fills-and-fees.json) | `pnpm proof`, or the **Recompute in my browser** button on `/proof` |
| 4 | A trade with a Raid account on both sides is found by its shared public `trade_id` and dropped. ETH-USD trade 18498 (snek-2 maker, cheat-wash taker) is the staged example | [`docs/proof/4-wash-trades-dropped.json`](docs/proof/4-wash-trades-dropped.json) | `pnpm proof` |
| 5 | A recruit funded on-chain by its recruiter is rejected. Preprod transaction `05ecb870…a96b` sent funds from snek-1 to cheat-fund | [`docs/proof/5-funding-check.json`](docs/proof/5-funding-check.json) | `pnpm proof`, then `/recruits` |
| 6 | Testnet armies use labelled stand-in tokens (tSNEK and others), minted in preprod transaction `f6849951…c76a` under Raid's own policy | [`docs/proof/6-testnet-stand-in-tokens.json`](docs/proof/6-testnet-stand-in-tokens.json) | Open the explorer link in the file |
| 7 | The Season 0 map is built from Strike mainnet: 2,997 leaderboard accounts, 1,998 Cardano stake keys and 13,000+ fills, with trades between army members dropped | [`src/data/season0.json`](src/data/season0.json) (`totals`, `sources`) | `pnpm season0` |
| 8 | Builder fees match `floor(price × size × bps ÷ 10,000)` to 8 decimals, computed in integers | [`src/lib/score/score.test.ts`](src/lib/score/score.test.ts) | `pnpm test` |
| 9 | The trading key can't be exported from the browser and never reaches Raid's server | [`src/lib/wallet/apiKey.ts`](src/lib/wallet/apiKey.ts) (`extractable: false`), [`src/lib/strike/client.ts`](src/lib/strike/client.ts) (calls go to Strike directly) | Read the code; Strike's API allows browser calls |
| 10 | Recruits confirm only after trading on two separate UTC days | [`src/lib/score/index.ts`](src/lib/score/index.ts) `checkRecruit`, and the tests | `pnpm test`, then `/recruits` after 00:00 UTC |

What is not claimed is listed under "Known limits" and "What is live and what is not" in the [README](README.md).
