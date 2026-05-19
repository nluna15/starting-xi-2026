---
name: squad-finalizer
description: >
  Use this skill whenever a user uploads an image containing soccer player names and provides a country,
  with the goal of finalizing a 26-player squad from the master JSON roster. Triggers on any combination of:
  uploading a player list image, mentioning squad selection, locking a country's roster, condensing players
  to 26, flagging missing player data, or manually entering player stats into a JSON roster. Also triggers
  when the user says things like "let's run the squad skill", "process this roster image", "finalize the
  squad for [country]", or "check which players are missing data". Do NOT skip this skill if an image of
  player names is uploaded alongside a country name — that is the primary trigger.
---

# Squad Finalizer Skill

Finalizes a 26-player national squad from a master JSON roster using an uploaded image of player names.
Handles fuzzy matching, required field validation, manual data entry, and selectability flag writes.

---

## Context & Assumptions

- **Environment**: Claude Code / IDE — direct read/write access to the JSON file on disk. No file uploads needed.
- **Master roster**: Flat JSON file with a known file path, ~100 players per country, field `selectable` defaults to `true`
- **JSON access**: Read the file at the start of each run. Write back to the same path only after the completion gate passes.
- **Target**: Exactly 26 players confirmed per country run
- **Unique player ID**: `id` (serial) — already exists, do not create
- **Secondary match signal**: `transfermarktId` — populated for nearly all players, use to resolve fuzzy conflicts
- **Completion gate**: 26 players confirmed + zero null values on all 9 required fields
- **Legacy players**: Players in existing submitted rosters but not in the 26 → preserve in DB, remain `selectable: false`
- **Interrupted runs**: If the skill exits before gate passes, the JSON is untouched — no partial writes, no corruption risk

---

## Required Fields (all 9 must be non-null per player)

| Field              | Type    | Notes                                      |
|--------------------|---------|--------------------------------------------|
| `id`               | serial  | Internal PK — must resolve, not create    |
| `transfermarktId`  | integer | Unique — use as secondary match signal     |
| `teamId`           | integer | FK to teams table — validate exists        |
| `fullName`         | text    | Primary fuzzy match target                 |
| `position`         | text    | GK / DEF / MID / FWD                      |
| `detailedPosition` | text    | e.g., Center Back, Attacking Midfielder    |
| `club`             | text    | Current club at time of squad submission   |
| `age`              | integer | Flag if >12 months since last update       |
| `marketValueEur`   | integer | Most likely to be null — primary manual input |

## Optional Fields (do not block completion)

`jerseyNumber`, `photoUrl`, `internationalCaps`, `internationalGoals`

---

## Step-by-Step Execution Flow

### STEP 1 — Extract Names from Image

- Use vision to read all player names from the uploaded image
- Output a numbered list of extracted names
- Ask user to confirm the list looks correct before proceeding
- If count is clearly not 26, flag it immediately but do not block

```
Extracted 28 names from image. Here they are:
1. Vinícius Júnior
2. Rodrygo
...
⚠️  Count is 28 — you'll need to confirm which 26 to proceed with.
Ready to match? (yes / edit list first)
```

---

### STEP 2 — Fuzzy Match Against Master JSON

- Filter master JSON to the provided country
- For each extracted name, run fuzzy match against `fullName` in that country's pool
- Use `transfermarktId` as a tiebreaker when two candidates have similar name confidence
- Output a match table:

```
#  | Extracted Name     | Matched Name        | Player ID | TM ID   | Confidence | Status
---|--------------------|--------------------|-----------|---------|------------|--------
1  | Vinicius Jr        | Vinícius Júnior     | BR-047    | 371998  | High       | ✅ Auto-matched
2  | Endrick            | Endrick Felipe      | BR-061    | 980765  | Medium     | ❓ Confirm?
3  | Murilo             | —                   | —         | —       | None       | 🚨 No match found
```

**Confidence tiers:**
- **High** (>90% name similarity or TM ID corroborates): auto-match, surface for review
- **Medium** (70–90%): surface top 2 candidates, ask user to pick
- **Low / None** (<70%): flag as unmatched, ask user to manually map or skip

For each flagged row, prompt:
```
🚨 No match for "Murilo"
Options:
  A) Search by transfermarktId → enter ID manually
  B) Skip this player
  C) Enter fullName to search again
Choice:
```

Do not proceed to Step 3 until all 26 rows are resolved (matched or explicitly skipped).

---

### STEP 2.5 — Backfill Missing Players from DuckDB

If Step 2 surfaces any names that aren't in the country's JSON pool, attempt a
DuckDB lookup **before** treating them as a hard blocker. `transfermarkt-datasets.duckdb`
at the repo root holds the full Transfermarkt `players` table — many call-ups
are present in that dataset but were filtered out by the build script (e.g.
roster turnover since last regen, citizenship mismatch, market value below
the import threshold).

Workflow:
1. Write a one-off `scripts/lookup-<code>-missing.ts` modeled on
   `scripts/build-players-from-duckdb.ts` (same `POSITION_BUCKET`,
   `SUB_POSITION_ABBR`, `CLUB_REPLACEMENTS`, `ageFromDob`) that searches
   `players` by `LOWER(name) LIKE '%...%'` for each missing name.
