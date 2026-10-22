/** One abbreviation rule for the whole site: 1.24M, 312.4K, 980. */
export function fmtCompact(n: number, digits = 1): string {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(digits === 1 ? 2 : digits) + "M";
  if (a >= 1e4) return (n / 1e3).toFixed(digits) + "K";
  return Math.round(n).toLocaleString("en-US");
}

export function fmtUsd(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${fmtCompact(Math.abs(n))}`;
}

export function fmtSignedUsd(n: number): string {
  if (n === 0) return "$0";
  return `${n > 0 ? "+" : "−"}$${fmtCompact(Math.abs(n))}`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function plural(n: number, one: string, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}

export function fmtExact(n: number, dp = 8): string {
  return n.toFixed(dp);
}

export function ago(iso: string | number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
