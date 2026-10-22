"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { builderConnect } from "@/lib/strike/client";
import { BUILDER_FEE_BPS, LIVE_NETWORK } from "@/lib/strike/config";
import { webCryptoSigner } from "@/lib/strike/signers";
import { newKeyPair, saveSession } from "@/lib/wallet/apiKey";
import { type CardanoWalletInfo, type ConnectedCardano, connectCardano, listCardanoWallets, signMessageCardano } from "@/lib/wallet/cardano";

type Step = "pick" | "reading" | "choose" | "signing" | "done" | "error";

interface Holdings {
  address: string;
  stakeKey: string | null;
  armies: string[];
}

export function Enlist({ refCode, recruiterArmy }: { refCode?: string; recruiterArmy?: string }) {
  const [wallets, setWallets] = useState<CardanoWalletInfo[]>([]);
  const [step, setStep] = useState<Step>("pick");
  const [conn, setConn] = useState<ConnectedCardano | null>(null);
  const [holdings, setHoldings] = useState<Holdings | null>(null);
  const [army, setArmy] = useState<string | null>(recruiterArmy ?? null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ account_id: string; invite_code: string; is_recruit: boolean } | null>(null);

  useEffect(() => {
    // Wallet extensions inject themselves after load; look twice.
    setWallets(listCardanoWallets());
    const t = setTimeout(() => setWallets(listCardanoWallets()), 600);
    return () => clearTimeout(t);
  }, []);

  async function pick(id: string) {
    setError(null);
    setStep("reading");
    try {
      const c = await connectCardano(id);
      const expected = LIVE_NETWORK === "mainnet" ? 1 : 0;
      if (c.networkId !== expected) throw new Error(`Switch your wallet to ${LIVE_NETWORK === "mainnet" ? "Mainnet" : "Preprod"} and try again.`);
      setConn(c);
      const res = await fetch(`/api/holdings?address=${c.address}`);
      const h = (await res.json()) as Holdings & { error?: string };
      if (!res.ok) throw new Error(h.error ?? "Couldn't read this wallet's holdings");
      setHoldings(h);
      if (recruiterArmy && h.armies.includes(recruiterArmy)) setArmy(recruiterArmy);
      else if (h.armies.length === 1) setArmy(h.armies[0]);
      setStep("choose");
    } catch (e) {
      setError((e as Error).message);
      setStep("error");
    }
  }

  async function enlist() {
    if (!conn || !army) return;
    setError(null);
    setStep("signing");
    try {
      const pair = await newKeyPair();
      const signer = await webCryptoSigner(pair);
      const bc = builderConnect(LIVE_NETWORK);
      const challenge = await bc.requestSignature({ address: conn.address, chain: "cardano", public_key: signer.publicKeyHex, fee_share_bps: BUILDER_FEE_BPS });
      const signature = await signMessageCardano(conn, challenge.message_to_sign);
      const verified = await bc.verifySignature({ nonce: challenge.nonce, wallet_signature: signature });
      await saveSession({ pair, accountId: verified.account_id, address: conn.address, chain: "cardano", network: LIVE_NETWORK, expiresAt: verified.api_wallet_expired_at });
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: verified.account_id, address: conn.address, army, ref: refCode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't register membership");
      setResult(body.member);
      setStep("done");
    } catch (e) {
      setError((e as Error).message);
      setStep("error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <ol className="space-y-0">
        <StepRow n={1} title="Connect a wallet" active={step === "pick" || step === "reading"} done={!!conn}>
          {wallets.length === 0 ? (
            <div className="border-l-4 border-[var(--alert)] pl-4">
              <p className="font-semibold">No Cardano wallet in this browser.</p>
              <p className="mt-1 text-ink-2">Install one, switch it to {LIVE_NETWORK === "mainnet" ? "Mainnet" : "Preprod"}, then reload this page.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["Lace", "https://www.lace.io"],
                  ["Eternl", "https://eternl.io"],
                  ["Vespr", "https://vespr.xyz"],
                ].map(([n, href]) => (
                  <a key={n} href={href} target="_blank" rel="noopener noreferrer" className="btn ghost">
                    Get {n}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-ink-2">
                Just looking? The <Link href="/trade" className="link">field terminal</Link> shows a real recruit&apos;s account read-only.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {wallets.map((w) => (
                <button key={w.id} className="btn ghost gap-2" onClick={() => pick(w.id)} disabled={step === "reading" || step === "signing"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {w.icon && <img src={w.icon} alt="" width={18} height={18} />}
                  {w.name}
                </button>
              ))}
            </div>
          )}
          {step === "reading" && <p className="num mt-3 text-[13px] text-ink-2">Reading holdings from chain…</p>}
          {conn && <p className="num mt-3 break-all text-[12px] text-ink-2">{conn.address}</p>}
        </StepRow>

        <StepRow n={2} title="Pick your army" active={step === "choose"} done={!!army && step !== "choose" && !!holdings}>
          {holdings && holdings.armies.length === 0 && (
            <p className="text-ink-2">
              This wallet holds none of the army tokens. On mainnet that means SNEK, HOSKY, NIGHT and twelve others; on testnet, their t-prefixed stand-ins.
            </p>
          )}
          {holdings && holdings.armies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {holdings.armies.map((slug) => {
                const a = ARMY_BY_SLUG[slug];
                const on = army === slug;
                return (
                  <button
                    key={slug}
                    onClick={() => setArmy(slug)}
                    className="flex min-h-11 items-center gap-2 border-2 px-3"
                    style={{ borderColor: "var(--ink)", background: on ? a.ink : "transparent", color: on ? "var(--paper)" : "var(--ink)" }}
                    aria-pressed={on}
                  >
                    <span className="display text-[20px]">{a.ticker}</span>
                  </button>
                );
              })}
            </div>
          )}
          {refCode && <p className="mt-3 text-[13px] text-ink-2">Recruited by invite <span className="num">{refCode}</span>. You count for them only after you trade on two separate days.</p>}
        </StepRow>

        <StepRow n={3} title="Sign once to enlist" active={step === "choose" || step === "signing"} done={step === "done"}>
          <p className="max-w-[60ch] text-ink-2">
            Your wallet signs one message from Strike. That creates your Strike account and a trading key that lives only in this browser. The key can place
            orders but can never withdraw: withdrawals always go back to this wallet and need its signature.
          </p>
          <button className="btn mt-4" onClick={enlist} disabled={!army || step === "signing"}>
            {step === "signing" ? "Waiting for your wallet…" : army ? `Enlist in ${ARMY_BY_SLUG[army].ticker}` : "Pick an army first"}
          </button>
        </StepRow>
      </ol>

      <aside className="self-start">
        {step === "error" && (
          <div className="border-2 border-[var(--loss)] p-4">
            <p className="label" style={{ color: "var(--loss)" }}>
              Stopped
            </p>
            <p className="mt-1">{error}</p>
            <button className="btn ghost mt-3" onClick={() => setStep(conn ? "choose" : "pick")}>
              Try again
            </button>
          </div>
        )}
        {step === "done" && result && army && (
          <div className="border-2 border-ink p-4">
            <span className="stamp">Enlisted</span>
            <p className="display mt-3 text-[34px]">Welcome to {ARMY_BY_SLUG[army].ticker}</p>
            <p className="num mt-2 break-all text-[12px] text-ink-2">Strike account {result.account_id}</p>
            <p className="label mt-4">Your recruit link</p>
            <p className="num mt-1 break-all border border-ink bg-[var(--paper-2)] p-2 text-[13px]">
              {typeof window !== "undefined" ? window.location.origin : ""}/r/{result.invite_code}
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/trade" className="btn">
                Deposit and trade
              </Link>
              <Link href={`/army/${army}`} className="btn ghost">
                Army page
              </Link>
            </div>
          </div>
        )}
        {step !== "error" && step !== "done" && (
          <div className="border border-[var(--rule-strong)] p-4 text-[14px] text-ink-2">
            <p className="label">What Raid checks</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Strike links your account to this wallet.</li>
              <li>The chain shows this wallet holds your army&apos;s token.</li>
              <li>Trades with other Raid accounts never score.</li>
              <li>Raid adds a {BUILDER_FEE_BPS / 100}% builder fee to orders that take liquidity, and nothing to orders that add it.</li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function StepRow({ n, title, active, done, children }: { n: number; title: string; active: boolean; done: boolean; children: React.ReactNode }) {
  return (
    <li className={`grid grid-cols-[48px_1fr] gap-4 border-t border-[var(--rule)] py-5 ${active || done ? "" : "opacity-50"}`}>
      <span
        className="num flex h-10 w-10 items-center justify-center border-2 border-ink text-[16px] font-semibold"
        style={{ background: done ? "var(--ink)" : "transparent", color: done ? "var(--paper)" : "var(--ink)" }}
      >
        {done ? "✓" : n}
      </span>
      <div>
        <h2 className="display text-[26px]">{title}</h2>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}
