"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { unlockAnalyticsAction } from "./actions";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string };

export function PasskeyForm() {
  const router = useRouter();
  const [passkey, setPasskey] = React.useState("");
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

  const canSubmit = passkey.trim().length > 0 && status.kind !== "checking";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ kind: "checking" });
    const result = await unlockAnalyticsAction(passkey);
    if (result.ok) {
      // Re-render the (now-unlocked) server component with the fresh cookie.
      router.refresh();
    } else {
      setStatus({ kind: "error", message: result.error });
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 py-16">
      <header className="space-y-1">
        <h1 className="display text-[36px] text-ink">Internal analytics</h1>
        <p className="text-[13px] text-ink-3">
          Enter the passkey to unlock the dashboard for 48 hours.
        </p>
      </header>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="analytics-passkey"
            className="cond text-[12px] tracking-[0.08em] text-ink-2"
          >
            Passkey
          </label>
          <input
            id="analytics-passkey"
            type="password"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            disabled={status.kind === "checking"}
            autoFocus
            autoComplete="off"
            placeholder="••••••••"
            className={cn(
              "w-full rounded-md border border-line bg-bg px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint",
              "transition-[border-color,box-shadow] duration-150 ease-in-out",
              "hover:border-line-strong",
              "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
              "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-mute",
            )}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] leading-[1.45]" aria-live="polite">
            {status.kind === "error" && (
              <span className="text-accent-deep">{status.message}</span>
            )}
          </div>
          <Button type="submit" variant="primary" size="md" disabled={!canSubmit}>
            {status.kind === "checking" ? "Checking…" : "Unlock"}
          </Button>
        </div>
      </form>
    </div>
  );
}
