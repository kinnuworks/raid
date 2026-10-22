import { RECRUIT_RULES } from "@/lib/score";
import { BUILDER_FEE_BPS, LIVE_NETWORK } from "@/lib/strike/config";

const RULES: { h: string; body: React.ReactNode; formula?: string }[] = [
  {
    h: "Your wallet decides your army",
    body: "Raid reads the tokens your wallet holds. If it holds SNEK you can join SNEK; if it holds several, you pick one for the season. On Strike's testnet the same check runs against labelled stand-ins (tSNEK, tHOSKY…) minted on Cardano preprod.",
  },
  {
    h: "Season 0 reads the armies straight from Strike's mainnet",
    body: "Every Cardano wallet on Strike's public leaderboard is matched to the tokens it holds. Most Strike traders hold STRIKE and many got the NIGHT airdrop, so a wallet holding several army tokens fights for the rarest of them among Strike traders: the clearest sign of which community it belongs to. Wallets that hold only STRIKE fight for the home army.",
  },
  {
    h: "A market goes to the army whose traders pay the most fees there",
    body: "Each day, every distinct member contributes the square root of the fees they paid on that market. Ten traders paying $1 each beat one whale paying $10.",
    formula: "tile score(army, market) = Σ over members √(fees paid by that member on that market)",
  },
  {
    h: "Trades between Raid accounts never count",
    body: "Both sides of a Strike trade carry the same public trade_id. When a trade has a Raid account on both sides, in the same army or in rival armies, both fills are dropped before anything is scored.",
  },
  {
    h: "No wallet can buy ground",
    body: "Fees count toward a market up to $5 per wallet per UTC day. Past that, more trading adds nothing to the army's score, so overtrading is never rewarded.",
    formula: "counted fees = Σ over days min($5, fees that wallet paid on that market that day)",
  },
  {
    h: "Recruits are the headline",
    body: `A recruit counts when a wallet that had never traded on Strike joins through a member's link, deposits at least $${RECRUIT_RULES.minDepositUsd}, pays fees against a counterparty outside every army, was not funded on-chain by any Raid member, and trades on ${RECRUIT_RULES.minTradingDays} separate UTC days. A recruiter is credited for at most ${RECRUIT_RULES.maxCreditedPerRecruiter} recruits a season.`,
    formula: "recruit score = √(fees the recruit paid to outside counterparties this season)",
  },
  {
    h: "Guardrails",
    body: `The order ticket shows the most you can lose before you confirm and refuses orders past your daily cap. Recruits have a $${RECRUIT_RULES.seasonLossCapUsd} season cap. Orders above 3x leverage never score. There is no wagering and no token buyback.`,
  },
  {
    h: "Spoils",
    body: "Each army's share of builder fees goes to a treasury wallet its community names, paid at the end of the season through a claim anyone can verify against the Proof of Fees ledger. The army holding the most markets flies its banner over the next season's map.",
  },
  {
    h: "Known limits",
    body: "Public data shows when two Raid accounts trade with each other, but not who sits on the other side of a trade with an outside wallet. A wallet that colludes with an unenlisted account is held back by cost (deposits, fees on both sides, two trading days, the daily cap and ten credited recruits per recruiter), not by detection. Funding is traced two hops back. With maker identity shared with builders, Raid would require every recruit to trade against a known market maker.",
  },
  {
    h: "Fees",
    body: `Orders that take liquidity carry a ${BUILDER_FEE_BPS} bps builder fee on top of Strike's own fee; orders that add liquidity carry none. Each army's share is computed from public fills on the Proof of Fees page.`,
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-[900px] px-4 pb-24 pt-8 md:px-8">
      <p className="kicker">Rules of engagement · live on Strike {LIVE_NETWORK}</p>
      <h1 className="display mt-2 text-[clamp(40px,6vw,76px)]">How a market is claimed</h1>
      <ol className="mt-8">
        {RULES.map((r, i) => (
          <li key={r.h} className="grid grid-cols-[44px_1fr] gap-4 border-t border-[var(--rule)] py-6">
            <span className="num text-[15px] font-semibold">{i + 1}</span>
            <div>
              <h2 className="display text-[26px]">{r.h}</h2>
              <p className="mt-2 max-w-[68ch] text-[16px] text-ink-2">{r.body}</p>
              {r.formula && <p className="num mt-3 border-l-2 border-ink bg-[var(--paper-2)] px-3 py-2 text-[13px]">{r.formula}</p>}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
