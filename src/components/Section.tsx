/**
 * The page skeleton every route shares, so a reader always knows where one part ends and the next begins.
 * PageHead opens a page; Section is one numbered part of it, full width, with an optional grey band.
 */

export function PageHead({ kicker, title, children, wide = false }: { kicker: React.ReactNode; title: React.ReactNode; children?: React.ReactNode; wide?: boolean }) {
  return (
    <header className="mx-auto max-w-[1400px] px-4 pb-10 pt-10 md:px-8 md:pb-12 md:pt-14">
      <p className="kicker">{kicker}</p>
      <h1 className="display mt-3 text-[clamp(40px,6vw,76px)]">{title}</h1>
      {children && <div className={`mt-4 text-[17px] leading-relaxed text-ink-2 ${wide ? "max-w-[110ch]" : "max-w-[64ch]"}`}>{children}</div>}
    </header>
  );
}

export function Section({
  id,
  n,
  label,
  title,
  note,
  band = false,
  children,
}: {
  id: string;
  /** Section number, printed as 01, 02… */
  n?: number;
  /** Short running label next to the number. */
  label: string;
  title: React.ReactNode;
  note?: React.ReactNode;
  band?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-4 border-t-2 border-ink ${band ? "bg-[var(--paper-2)]" : ""}`}>
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8 md:py-16">
        <SectionTitle id={`${id}-title`} n={n} label={label} title={title} note={note} />
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export function SectionTitle({ id, n, label, title, note }: { id?: string; n?: number; label: string; title: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,44ch)] md:items-end md:gap-10">
      <div>
        <p className="num text-[12px] font-semibold tracking-[0.06em] text-ink-2">
          {n !== undefined && <span className="mr-2 inline-block bg-[var(--ink)] px-1.5 py-0.5 text-[var(--paper)]">{String(n).padStart(2, "0")}</span>}
          {label}
        </p>
        <h2 id={id} className="display mt-3 text-[clamp(32px,4vw,48px)]">
          {title}
        </h2>
      </div>
      {note && <p className="text-[14px] leading-snug text-ink-2 md:text-right">{note}</p>}
    </div>
  );
}

/** A smaller heading inside a section, for a column or a sub-part. */
export function SubHead({ title, note, id }: { title: React.ReactNode; note?: React.ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule-strong)] pb-2">
      <h3 id={id} className="display text-[24px]">
        {title}
      </h3>
      {note && <span className="label">{note}</span>}
    </div>
  );
}
