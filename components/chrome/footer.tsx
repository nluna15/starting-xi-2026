/* -----------------------------------------------------------------------------
   App footer — handoff §6 "Footer"
   - bg-elev surface, ink-3 muted copy in font-sans, 14–16px / 24–28px padding.
   - Hairline top border. Centered fine print is the only content for now.
   ----------------------------------------------------------------------------- */
export function Footer() {
  return (
    <footer className="border-t border-line bg-bg-elev">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center px-7 py-4">
        <p className="font-sans text-sm text-ink-3">
          Made with joy by Plays and Pixels &middot; Not affiliated with FIFA
        </p>
      </div>
    </footer>
  );
}
