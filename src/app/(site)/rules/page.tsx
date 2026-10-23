import { RECRUIT_RULES } from "@/lib/score";
import { BUILDER_FEE_BPS, LIVE_NETWORK } from "@/lib/strike/config";
import { PageHead, Section } from "@/components/Section";

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

/** Rules are grouped so the page reads top to bottom: who you fight for, how ground is scored, then the limits. */
const GROUPS: { id: string; label: string; title: string; rules: number[] }[] = [
  { id: "armies", label: "Armies", title: "Who you fight for", rules: [0, 1] },
  { id: "scoring", label: "Scoring", title: "How ground is won", rules: [2, 3, 4] },
  { id: "recruits", label: "Recruits", title: "New traders count most", rules: [5] },
  { id: "guardrails", label: "Guardrails and spoils", title: "Limits, and what the winners get", rules: [6, 7] },
  { id: "fees", label: "Fees and known limits", title: "What Raid charges, and what it can't see", rules: [9, 8] },
];

export default function RulesPage() {
  let n = 0;
  return (
    <main className="pb-24">
      <PageHead kicker={`Rules of engagement · live on Strike ${LIVE_NETWORK}`} title="How a market is claimed">
        <p>
          {RULES.length} rules decide which army holds each market and which recruits count. Where a rule is a calculation, the formula sits right under it.
        </p>
        <ol className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink">
          {GROUPS.map((g, i) => (
            <li key={g.id}>
              <a href={`#${g.id}`} className="link font-semibold">
                <span className="num mr-1.5 text-[12px] text-ink-2">{String(i + 1).padStart(2, "0")}</span>
                {g.label}
              </a>
            </li>
          ))}
        </ol>
      </PageHead>
      {GROUPS.map((g, gi) => (
        <Section key={g.id} id={g.id} n={gi + 1} label={g.label} title={g.title} band={gi % 2 === 1}>
          <ol>
            {g.rules.map((ri) => {
              const r = RULES[ri];
              n++;
              return (
                <li key={r.h} className="grid grid-cols-[44px_1fr] gap-4 border-t border-[var(--rule-strong)] py-6 first:border-t-0 first:pt-0 md:grid-cols-[64px_1fr]">
                  <span className="num pt-1 text-[15px] font-semibold"><span className="hidden md:inline">Rule </span>{n}</span>
                  <div>
                    <h3 className="display text-[26px]">{r.h}</h3>
                    <p className="mt-2 max-w-[68ch] text-[16px] leading-relaxed text-ink-2">{r.body}</p>
                    {r.formula && <p className="num mt-3 max-w-[90ch] border-l-2 border-ink bg-[var(--paper-3)] px-3 py-2 text-[13px]">{r.formula}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      ))}
    </main>
  );
}
