"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveNoteAction } from "@/app/lineup/[slug]/actions";
import { NoteForm, NOTE_MAX_LENGTH, type NoteStatus } from "@/components/note-form";
import { SubmittedModal } from "@/components/submitted-modal";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/db/schema";

type Props = {
  slug: string;
  initialNote: string | null;
  team: { name: string; flagEmoji: string };
  teamCode: string;
  starters: Player[];
  bench: Player[];
  pickRates: {
    totalSubmissions: number;
    picksByPlayerId: Map<number, number>;
  };
};

export function OwnerLineupActions({
  slug,
  initialNote,
  team,
  teamCode,
  starters,
  bench,
  pickRates,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "1";
  const [modalOpen, setModalOpen] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [value, setValue] = React.useState(initialNote ?? "");
  const [savedValue, setSavedValue] = React.useState(initialNote ?? "");
  const [saving, setSaving] = React.useState(false);
  const [savedOnceThisSession, setSavedOnceThisSession] = React.useState(false);
  const [status, setStatus] = React.useState<NoteStatus>({ kind: "idle" });

  const remaining = NOTE_MAX_LENGTH - value.length;
  const dirty = value !== savedValue;
  const emptyNote = value.trim().length === 0;
  const allowInitialEmptySave = emptyNote && !savedOnceThisSession;
  const canSave = !saving && remaining >= 0 && (dirty || allowInitialEmptySave);
  const showSubmitButton = justSubmitted && !dismissed;

  function handleChange(nextValue: string) {
    setValue(nextValue);
    if (status.kind !== "idle") setStatus({ kind: "idle" });
  }

  async function saveNote(): Promise<boolean> {
    if (remaining < 0) {
      setStatus({ kind: "error", message: "Note is too long (max 250 characters)." });
      return false;
    }

    if (!dirty && !allowInitialEmptySave) {
      return true;
    }

    setSaving(true);
    setStatus({ kind: "idle" });
    const result = await saveNoteAction({ slug, note: value });
    setSaving(false);

    if (!result.ok) {
      setStatus({ kind: "error", message: result.error });
      return false;
    }

    setSavedValue(value);
    setSavedOnceThisSession(true);
    setStatus({ kind: "ok" });
    return true;
  }

  async function handleManualSave() {
    await saveNote();
  }

  async function handleSubmitSquad() {
    if (saving) return;
    const saved = await saveNote();
    if (saved) {
      setModalOpen(true);
    }
  }

  function handleClose() {
    setModalOpen(false);
    setDismissed(true);
    router.replace(`/lineup/${slug}`, { scroll: false });
    requestAnimationFrame(() => {
      const noteEl = document.getElementById("lineup-note");
      if (noteEl) {
        noteEl.scrollIntoView({ behavior: "smooth", block: "center" });
        noteEl.focus({ preventScroll: true });
      }
    });
  }

  return (
    <>
      <NoteForm
        value={value}
        onChange={handleChange}
        remaining={remaining}
        status={status}
        saving={saving}
        helperText={
          showSubmitButton ? "Your note will be saved when you submit the squad." : undefined
        }
        showSaveButton={!showSubmitButton}
        canSave={canSave}
        onSave={handleManualSave}
      />
      {showSubmitButton && (
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmitSquad}
          disabled={saving || remaining < 0}
          className="w-full"
        >
          {saving ? "Saving note…" : "Submit Squad"}
        </Button>
      )}
      <SubmittedModal
        open={modalOpen}
        onClose={handleClose}
        team={team}
        teamCode={teamCode}
        starters={starters}
        bench={bench}
        pickRates={pickRates}
      />
    </>
  );
}
