# World Cup Roster

Crowd-sourced USMNT 2026 World Cup lineup picker. Fans choose a formation, fill an 11 + 3 squad
from a curated player pool, submit anonymously, and get a shareable link. All submissions roll up
into a wisdom-of-the-crowd dashboard (most-likely XI, most-popular formation, average age, average
market value, top bench picks).

## Stack

- Next.js 16 (App Router, Server Components, Server Actions) on Vercel
- Tailwind CSS v4
- Neon Postgres (provisioned via the Vercel Marketplace) + Drizzle ORM
- Zod for input validation
- Anonymous fingerprint cookie (`wcr_fp`) for soft duplicate / spam control

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Provision a Neon Postgres database via the Vercel Marketplace (or any Postgres). Set
   `DATABASE_URL` in `.env.local` (copy `.env.example` as a starting point). If using Vercel:

   ```bash
   vercel link
   vercel env pull .env.local
   ```

3. Push the schema and seed the player pool + formations:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Editing the player pool

The USMNT player pool lives in `data/usmnt-players.json`. Edit, then re-run:

```bash
npm run db:seed
```

The seed script wipes and re-inserts USA players (formations are upserted in place).

## Routes

- `/` — landing page
- `/build` — formation picker + lineup builder; submits via Server Action and redirects to
  `/lineup/[slug]`
- `/lineup/[slug]` — public, shareable read-only view of a single submission
- `/crowd` — wisdom-of-the-crowd aggregates

## Anti-spam

- Each browser gets an anonymous `wcr_fp` cookie on first submit.
- Soft cap: 5 submissions per fingerprint per 24h.
- IP and user agent are hashed and stored for downstream abuse review.

## Deploying to Vercel

1. Push to a Git provider, then import in the Vercel dashboard.
2. Add the Neon Postgres integration from the Marketplace; it auto-provisions `DATABASE_URL`.
3. After the first deploy, run `npm run db:push` and `npm run db:seed` against the production DB
   (you can do this locally with the production `DATABASE_URL` pulled via `vercel env pull`).

## Roadmap

- Add more national teams (schema is multi-team ready; UI deferred).
- OpenGraph images for `/lineup/[slug]` shares.
- Optional API sync to keep player ages and market values fresh.
