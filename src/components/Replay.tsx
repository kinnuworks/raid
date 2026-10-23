"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { Swatch } from "./Swatch";
import { WarMap, type MapTile } from "./WarMap";

interface DayFrame {
  date: string;
  tiles: { symbol: string; owner: string | null; runnerUp: string | null; margin: number; strength: number }[];
}

const STEP_MS = 1400;
const base = (s: string) => s.replace(/-USD$/, "");
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
const nameOf = (slug: string) => (ARMY_BY_SLUG[slug].garrison ? "The garrison" : ARMY_BY_SLUG[slug].ticker);

/** Every capture between two frames, written the way a field dispatch reads. */
function dispatches(prev: DayFrame | null, next: DayFrame): string[] {
  const before = new Map(prev?.tiles.map((t) => [t.symbol, t.owner]) ?? []);
  const out: string[] = [];
  for (const t of next.tiles) {
    const was = before.get(t.symbol) ?? null;
    if (!t.owner || t.owner === was) continue;
    const n = `${t.strength} ${t.strength === 1 ? "trader" : "traders"}`;
    out.push(was ? `${nameOf(t.owner)} takes ${base(t.symbol)} from ${nameOf(was).replace("The", "the")}, ${n}` : `${nameOf(t.owner)} plants a flag on ${base(t.symbol)}, ${n}`);
  }
  return out;
}

function standings(frame: { tiles: { owner: string | null }[] }) {
  const m = new Map<string, number>();
  for (const t of frame.tiles) if (t.owner) m.set(t.owner, (m.get(t.owner) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function Replay({ final, days, generatedAt }: { final: MapTile[]; days: DayFrame[]; generatedAt: string }) {
  const [frame, setFrame] = useState<number | null>(null); // null = today's board
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weights = useMemo(() => Object.fromEntries(final.map((t) => [t.symbol, t.weight])), [final]);

  const tiles: MapTile[] = useMemo(
    () => (frame === null ? final : days[frame].tiles.map((t) => ({ ...t, weight: weights[t.symbol] ?? 1 }))),
    [frame, final, days, weights],
  );

  useEffect(() => {
    if (!playing) return;
    timer.current = setTimeout(() => {
      if (frame === null) setFrame(0);
      else if (frame < days.length - 1) setFrame(frame + 1);
      else {
        setFrame(null);
        setPlaying(false);
      }
    }, frame === null ? 50 : STEP_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, frame, days.length]);

  const shown = frame ?? days.length - 1;
  const today = standings({ tiles: frame === null ? final : days[shown].tiles });
  const yesterday = shown > 0 ? new Map(standings(days[shown - 1]).map(([s], i) => [s, i])) : null;
  const log = dispatches(shown > 0 ? days[shown - 1] : null, days[shown]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => (playing ? setPlaying(false) : (setFrame(null), setPlaying(true)))} aria-pressed={playing}>
          {playing ? "Pause" : `Replay the last ${days.length} days`}
        </button>
        <div className="-mx-4 flex snap-x items-stretch overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Pick a day">
          {days.map((d, i) => (
            <button
              key={d.date}
              onClick={() => (setPlaying(false), setFrame(i))}
              className="num min-h-11 min-w-11 shrink-0 snap-start border border-ink px-2 text-[12px] -ml-px first:ml-0"
              style={frame === i ? { background: "var(--ink)", color: "var(--paper)" } : undefined}
              aria-pressed={frame === i}
              title={d.date}
            >
              {weekday(d.date)}
            </button>
          ))}
          <button
            onClick={() => (setPlaying(false), setFrame(null))}
            className="num -ml-px min-h-11 shrink-0 border border-ink px-3 text-[12px]"
            style={frame === null ? { background: "var(--ink)", color: "var(--paper)" } : undefined}
            aria-pressed={frame === null}
          >
            Now
          </button>
        </div>
      </div>
      <p className="num mt-2 text-[13px] text-ink-2" aria-live="polite">
        {frame === null ? `Today · snapshot ${generatedAt.slice(0, 16).replace("T", " ")} UTC` : `Day ${frame + 1} of ${days.length} · ${days[frame].date}`}
      </p>

      <div className="mt-3">
        <WarMap tiles={tiles} animateKey={frame === null ? undefined : String(frame)} />
      </div>

      <div className="mt-4 grid gap-6 border-t border-[var(--rule-strong)] pt-3 md:grid-cols-[1fr_260px]">
        <div>
          <p className="label">{frame === null ? "Dispatches, final day" : `Dispatches, day ${frame + 1}`}</p>
          <ul className="num mt-1 text-[13px]">
            {log.length === 0 && <li className="py-1 text-ink-2">No ground changed hands.</li>}
            {log.slice(0, 8).map((l) => (
              <li key={l} className="rule-b py-1.5">
                {l}
              </li>
            ))}
            {log.length > 8 && <li className="py-1 text-ink-2">and {log.length - 8} more</li>}
          </ul>
        </div>
        <div>
          <p className="label">Markets held</p>
          <ol className="mt-1 text-[14px]">
            {today.slice(0, 6).map(([slug, n], i) => {
              const prev = yesterday?.get(slug);
              const move = prev === undefined ? null : prev - i;
              return (
                <li key={slug} className="rule-b flex items-center gap-2 py-1">
                  <span className="num w-4 text-right">{i + 1}</span>
                  <Swatch army={ARMY_BY_SLUG[slug]} className="h-3.5 w-3.5" />
                  <span className="display text-[17px]">{ARMY_BY_SLUG[slug].garrison ? "Garrison" : ARMY_BY_SLUG[slug].ticker}</span>
                  <span className="num ml-auto">{n}</span>
                  <span className="num w-8 text-right text-[12px] text-ink-2">{move ? (move > 0 ? `▲${move}` : `▼${-move}`) : prev === undefined && yesterday ? "new" : ""}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
