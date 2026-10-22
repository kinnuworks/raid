"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ARMY_BY_SLUG } from "@/lib/armies";
import { WarMap, type MapTile } from "./WarMap";

interface DayFrame {
  date: string;
  tiles: { symbol: string; owner: string | null; runnerUp: string | null; margin: number; strength: number }[];
}

interface Dispatch {
  day: number;
  text: string;
}

const STEP_MS = 1100;
const base = (s: string) => s.replace(/-USD$/, "");

/** Every capture between two frames, written the way a field dispatch would read. */
function diff(prev: DayFrame | null, next: DayFrame, day: number): Dispatch[] {
  const before = new Map(prev?.tiles.map((t) => [t.symbol, t.owner]) ?? []);
  const out: Dispatch[] = [];
  for (const t of next.tiles) {
    const was = before.get(t.symbol) ?? null;
    if (t.owner === was || !t.owner) continue;
    const who = ARMY_BY_SLUG[t.owner];
    const from = was ? ARMY_BY_SLUG[was] : null;
    const name = who.garrison ? "The garrison" : who.ticker;
    out.push({
      day,
      text: from
        ? `${name} takes ${base(t.symbol)} from ${from.garrison ? "the garrison" : from.ticker}, ${t.strength} ${t.strength === 1 ? "trader" : "traders"}`
        : `${name} plants a flag on ${base(t.symbol)}, ${t.strength} ${t.strength === 1 ? "trader" : "traders"}`,
    });
  }
  return out;
}

export function Replay({ final, days, generatedAt }: { final: MapTile[]; days: DayFrame[]; generatedAt: string }) {
  const [frame, setFrame] = useState<number | null>(null); // null = today's board
  const [log, setLog] = useState<Dispatch[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const weights = useMemo(() => Object.fromEntries(final.map((t) => [t.symbol, t.weight])), [final]);

  const tiles: MapTile[] = useMemo(() => {
    if (frame === null) return final;
    return days[frame].tiles.map((t) => ({ ...t, weight: weights[t.symbol] ?? 1 }));
  }, [frame, final, days, weights]);

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  function play() {
    stop();
    setLog([]);
    let i = 0;
    setFrame(0);
    setLog(diff(null, days[0], 1));
    timer.current = setInterval(() => {
      i++;
      if (i >= days.length) {
        stop();
        setFrame(null);
        return;
      }
      setFrame(i);
      setLog((l) => [...diff(days[i - 1], days[i], i + 1), ...l].slice(0, 40));
    }, STEP_MS);
  }

  useEffect(() => stop, []);

  const playing = frame !== null;
  const label = playing ? `Day ${frame! + 1} of ${days.length} · ${days[frame!].date}` : `Today · snapshot ${generatedAt.slice(0, 16).replace("T", " ")} UTC`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" onClick={playing ? () => (stop(), setFrame(null)) : play} aria-pressed={playing}>
          {playing ? "Stop" : `Replay the last ${days.length} days`}
        </button>
        <span className="num text-[13px] text-ink-2" aria-live="polite">
          {label}
        </span>
        {!playing && log.length > 0 && <span className="stamp text-[13px]">Verified snapshot</span>}
      </div>
      <div className="mt-4">
        <WarMap tiles={tiles} animateKey={playing ? String(frame) : undefined} />
      </div>
      {log.length > 0 && (
        <ol className="num mt-4 max-h-44 overflow-auto border-t border-[var(--rule-strong)] text-[13px]" aria-label="Dispatches">
          {log.map((d, i) => (
            <li key={`${d.day}-${i}-${d.text}`} className="rule-b grid grid-cols-[64px_1fr] gap-3 py-1.5">
              <span className="text-ink-3">Day {d.day}</span>
              <span>{d.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