2. Run with `npx tsx scripts/lookup-<code>-missing.ts`.
3. **Search broadly**: don't filter by `country_of_citizenship` — eligible
   call-ups sometimes have a different citizenship in the dataset (e.g.
   Matías Fernández-Pardo is `Spain` in DuckDB but plays for Belgium). Try
   variations with/without accents and with/without hyphens.
4. For each match, append a new entry to `data/<code>-players.json` using the
   shape produced by `build-players-from-duckdb.ts` (no `id`, no `teamId`,
   no `selectable` — those come from the seed step and Step 5 respectively).
5. Re-sort the JSON by position bucket then `marketValueEur` desc to match
   the file's existing convention.
6. Delete the one-off lookup script when done — it's not part of the
   repo's permanent surface area.

If DuckDB also has no match, fall back to the original edge-case behavior:
hard flag, ask the user to confirm wrong country / provide manual data /
add to the master roster out-of-band.

---

### STEP 3 — Required Field Validation

Once 26 players are confirmed, check each player's JSON record for null required fields.

Output a field-level gap report:

```
Checking required fields for 26 confirmed players...

✅ fullName          — 26/26
✅ position          — 26/26
⚠️  detailedPosition — 24/26 → 2 players need input
✅ club              — 26/26
⚠️  age              — 3/26 flagged (last updated >12 months ago — confirm or update)
🚨 marketValueEur   — 18/26 null → manual entry required
✅ teamId            — 26/26 (all validated against teams table)
✅ transfermarktId   — 26/26
✅ id                — 26/26
```

Then enter manual entry mode, looping through each null field for each affected player:

```
--- Manual Entry ---
Player: Endrick Felipe (BR-061)
Field: marketValueEur (integer, euros)
Current value: null
Enter value: _
```

Validation rules during entry:
- `age`: must be integer 15–50
- `marketValueEur`: must be positive integer
- `teamId`: must exist in teams table (validate before accepting)
- `position`: must be one of: GK, DEF, MID, FWD
- `detailedPosition`: free text, but prompt with common examples if blank

On invalid input, reject inline and re-prompt. Do not store partial values.

---

### STEP 4 — Completion Gate Check

After all manual entry is complete, run final check:

```
Final check...
✅ 26/26 players confirmed
✅ 0 null required fields
✅ All teamIds valid
→ Completion gate passed.
```

If gate fails, surface exactly what is still blocking:
```
❌ Completion gate failed:
  - 2 players still have null marketValueEur: [Endrick Felipe, Rodrygo]
  - 1 player has invalid teamId: [Militão]
Resolve these to proceed.
```

Do not write any changes to the JSON until the gate passes.

---

### STEP 5 — Write Selectability Flags

Only runs after gate passes. Two-phase write for the country:

**Phase 1**: Set `selectable: false` for ALL players in that country
**Phase 2**: Set `selectable: true` for the confirmed 26 only

This is a wipe-and-rewrite per country. No player outside the 26 should end up `true`.

Legacy players (in existing submitted rosters, not in the 26): remain at `selectable: false`.
Their roster references are preserved — do not modify or delete them.

---

### STEP 6 — Skill Complete

Output final summary:

```
✅ Squad Finalizer complete — [Country Name]

26 players locked and selectable
[N] legacy players preserved (non-selectable)
JSON updated: [timestamp]
Run logged: country=[X], operator=[session], date=[Y]

Players finalized:
1. Vinícius Júnior (BR-047) — FWD / Left Winger — Real Madrid
2. ...
```

### STEP 7 — Seed the Database

After the JSON is finalized, push it to Neon by running:

```
npm run db:seed
```

Notes:
- `db:seed` upserts **every** confirmed-slot roster, not only the country just
  finalized. If other `data/<code>-players.json` files have local changes
  (check `git status`), they will also be pushed. Surface this to the
  operator before running so nothing ships by accident.
- Requires `DATABASE_URL` in `.env.local`.
- On success, output ends with `Seed complete: N teams, M players, K formations.`
  Verify the just-finalized country's player count matches the JSON length.

### STEP 8 — Update Linear Issue

Using the Linear MCP, identify NEH-63
Look for the country that was just completed. 
Add a ✅ to the end of the country (e.g. France ✅)
Update First line 'n of 48 complete' with n = total ✅
---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Image has >26 names | Extract all, ask user which 26 to proceed with before matching |
| Image has <26 names | Flag count gap immediately. Ask if proceeding with fewer or if image is incomplete |
| Two JSON candidates at similar fuzzy confidence | Surface both, force explicit user pick — never auto-resolve a tie |
| Player in image not in country's JSON pool at all | First try Step 2.5 (DuckDB backfill). Only hard-flag if DuckDB also has no match. |
| `teamId` in player record doesn't exist in teams table | Reject as null-equivalent, require user to input valid ID |
| Skill interrupted mid-run | JSON is untouched — writes only happen post-gate. Safe to restart from Step 1 |
| Country has already been finalized (26 players already selectable) | Warn user: "This country may already have a finalized squad. Proceeding will overwrite. Confirm?" |

---

## Tone & CLI Style

- Be terse and status-driven. This is an operator-facing workflow, not a consumer experience.
- Use ✅ 🚨 ⚠️ ❓ for status at a glance.
- Always show counts (e.g., 18/26) not just flags.
- Never auto-proceed past a confirmation point. Always wait for explicit user input.
- Surface blockers as early as possible — don't wait until Step 4 to reveal a Step 2 problem.