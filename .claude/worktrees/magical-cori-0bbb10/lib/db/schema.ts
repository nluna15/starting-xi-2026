import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type FormationSlot = {
  slot: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  x: number;
  y: number;
};

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  flagEmoji: text("flag_emoji").notNull(),
});

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    transfermarktId: integer("transfermarkt_id").notNull().unique(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    position: text("position").notNull(),
    detailedPosition: text("detailed_position").notNull(),
    jerseyNumber: integer("jersey_number"),
    club: text("club").notNull(),
    age: integer("age").notNull(),
    marketValueEur: integer("market_value_eur").notNull(),
    photoUrl: text("photo_url"),
  },
  (t) => ({
    teamIdx: index("players_team_idx").on(t.teamId),
    nameIdx: index("players_name_idx").on(t.fullName),
  }),
);

export const formations = pgTable("formations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slots: jsonb("slots").$type<FormationSlot[]>().notNull(),
});

export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    publicSlug: text("public_slug").notNull(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    formationId: integer("formation_id")
      .notNull()
      .references(() => formations.id),
    starters: jsonb("starters").$type<number[]>().notNull(),
    bench: jsonb("bench").$type<number[]>().notNull(),
    note: text("note"),
    fingerprint: text("fingerprint").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    slugIdx: uniqueIndex("submissions_slug_idx").on(t.publicSlug),
    teamCreatedIdx: index("submissions_team_created_idx").on(t.teamId, t.createdAt),
    fingerprintIdx: index("submissions_fingerprint_idx").on(t.fingerprint),
  }),
);

export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Formation = typeof formations.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
