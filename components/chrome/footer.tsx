import Link from "next/link";

const NAV_LINKS = [
  { href: "/countries", label: "Countries" },
  { href: "/community", label: "Community Picks" },
  { href: "/about", label: "About" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg-elev">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-4 py-3">
        <nav aria-label="Footer">
          <ul className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-sans text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="font-sans text-[10px] text-ink-3">
          Made by Pixels and Plays &middot; Not affiliated with FIFA
        </p>
      </div>
    </footer>
  );
}
