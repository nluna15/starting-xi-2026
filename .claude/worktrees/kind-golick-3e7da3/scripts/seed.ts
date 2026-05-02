import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";

config({ path: ".env.local" });
config();

import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, notInArray, sql as dsql } from "drizzle-orm";
import { formations, players, teams, type FormationSlot } from "../lib/db/schema";
import { WC_2026_SLOTS } from "../lib/wc-2026-teams";

type SeedPlayer = {
  transfermarktId: number;
  fullName: string;
  position: string;
  detailedPosition: string;
  jerseyNumber: number | null;
  club: string;
  age: number;
  marketValueEur: number;
  photoUrl?: string | null;
};

type SeedFormation = {
  name: string;
  slots: FormationSlot[];
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed.");
  }

  const sql = neon(connectionString);
  const db = drizzle(sql);

  const formationData = JSON.parse(
    readFileSync(resolve(process.cwd(), "data/formations.json"), "utf8"),
  ) as SeedFormation[];

  const confirmedSlots = WC_2026_SLOTS.filter((s) => s.kind === "confirmed");
  console.log(`Upserting ${confirmedSlots.length} confirmed teams…`);

  let teamsSeeded = 0;
  let playersSeeded = 0;

  for (const slot of confirmedSlots) {
    if (slot.kind !== "confirmed") continue;

    let team = (await db.select().from(teams).where(eq(teams.code, slot.code)))[0];
    if (!team) {
      team = (
        await db
          .insert(teams)
          .values({ code: slot.code, name: slot.name, flagEmoji: slot.flagEmoji })
          .returning()
      )[0];
    } else {
      // Keep team name + flag in sync with the manifest
      await db
        .update(teams)
        .set({ name: slot.name, flagEmoji: slot.flagEmoji })
        .where(eq(teams.id, team.id));
    }
    teamsSeeded += 1;

    const playerFile = resolve(process.cwd(), `data/${slot.code.toLowerCase()}-players.json`);
    if (!existsSync(playerFile)) {
      continue;
    }

    const playerData = JSON.parse(readFileSync(playerFile, "utf8")) as SeedPlayer[];
    const missingTmId = playerData.filter((p) => typeof p.transfermarktId !== "number");
    if (missingTmId.length > 0) {
      throw new Error(
        `${slot.code}: ${missingTmId.length} player(s) missing transfermarktId. ` +
          `Regenerate data/${slot.code.toLowerCase()}-players.json with build-players-from-duckdb.ts.`,
      );
    }

    if (playerData.length > 0) {
      await db
        .insert(players)
        .values(
          playerData.map((p) => ({
            transfermarktId: p.transfermarktId,
            teamId: team.id,
            fullName: p.fullName,
            position: p.position,
            detailedPosition: p.detailedPosition,
            jerseyNumber: p.jerseyNumber ?? null,
            club: p.club,
            age: p.age,
            marketValueEur: p.marketValueEur,
            photoUrl: p.photoUrl ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: players.transfermarktId,
          set: {
            teamId: dsql`excluded.team_id`,
            fullName: dsql`excluded.full_name`,
            position: dsql`excluded.position`,
            detailedPosition: dsql`excluded.detailed_position`,
            jerseyNumber: dsql`excluded.jersey_number`,
            club: dsql`excluded.club`,
            age: dsql`excluded.age`,
            marketValueEur: dsql`excluded.market_value_eur`,
            photoUrl: dsql`excluded.photo_url`,
          },
        });

      const keepIds = playerData.map((p) => p.transfermarktId);
      await db
        .delete(players)
        .where(and(eq(players.teamId, team.id), notInArray(players.transfermarktId, keepIds)));
    } else {
      await db.delete(players).where(eq(players.teamId, team.id));
    }
    playersSeeded += playerData.length;
    console.log(`  ${slot.code}: ${playerData.length} players`);
  }

  console.log("Upserting formations…");
  for (const f of formationData) {
    const existing = (await db.select().from(formations).where(eq(formations.name, f.name)))[0];
    if (existing) {
      await db.update(formations).set({ slots: f.slots }).where(eq(formations.id, existing.id));
    } else {
      await db.insert(formations).values({ name: f.name, slots: f.slots });
    }
  }

  console.log(
    `Seed complete: ${teamsSeeded} teams, ${playersSeeded} players, ${formationData.length} formations.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
