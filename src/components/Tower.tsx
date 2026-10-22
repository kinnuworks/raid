import Link from "next/link";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { fmtInt, fmtUsd } from "@/lib/format";

export interface TowerRow {
  slug: string;
  primary: number;
  primaryLabel: string;
  secondary?: string;
  tiles?: number;
}

/** Sports-broadcast timing tower on paper: rank, flag, army, value, gap to leader. */
export function Tower({ rows, unit, title, note }: { rows: TowerRow[]; unit: "usd" | "int"; title: string; note?: string }) {
  const leader = rows[0]?.primary ?? 0;
  const fmt = unit === "usd" ? fmtUsd : fmtInt;
  return (
    <section aria-label={title}>
      <div className="flex items-baseline justify-between rule-b pb-2">
        <h2 className="display text-[26px]">{title}</h2>
        {note && <span className="label">{note}</span>}
      </div>
      <ol>
        {rows.map((r, i) => {
          const a = ARMY_BY_SLUG[r.slug];
          return (
            <li key={r.slug} className="rule-b">
              <Link href={`/army/${r.slug}`} className="grid grid-cols-[34px_8px_1fr_auto] items-center gap-3 py-[7px] hover:bg-[var(--paper-2)]">
                <span className="num text-right text-[15px] font-semibold">{i + 1}</span>
                <span className="h-7 w-2" style={{ background: a?.ink }} aria-hidden />
                <span className="min-w-0">
                  <span className="display block text-[21px]">{a?.ticker ?? r.slug}</span>
                  {r.secondary && <span className="block truncate text-[12px] text-ink-2">{r.secondary}</span>}
                </span>
                <span className="text-right">
                  <span className="num block text-[15px] font-semibold">{fmt(r.primary)}</span>
                  <span className="num block text-[11px] text-ink-3">
                    {i === 0 ? r.primaryLabel : `−${fmt(leader - r.primary)}`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
