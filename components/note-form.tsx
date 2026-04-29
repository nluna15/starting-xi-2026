"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { saveNoteAction } from "@/app/lineup/[slug]/actions";

const MAX = 250;

type Props = {
  slug: string;
  initialNote: string | null;
};

export function NoteForm({ slug, initialNote }: Props) {
  const [value, setValue] = React.useState(initialNote ?? "");
  const [savedValue, setSavedValue] = React.useState(initialNote ?? "");
  const [saving, setSaving] = React.useState(false);
  const [savedOnceThisSession, setSavedOnceThisSession] = React.useState(false);
  const [status, setStatus] = React.useState<
    { kind: "idle" } | { kind: "ok" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const dirty = value !== savedValue;
  const remaining = MAX - value.length;
  const emptyNote = value.trim().length === 0;
  const allowInitialEmptySave = emptyNote && !savedOnceThisSession;
  const canSave = !saving && remaining >= 0 && (dirty || allowInitialEmptySave);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setStatus({ kind: "idle" });
    const result = await saveNoteAction({ slug, note: value });
    setSaving(false);
    if (result.ok) {
      setSavedValue(value);
      setSavedOnceThisSession(true);
      setStatus({ kind: "ok" });
    } else {
      setStatus({ kind: "error", message: result.error });
    }
  }

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
          setValue(e.target.value);
          if (status.kind !== "idle") setStatus({ kind: "idle" });
        }}
        maxLength={MAX}
        rows={5}
        placeholder="Why this XI? Share the logic behind the bold picks…"
        className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          {status.kind === "ok" && <span className="text-emerald-700">Saved.</span>}
          {status.kind === "error" && <span className="text-accent">{status.message}</span>}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? "Saving…" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
