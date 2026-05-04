"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const NOTE_MAX_LENGTH = 250;

export type NoteStatus =
  | { kind: "idle" }
  | { kind: "ok"; message?: string }
  | { kind: "error"; message: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  remaining: number;
  status: NoteStatus;
  saving?: boolean;
  helperText?: string;
  showSaveButton?: boolean;
  canSave?: boolean;
  onSave?: () => void;
};

export function NoteForm({
  value,
  onChange,
  remaining,
  status,
  saving = false,
  helperText,
  showSaveButton = false,
  canSave = false,
  onSave,
}: Props) {
  const overLimit = remaining < 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="lineup-note"
          className="cond text-[12px] tracking-[0.08em] text-ink-2"
        >
          Your Take{" "}
          <span className="font-normal normal-case tracking-normal text-ink-faint">
            (optional)
          </span>
        </label>
        <span
          className={cn(
            "mono text-[11px] tracking-[0.08em]",
            overLimit ? "text-accent" : "text-ink-faint",
          )}
        >
          {NOTE_MAX_LENGTH - remaining} / {NOTE_MAX_LENGTH}
        </span>
      </div>
      <textarea
        id="lineup-note"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        disabled={saving}
        maxLength={NOTE_MAX_LENGTH}
        rows={5}
        placeholder="Why this XI? Share the logic behind the bold picks…"
        className={cn(
          "w-full resize-y rounded-md border border-line bg-bg px-3.5 py-3 text-[14px] leading-[1.45] text-ink placeholder:text-ink-faint",
          "transition-[border-color,box-shadow] duration-150 ease-in-out",
          "hover:border-line-strong",
          "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
          "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-mute",
        )}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] leading-[1.45]">
          {status.kind === "idle" && helperText ? (
            <span className="text-ink-faint">{helperText}</span>
          ) : null}
          {status.kind === "ok" && (
            <span className="text-success">{status.message ?? "Saved."}</span>
          )}
          {status.kind === "error" && (
            <span className="text-accent-deep">{status.message}</span>
          )}
        </div>
        {showSaveButton && (
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save note"}
          </Button>
        )}
      </div>
    </div>
  );
}
