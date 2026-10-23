import { Suspense } from "react";
import { connection } from "next/server";
import { Loading } from "@/components/Loading";
import { seasonSnapshot } from "@/lib/season";
import { BUILDER_FEE_BPS } from "@/lib/strike/config";
import { Provenance } from "@/components/Provenance";
import { Recompute } from "./Recompute";
import { PageHead, Section } from "@/components/Section";

async function ProofPageContent() {
  await connection();
  const s = await seasonSnapshot();
  return (
    <main className="pb-24">
      <PageHead kicker={`Proof of Fees · Strike ${s.network}`} title="Check every fee yourself" wide>
      <div className="grid gap-6 text-[16px] md:grid-cols-2">
        <p>
          Every order Raid sends carries a public tag in Strike&apos;s <span className="num text-ink">client_order_id</span>:{" "}
          <span className="num text-ink">raid:v1:&lt;army&gt;:&lt;bps&gt;:&lt;nonce&gt;</span>. Strike shows that tag in each account&apos;s public fill history.
        </p>
        <p>
          The builder fee on a fill is floor(price × size × {BUILDER_FEE_BPS} ÷ 10,000), counted on orders that take liquidity. Press the button and your browser
          fetches the fills from Strike and adds them up without asking Raid. Both columns come from Strike&apos;s public fills; Strike&apos;s own builder ledger is
          shown to the code owner on Strike&apos;s builder dashboard and should match.
        </p>
      </div>
      <p className="pop mt-8 px-5 py-4 text-[18px] text-[var(--paper)]" style={{ background: "var(--ultramarine)" }}>
        This season Raid has earned <span className="num font-semibold">${Object.values(s.fees).reduce((a, f) => a + f.builderFee, 0).toFixed(2)}</span> in builder fees
        across <span className="num font-semibold">{Object.values(s.fees).reduce((a, f) => a + f.fills, 0)}</span> tagged fills, and every cent of it is in
        Strike&apos;s public data.
      </p>
      </PageHead>
      <Section id="recompute" n={1} label="Recompute" title="Builder fees by army" note="The left column is Raid's count. Press the button to fill the right column from Strike, in your browser.">
        <Recompute server={s.fees} accounts={s.members.map((m) => m.account_id)} seasonStart={s.seasonStart} />
      </Section>
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <Provenance generatedAt={s.computedAt} rows={Object.entries(s.sources)} footnote={`Season started ${s.seasonStart}. ${s.members.length} enlisted accounts.`} />
      </div>
    </main>
  );
}

export default function ProofPage() {
  return (
    <Suspense fallback={<Loading text="Loading the receipt from Strike…" />}>
      <ProofPageContent  />
    </Suspense>
  );
}
