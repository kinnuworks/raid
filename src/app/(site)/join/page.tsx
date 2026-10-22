import { Suspense } from "react";
import { connection } from "next/server";
import { Loading } from "@/components/Loading";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { memberByInvite } from "@/lib/db";
import { LIVE_NETWORK } from "@/lib/strike/config";
import { Enlist } from "./Enlist";

async function JoinPageContent(props: PageProps<"/join">) {
  await connection();
  const sp = await props.searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : undefined;
  const recruiter = ref ? await memberByInvite(ref) : null;
  const army = recruiter ? ARMY_BY_SLUG[recruiter.army] : undefined;
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-24 pt-8 md:px-8">
      <p className="kicker">Enlist · Strike {LIVE_NETWORK}</p>
      <h1 className="display mt-2 text-[clamp(40px,6vw,76px)]">{army ? `${army.ticker} wants you on the front` : "Join your army"}</h1>
      <p className="mt-3 max-w-[60ch] text-[17px] text-ink-2">
        Your wallet already says which communities you belong to. Pick one, sign once, and every trade you make on Strike through Raid counts for it.
      </p>
      <div className="mt-8">
        <Enlist refCode={recruiter ? ref : undefined} recruiterArmy={recruiter?.army} />
      </div>
    </main>
  );
}

export default function JoinPage(props: PageProps<"/join">) {
  return (
    <Suspense fallback={<Loading text="Opening the enlistment desk…" />}>
      <JoinPageContent {...props} />
    </Suspense>
  );
}
