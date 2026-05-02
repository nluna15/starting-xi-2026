"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { readFingerprint } from "@/lib/fingerprint";

const NoteSchema = z.object({
  slug: z.string().min(1).max(32),
  note: z.string().max(250),
});

export type SaveNoteInput = z.infer<typeof NoteSchema>;

export type SaveNoteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveNoteAction(input: SaveNoteInput): Promise<SaveNoteResult> {
  const parsed = NoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Note is too long (max 250 characters)." };
  }

  const fingerprint = await readFingerprint();
  if (!fingerprint) {
    return { ok: false, error: "Only the lineup's owner can add a note." };
  }

  const submission = (
    await db
      .select()
      .from(submissions)
      .where(eq(submissions.publicSlug, parsed.data.slug))
      .limit(1)
  )[0];
  if (!submission) {
    return { ok: false, error: "Lineup not found." };
  }
  if (submission.fingerprint !== fingerprint) {
    return { ok: false, error: "Only the lineup's owner can add a note." };
  }

  const trimmed = parsed.data.note.trim();
  await db
    .update(submissions)
    .set({ note: trimmed.length > 0 ? trimmed : null })
    .where(eq(submissions.id, submission.id));

  revalidatePath(`/lineup/${parsed.data.slug}`);
  return { ok: true };
}
