import { Suspense } from "react";
import { connection } from "next/server";
import { Loading } from "@/components/Loading";
import { seasonSnapshot } from "@/lib/season";
import { BUILDER_FEE_BPS } from "@/lib/strike/config";
import { Provenance } from "@/components/Provenance";
import { Recompute } from "./Recompute";

async function ProofPageContent() {
  await connection();
  const s = await seasonSnapshot();
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-24 pt-8 md:px-8">
      <p className="kicker">Proof of Fees</p>
      <h1 className="display mt-2 text-[clamp(40px,6vw,76px)]">Check every fee yourself</h1>
      <div className="mt-4 grid gap-6 text-[16px] text-ink-2 md:grid-cols-2">
        <p>
          Every order Raid sends carries a public tag in Strike&apos;s <span className="num text-ink">client_order_id</span>:{" "}
          <span className="num text-ink">raid:v1:&lt;army&gt;:&lt;bps&gt;:&lt;nonce&gt;</span>. Strike shows that tag in each account&apos;s public fill history.
        </p>
        <p>
          The builder fee on a fill is floor(price × size × {BUILDER_FEE_BPS} ÷ 10,000), counted on orders that take liquidity. Press the button and your browser
          fetches the fills from Strike and adds them up without asking Raid.
        </p>
      </div>
      <p className="mt-8 border-l-4 border-ink pl-4 text-[18px]">
        This season Raid has earned <span className="num font-semibold">${Object.values(s.fees).reduce((a, f) => a + f.builderFee, 0).toFixed(2)}</span> in builder fees
        across <span className="num font-semibold">{Object.values(s.fees).reduce((a, f) => a + f.fills, 0)}</span> tagged fills, and every cent of it is in
        Strike&apos;s public data.
      </p>
      <div className="mt-6">
        <Recompute server={s.fees} accounts={s.members.map((m) => m.account_id)} seasonStart={s.seasonStart} />
      </div>
      <Provenance className="mt-10" generatedAt={s.computedAt} rows={Object.entries(s.sources)} footnote={`Season started ${s.seasonStart}. ${s.members.length} enlisted accounts.`} />
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
