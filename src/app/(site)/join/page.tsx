import { Suspense } from "react";
import { connection } from "next/server";
import { Loading } from "@/components/Loading";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { memberByInvite } from "@/lib/db";
import { LIVE_NETWORK } from "@/lib/strike/config";
import { Enlist } from "./Enlist";
import { PageHead, Section } from "@/components/Section";

async function JoinPageContent(props: PageProps<"/join">) {
  await connection();
  const sp = await props.searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : undefined;
  const recruiter = ref ? await memberByInvite(ref) : null;
  const army = recruiter ? ARMY_BY_SLUG[recruiter.army] : undefined;
  return (
    <main className="pb-24">
      <PageHead kicker={`Enlist · Strike ${LIVE_NETWORK}`} title={army ? `${army.ticker} wants you on the front` : "Join your army"}>
        <p>Your wallet already says which communities you belong to. Pick one, sign once, and every trade you make on Strike through Raid counts for it.</p>
      </PageHead>
      <Section id="enlist" n={1} label="Three steps" title="Connect, pick, sign">
        <Enlist refCode={recruiter ? ref : undefined} recruiterArmy={recruiter?.army} />
      </Section>
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
