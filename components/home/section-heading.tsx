/* -----------------------------------------------------------------------------
   Section heading — handoff §6 "Section title"
   - Eyebrow: mono 11px, ink-faint, 0.16em tracking ("01", "02", etc.).
   - Title:   display 28px, ink, balanced wrap.
   - Optional right-aligned slot for live counters in mono 11px ink-faint.
   ----------------------------------------------------------------------------- */

type Props = {
  eyebrow?: string;
  title: string;
  meta?: React.ReactNode;
};

export function SectionHeading({ eyebrow, title, meta }: Props) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="mono text-[11px] font-medium tracking-[0.16em] text-ink-faint">
            {eyebrow}
          </span>
        )}
        <h2 className="display text-[28px] text-ink [text-wrap:balance]">{title}</h2>
      </div>
      {meta && (
        <span className="mono text-[11px] tracking-[0.16em] text-ink-faint">{meta}</span>
      )}
    </div>
  );
}
