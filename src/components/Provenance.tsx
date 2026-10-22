/** Every number on Raid says where it came from and when. */
export function Provenance({
  rows,
  generatedAt,
  footnote,
  className = "",
}: {
  rows: [string, string][];
  generatedAt: string;
  footnote?: string;
  className?: string;
}) {
  return (
    <section className={`border-t-2 border-ink pt-3 ${className}`} aria-label="Data sources">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="label">Sources · public, no login</h2>
        <span className="num text-[12px] text-ink-3">snapshot {new Date(generatedAt).toISOString().replace("T", " ").slice(0, 16)} UTC</span>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-[12px] md:grid-cols-[120px_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-2">{k}</dt>
            <dd className="num break-all text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {footnote && <p className="mt-2 max-w-[90ch] text-[12px] text-ink-2">{footnote}</p>}
    </section>
  );
}
