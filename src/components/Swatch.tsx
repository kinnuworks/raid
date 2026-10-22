import type { Army } from "@/lib/armies";

/** The army's ink and pattern as a CSS background, so every list matches the map. */
export function swatchBackground(a: Army): string {
  if (a.garrison) return `repeating-linear-gradient(45deg, ${a.ink} 0 1px, var(--paper-2) 1px 5px)`;
  switch (a.pattern) {
    case "diagonal":
      return `repeating-linear-gradient(45deg, ${a.ink} 0 3px, color-mix(in srgb, ${a.ink} 35%, var(--paper)) 3px 6px)`;
    case "dots":
      return `radial-gradient(circle, ${a.ink} 1.6px, transparent 1.9px) 0 0 / 6px 6px, color-mix(in srgb, ${a.ink} 30%, var(--paper))`;
    default:
      return a.ink;
  }
}

export function Swatch({ army, className = "h-4 w-4" }: { army: Army; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 border border-[var(--ink)] ${className}`} style={{ background: swatchBackground(army) }} />;
}
