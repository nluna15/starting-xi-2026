"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="lineup-note" className="text-sm font-semibold text-foreground">
          Your reasoning <span className="font-normal text-muted">(optional)</span>
        </label>
        <span
          className={remaining < 0 ? "text-xs font-medium text-accent" : "text-xs text-muted"}
        >
          {remaining} left
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
        className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          {status.kind === "idle" && helperText ? (
            <span className="text-muted">{helperText}</span>
          ) : null}
          {status.kind === "ok" && (
            <span className="text-emerald-700">{status.message ?? "Saved."}</span>
          )}
          {status.kind === "error" && <span className="text-accent">{status.message}</span>}
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
