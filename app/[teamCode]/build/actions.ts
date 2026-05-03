"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { formations, players, submissions, teams } from "@/lib/db/schema";
import { getFormation } from "@/lib/formations";
import { getOrCreateFingerprint } from "@/lib/fingerprint";

const SubmitSchema = z.object({
  teamCode: z.string().min(2).max(8),
  formationName: z.string().min(1),
  starters: z.array(z.number().int().positive()).length(11),
  bench: z.array(z.number().int().positive()).length(3),
});

export type SubmitInput = z.infer<typeof SubmitSchema>;

export type SubmitResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function submitLineupAction(input: SubmitInput): Promise<SubmitResult> {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid lineup payload." };
  }

  const { teamCode, formationName, starters, bench } = parsed.data;

  const allIds = [...starters, ...bench];
  if (new Set(allIds).size !== allIds.length) {
    return { ok: false, error: "Each player can only appear once across XI + bench." };
  }

  const teamRow = (
    await db.select().from(teams).where(eq(teams.code, teamCode.toUpperCase())).limit(1)
  )[0];
  if (!teamRow) {
    return { ok: false, error: `Unknown team: ${teamCode}` };
  }

  let formationRow = (
    await db.select().from(formations).where(eq(formations.name, formationName)).limit(1)
  )[0];
  if (!formationRow) {
    const def = getFormation(formationName);
    if (!def) {
      return { ok: false, error: `Unknown formation: ${formationName}` };
    }
    formationRow = (
      await db
        .insert(formations)
        .values({ name: def.name, slots: def.slots })
        .onConflictDoUpdate({
          target: formations.name,
          set: { slots: def.slots },
        })
        .returning()
    )[0];
  }
  if (formationRow.slots.length !== 11) {
    return { ok: false, error: "Formation does not have 11 slots." };
  }

  const poolRows = await db
    .select()
    .from(players)
    .where(and(eq(players.teamId, teamRow.id), inArray(players.id, allIds)));
  if (poolRows.length !== allIds.length) {
    return { ok: false, error: `One or more players are not in the ${teamRow.name} pool.` };
  }
  const playerById = new Map(poolRows.map((p) => [p.id, p] as const));

  for (let i = 0; i < starters.length; i += 1) {
    const slot = formationRow.slots[i];
    const player = playerById.get(starters[i])!;
    if (slot.position === "GK" && player.position !== "GK") {
      return {
        ok: false,
        error: `Slot ${slot.slot} requires a goalkeeper, got ${player.fullName} (${player.position}).`,
      };
    }
    if (slot.position !== "GK" && player.position === "GK") {
      return {
        ok: false,
        error: `Slot ${slot.slot} can't be a goalkeeper, got ${player.fullName} (${player.position}).`,
      };
    }
  }

  const { fingerprint } = await getOrCreateFingerprint();

  const reqHeaders = await headers();
  const ip =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    reqHeaders.get("x-real-ip") ??
    "";
  const ua = reqHeaders.get("user-agent") ?? "";
  const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;

  let slug = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = nanoid(10);
    try {
      const inserted = await db
        .insert(submissions)
        .values({
          publicSlug: candidate,
          teamId: teamRow.id,
          formationId: formationRow.id,
          starters,
          bench,
          fingerprint,
          ipHash,
          userAgent: ua.slice(0, 256),
        })
        .returning({ slug: submissions.publicSlug });
      slug = inserted[0].slug;
      break;
    } catch (err) {
      if (attempt === 2) {
        console.error("Failed to insert submission", err);
        return { ok: false, error: "Could not save submission. Try again." };
      }
    }
  }

  return { ok: true, slug };
}
