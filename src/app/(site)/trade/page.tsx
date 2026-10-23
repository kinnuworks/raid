import { TradeShell } from "./TradeShell";
import { PageHead } from "@/components/Section";

export default function TradePage() {
  return (
    <main className="pb-24">
      <PageHead kicker="Field terminal" title="Take the field" />
      <div className="border-t-2 border-ink">
        <div className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8 md:pt-10">
          <TradeShell />
        </div>
      </div>
    </main>
  );
}
