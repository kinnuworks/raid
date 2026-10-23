import Link from "next/link";
import { LIVE_NETWORK } from "@/lib/strike/config";

const NAV = [
  { href: "/", label: "Map" },
  { href: "/recruits", label: "Recruits" },
  { href: "/proof", label: "Proof of Fees" },
  { href: "/rules", label: "Rules" },
];

export function SiteHeader() {
  return (
    <header className="rule-b">
      <div aria-hidden className="flex h-1.5">
        {["--vermilion", "--ultramarine", "--ochre", "--field", "--plum"].map((c) => (
          <span key={c} className="flex-1" style={{ background: `var(${c})` }} />
        ))}
      </div>
      <div className="mx-auto flex max-w-[1400px] items-stretch gap-6 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 py-3" aria-label="Raid home">
          <RaidMark />
          <span className="display text-[34px]">Raid</span>
        </Link>
        <nav className="hidden items-stretch md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex min-h-11 items-center px-3 text-[14px] font-semibold hover:bg-[var(--paper-2)]">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="label hidden sm:inline">
            Live on <span className="num text-ink">{LIVE_NETWORK}</span>
          </span>
          <Link href="/join" className="btn" style={{ background: "var(--vermilion)" }}>
            Enlist
          </Link>
        </div>
      </div>
    </header>
  );
}

/** A square counter with a pennant: the piece you push across the board. */
export function RaidMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
      <rect x="1" y="1" width="28" height="28" fill="var(--ink)" />
      <path d="M9 23V7l12 4.5L11 16" fill="none" stroke="var(--paper)" strokeWidth="2.6" strokeLinejoin="miter" />
      <rect x="1" y="1" width="28" height="28" fill="none" stroke="var(--ink)" strokeWidth="2" />
    </svg>
  );
}
