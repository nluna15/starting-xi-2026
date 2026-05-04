"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------------------
   Modal — handoff §6 (centered dialog) plus a `sheet` variant for narrow
   viewports.

   NOTE — guide deviation: the handoff describes a single centered dialog. We
   add a bottom-pinned `sheet` presentation because the existing site already
   uses the slide-up sheet pattern on mobile, and the editorial-print aesthetic
   doesn't quite work jammed into a tiny centered card on a 360px screen.
   `presentation="auto"` resolves to `sheet` below the `sm` breakpoint (640px)
   and `centered` above it. Pages can force either.
   ----------------------------------------------------------------------------- */

type Presentation = "auto" | "centered" | "sheet";
type Size = "sm" | "md" | "lg";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Presentation strategy. Default: `auto` (sheet on <sm, centered on sm+). */
  presentation?: Presentation;
  /** Centered max-width. Ignored when sheet is rendered. */
  size?: Size;
  /** Optional accessible label when no visible `title` is rendered. */
  ariaLabel?: string;
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

// Module-level subscribe/snapshot for `useSyncExternalStore`. Subscribing to the
// MQL through this hook avoids the `set-state-in-effect` lint pattern and gives
// us a hydration-safe initial value via `getServerSnapshot`.
const SM_QUERY = "(min-width: 640px)";

function subscribeSm(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(SM_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSmSnapshot(): "centered" | "sheet" {
  if (typeof window === "undefined") return "centered";
  return window.matchMedia(SM_QUERY).matches ? "centered" : "sheet";
}

function getSmServerSnapshot(): "centered" | "sheet" {
  return "centered";
}

function useResolvedPresentation(presentation: Presentation): "centered" | "sheet" {
  // SSR-safe: server snapshot is always `centered` (avoids hydration mismatch),
  // client snaps to the live MQ value on mount and reacts to viewport changes.
  // Explicit `centered` / `sheet` short-circuit the subscription.
  const auto = React.useSyncExternalStore(subscribeSm, getSmSnapshot, getSmServerSnapshot);
  return presentation === "auto" ? auto : presentation;
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  const sel = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null,
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  presentation = "auto",
  size = "md",
  ariaLabel,
}: ModalProps) {
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);
  const variant = useResolvedPresentation(presentation);
  const titleId = React.useId();

  // ESC + scroll lock + focus trap.
  React.useEffect(() => {
    if (!open) return;

    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && surfaceRef.current) {
        const focusable = getFocusable(surfaceRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          surfaceRef.current.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog.
    const t = window.setTimeout(() => {
      if (!surfaceRef.current) return;
      const focusable = getFocusable(surfaceRef.current);
      (focusable[0] ?? surfaceRef.current).focus();
    }, 0);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isSheet = variant === "sheet";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-ink/40 backdrop-blur-sm",
        "[animation:overlay-in_var(--t-fast)_var(--ease-out)_both]",
        isSheet ? "items-end justify-center" : "items-center justify-center p-4",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      onClick={onClose}
    >
      <div
        ref={surfaceRef}
        tabIndex={-1}
        className={cn(
          "w-full bg-surface text-ink shadow-3 outline-none",
          isSheet
            ? cn(
                "max-h-[90dvh] overflow-y-auto rounded-t-xl",
                "[animation:sheet-in_var(--t-med)_var(--ease-out)_both]",
              )
            : cn(
                "rounded-xl",
                SIZE_CLASS[size],
                "[animation:modal-in_var(--t-med)_var(--ease-out)_both]",
              ),
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="border-b border-line px-6 py-4">
            <h2 id={titleId} className="cond text-[13px] text-ink">
              {title}
            </h2>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
