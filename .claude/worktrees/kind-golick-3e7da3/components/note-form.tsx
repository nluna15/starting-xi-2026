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
  const [status, setStatus] = React.useState<
    { kind: "idle" } | { kind: "ok" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const dirty = value !== savedValue;
  const remaining = MAX - value.length;

  async function handleSave() {
    if (saving || !dirty) return;
    setSaving(true);
    setStatus({ kind: "idle" });
    const result = await saveNoteAction({ slug, note: value });
    setSaving(false);
    if (result.ok) {
      setSavedValue(value);
      setStatus({ kind: "ok" });
    } else {
      setStatus({ kind: "error", message: result.error });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="lineup-note" className="text-sm font-semibold text-zinc-300">
          Your reasoning <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <span
          className={remaining < 0 ? "text-xs font-medium text-red-400" : "text-xs text-zinc-500"}
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
        rows={3}
        placeholder="Why this XI? Share the logic behind the bold picks…"
        className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          {status.kind === "ok" && <span className="text-emerald-400">Saved.</span>}
          {status.kind === "error" && <span className="text-red-400">{status.message}</span>}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving || remaining < 0}
        >
          {saving ? "Saving…" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
