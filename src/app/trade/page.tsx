import { TradeShell } from "./TradeShell";

export default function TradePage() {
  return (
    <main className="mx-auto max-w-[1300px] px-4 pb-24 pt-8 md:px-8">
      <p className="kicker">Field terminal</p>
      <h1 className="display mt-2 text-[clamp(40px,5vw,64px)]">Take the field</h1>
      <div className="mt-6">
        <TradeShell />
      </div>
    </main>
  );
}
