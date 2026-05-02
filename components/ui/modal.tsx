"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-surface text-foreground shadow-xl sm:rounded-2xl",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="border-b border-border px-4 py-3 text-base font-semibold">
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
