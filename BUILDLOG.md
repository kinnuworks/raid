# Build log

Times are UTC. The hackathon ran from Oct 21 14:00 to Oct 23 14:00.

## Oct 22

**13:00 Research.**
- Read Strike's docs, OpenAPI specs and reference app, and probed every public endpoint on mainnet and testnet.
- Mapped the 2,000 Cardano wallets on the leaderboard to the tokens they hold.
- Found that 501 of them hold SNEK, 538 HOSKY and 1,009 NIGHT. Raid comes from that finding.

**15:20 Checked the platform before committing to the design.**
- Testnet is up and answers in about 0.3 s.
- Custom `client_order_id` tags show up in public fills, which makes Proof of Fees possible.
- Strike's API accepts browser calls, so the trading key can stay in the browser.
- Python's default user agent gets a 403.

**16:20 Season 0 at full scale.**
- Resolved 1,975 stake keys through Koios and ranked 15 armies.
- Confirmed on 252 testnet trades that both sides of a trade share one `trade_id`. The wash filter depends on this.

**18:45 Testnet setup.**
- Registered builder code `raid`.
- Minted labelled stand-in tokens (tSNEK and the rest) and funded ten demo wallets in one preprod transaction (`f6849951…`).

**19:00 Scoring library and tests.**
- A unit test caught a floating-point error in the fee formula: 2443.07 × 0.01 × 10 bps floored to 0.02443069. The formula now runs in integers.

**19:10 First tagged fill on Strike testnet:** `raid:v1:snek:10:6135e7c4-06d`, trade 18491.

**19:20 Live season.**
- All ten wallets enlisted through Builder Connect and deposited through Strike's own deposit flow, $327.75 in total.
- A staged wash trade (ETH-USD 18498) was dropped.
- A wallet funded by its recruiter (`05ecb870…`) was rejected.

**19:30 to 21:00 Map and pages.**
- Rebuilt the board as a hex map with region borders and counter chits.
- Added the 7-day replay from real daily snapshots.
- STRIKE-only wallets became a grey garrison, because in full colour they covered 20 of 33 tiles and hid the community race.
- Added share cards, the embed and a read-only trade preview.

**20:45 Deployed** to https://raid-armies.vercel.app.

**21:30 Hardening.**
- Added a "flagged" status, so a wash trader no longer counts as a recruit.
- Capped fees at $5 per wallet per market per day, so overtrading can't buy ground.
- Funding is now traced two hops back.
- The proof stamp now says exactly what it checks.
- Wrote down the known limits.

**21:55 Added `pnpm proof` and CLAIMS.md.** Every claim now points to evidence rebuilt from public data.

## Oct 23

**00:03 Second UTC trading day for the three recruits.** This is the first day they can confirm under the two-day rule.
- rec-1 and rec-2 confirmed.
- rec-3's sell found no bids within its slippage limit, so Strike cancelled it unfilled. Its retry as a buy filled, and rec-3 confirmed too.

**00:10 The live season stands as follows:**
- 3 recruits confirmed.
- 1 wallet flagged, because every trade it made was against another Raid account.
- 1 wallet rejected, because its recruiter funded it on-chain.
- SNEK's recruit score is 0.391, and $0.34 in builder fees have been collected.
