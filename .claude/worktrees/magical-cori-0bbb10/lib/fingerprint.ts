import { cookies } from "next/headers";
import { nanoid } from "nanoid";

const COOKIE_NAME = "wcr_fp";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getOrCreateFingerprint(): Promise<{ fingerprint: string; isNew: boolean }> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return { fingerprint: existing, isNew: false };

  const fingerprint = nanoid(21);
  store.set(COOKIE_NAME, fingerprint, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return { fingerprint, isNew: true };
}

export async function readFingerprint(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}
