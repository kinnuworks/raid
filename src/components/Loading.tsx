/** Loading state: a plotting table being laid out, not a spinner. */
export function Loading({ text }: { text: string }) {
  return (
    <main className="mx-auto max-w-[1300px] px-4 pb-24 pt-8 md:px-8" aria-busy="true">
      <p className="label">{text}</p>
      <div className="mt-4 grid grid-cols-6 gap-2 opacity-60">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square border border-dashed border-[var(--ink-3)]" style={{ animation: `cell-flash 1.6s ${i * 90}ms infinite` }} />
        ))}
      </div>
    </main>
  );
}
