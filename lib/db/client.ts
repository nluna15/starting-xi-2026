import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = NeonHttpDatabase<typeof schema>;

let _db: Db | null = null;

function init(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Provision a Neon Postgres database via the Vercel Marketplace and run `vercel env pull .env.local`.",
    );
  }
  const sql: NeonQueryFunction<false, false> = neon(connectionString);
  return drizzle(sql, { schema });
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!_db) _db = init();
    const value = Reflect.get(_db, prop, receiver);
    return typeof value === "function" ? value.bind(_db) : value;
  },
});

export { schema };
