// 48-slot static manifest for the 2026 FIFA World Cup.
//
// Each slot is either a "confirmed" team (real FIFA 3-letter code, name, flag)
// or a "tbd" placeholder (qualifying spot still open). Confirmed entries are
// the source of truth for which teams the seed script upserts into the DB and
// which tiles the homepage links to. TBD entries render as muted, non-clickable
// tiles labeled with their qualifying slot.
//
// This is a plain code constant on purpose. Edit the list as qualification
// resolves — flip a TBD to confirmed by replacing the entry.

export type WcSlot =
  | {
      kind: "confirmed";
      code: string; // FIFA 3-letter code, also the URL segment (uppercase)
      name: string;
      flagEmoji: string;
    }
  | {
      kind: "tbd";
      key: string; // stable React key
      label: string; // shown on the tile
    };

export const WC_2026_SLOTS: WcSlot[] = [
  // Hosts (auto-qualified) — CONCACAF
  { kind: "confirmed", code: "USA", name: "United States", flagEmoji: "🇺🇸" },
  { kind: "confirmed", code: "MEX", name: "Mexico", flagEmoji: "🇲🇽" },
  { kind: "confirmed", code: "CAN", name: "Canada", flagEmoji: "🇨🇦" },

  // CONMEBOL (6)
  { kind: "confirmed", code: "ARG", name: "Argentina", flagEmoji: "🇦🇷" },
  { kind: "confirmed", code: "BRA", name: "Brazil", flagEmoji: "🇧🇷" },
  { kind: "confirmed", code: "URU", name: "Uruguay", flagEmoji: "🇺🇾" },
  { kind: "confirmed", code: "COL", name: "Colombia", flagEmoji: "🇨🇴" },
  { kind: "confirmed", code: "ECU", name: "Ecuador", flagEmoji: "🇪🇨" },
  { kind: "confirmed", code: "PAR", name: "Paraguay", flagEmoji: "🇵🇾" },

  // UEFA (16)
  { kind: "confirmed", code: "FRA", name: "France", flagEmoji: "🇫🇷" },
  { kind: "confirmed", code: "ENG", name: "England", flagEmoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { kind: "confirmed", code: "ESP", name: "Spain", flagEmoji: "🇪🇸" },
  { kind: "confirmed", code: "GER", name: "Germany", flagEmoji: "🇩🇪" },
  { kind: "confirmed", code: "POR", name: "Portugal", flagEmoji: "🇵🇹" },
  { kind: "confirmed", code: "NED", name: "Netherlands", flagEmoji: "🇳🇱" },
  { kind: "confirmed", code: "BEL", name: "Belgium", flagEmoji: "🇧🇪" },
  { kind: "confirmed", code: "CRO", name: "Croatia", flagEmoji: "🇭🇷" },
  { kind: "confirmed", code: "SUI", name: "Switzerland", flagEmoji: "🇨🇭" },
  { kind: "confirmed", code: "AUT", name: "Austria", flagEmoji: "🇦🇹" },
  { kind: "confirmed", code: "NOR", name: "Norway", flagEmoji: "🇳🇴" },
  { kind: "confirmed", code: "SWE", name: "Sweden", flagEmoji: "🇸🇪" },
  { kind: "confirmed", code: "SCO", name: "Scotland", flagEmoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { kind: "confirmed", code: "CZE", name: "Czechia", flagEmoji: "🇨🇿" },
  { kind: "confirmed", code: "TUR", name: "Turkey", flagEmoji: "🇹🇷" },
  { kind: "confirmed", code: "BIH", name: "Bosnia and Herzegovina", flagEmoji: "🇧🇦" },

  // AFC (9)
  { kind: "confirmed", code: "JPN", name: "Japan", flagEmoji: "🇯🇵" },
  { kind: "confirmed", code: "KOR", name: "South Korea", flagEmoji: "🇰🇷" },
  { kind: "confirmed", code: "IRN", name: "Iran", flagEmoji: "🇮🇷" },
  { kind: "confirmed", code: "AUS", name: "Australia", flagEmoji: "🇦🇺" },
  { kind: "confirmed", code: "KSA", name: "Saudi Arabia", flagEmoji: "🇸🇦" },
  { kind: "confirmed", code: "QAT", name: "Qatar", flagEmoji: "🇶🇦" },
  { kind: "confirmed", code: "JOR", name: "Jordan", flagEmoji: "🇯🇴" },
  { kind: "confirmed", code: "IRQ", name: "Iraq", flagEmoji: "🇮🇶" },
  { kind: "confirmed", code: "UZB", name: "Uzbekistan", flagEmoji: "🇺🇿" },

  // CAF (10)
  { kind: "confirmed", code: "MAR", name: "Morocco", flagEmoji: "🇲🇦" },
  { kind: "confirmed", code: "SEN", name: "Senegal", flagEmoji: "🇸🇳" },
  { kind: "confirmed", code: "EGY", name: "Egypt", flagEmoji: "🇪🇬" },
  { kind: "confirmed", code: "CIV", name: "Ivory Coast", flagEmoji: "🇨🇮" },
  { kind: "confirmed", code: "ALG", name: "Algeria", flagEmoji: "🇩🇿" },
  { kind: "confirmed", code: "TUN", name: "Tunisia", flagEmoji: "🇹🇳" },
  { kind: "confirmed", code: "GHA", name: "Ghana", flagEmoji: "🇬🇭" },
  { kind: "confirmed", code: "RSA", name: "South Africa", flagEmoji: "🇿🇦" },
  { kind: "confirmed", code: "CPV", name: "Cape Verde", flagEmoji: "🇨🇻" },
  { kind: "confirmed", code: "COD", name: "DR Congo", flagEmoji: "🇨🇩" },

  // CONCACAF (3 beyond the hosts)
  { kind: "confirmed", code: "PAN", name: "Panama", flagEmoji: "🇵🇦" },
  { kind: "confirmed", code: "HAI", name: "Haiti", flagEmoji: "🇭🇹" },
  { kind: "confirmed", code: "CUW", name: "Curaçao", flagEmoji: "🇨🇼" },

  // OFC (1)
  { kind: "confirmed", code: "NZL", name: "New Zealand", flagEmoji: "🇳🇿" },
];

// FIFA 3-letter code → ISO 3166-1 alpha-2 country code.
// Consumed by the community pitch to feed `countryCode` into the soccer-pitch
// package, whose flag converter only accepts 2-letter regional-indicator
// codes. ENG and SCO are intentionally absent — their flags are tag-based
// emojis (subdivisions of GB) with no regional-indicator equivalent, and
// substituting "GB" would render the wrong flag.
export const FIFA_TO_ISO2: Record<string, string> = {
  USA: "US",
  MEX: "MX",
  CAN: "CA",
  ARG: "AR",
  BRA: "BR",
  URU: "UY",
  COL: "CO",
  ECU: "EC",
  PAR: "PY",
  FRA: "FR",
  ESP: "ES",
  GER: "DE",
  POR: "PT",
  NED: "NL",
  BEL: "BE",
  CRO: "HR",
  SUI: "CH",
  AUT: "AT",
  NOR: "NO",
  SWE: "SE",
  CZE: "CZ",
  TUR: "TR",
  BIH: "BA",
  JPN: "JP",
  KOR: "KR",
  IRN: "IR",
  AUS: "AU",
  KSA: "SA",
  QAT: "QA",
  JOR: "JO",
  IRQ: "IQ",
  UZB: "UZ",
  MAR: "MA",
  SEN: "SN",
  EGY: "EG",
  CIV: "CI",
  ALG: "DZ",
  TUN: "TN",
  GHA: "GH",
  RSA: "ZA",
  CPV: "CV",
  COD: "CD",
  PAN: "PA",
  HAI: "HT",
  CUW: "CW",
  NZL: "NZ",
};

// FIFA 3-letter code → country_name as it appears in the
// transfermarkt-datasets.duckdb `national_teams.country_name` column.
// Used by scripts that build/audit player JSON from the DuckDB snapshot.
// Codes absent here are treated as "no Transfermarkt data" (verified by the
// audit script against the live distinct-country list, not just by my
// memory). When you flip a TBD to confirmed, add the mapping here.
export const TM_COUNTRY_BY_CODE: Record<string, string> = {
  USA: "United States",
  MEX: "Mexico",
  CAN: "Canada",
  ARG: "Argentina",
  BRA: "Brazil",
  URU: "Uruguay",
  COL: "Colombia",
  ECU: "Ecuador",
  PAR: "Paraguay",
  FRA: "France",
  ENG: "England",
  ESP: "Spain",
  GER: "Germany",
  POR: "Portugal",
  NED: "Netherlands",
  BEL: "Belgium",
  CRO: "Croatia",
  SUI: "Switzerland",
  AUT: "Austria",
  NOR: "Norway",
  SWE: "Sweden",
  SCO: "Scotland",
  CZE: "Czechia",
  TUR: "Türkiye",
  BIH: "Bosnia-Herzegovina",
  JPN: "Japan",
  KOR: "Korea, South",
  IRN: "Iran",
  AUS: "Australia",
  KSA: "Saudi Arabia",
  QAT: "Qatar",
  JOR: "Jordan",
  IRQ: "Iraq",
  UZB: "Uzbekistan",
  MAR: "Morocco",
  SEN: "Senegal",
  EGY: "Egypt",
  ALG: "Algeria",
  TUN: "Tunisia",
  GHA: "Ghana",
  RSA: "South Africa",
  PAN: "Panama",
  NZL: "New Zealand",
  // Confirmed slots absent from this Transfermarkt snapshot — handle manually:
  //   CIV (Ivory Coast), CPV (Cape Verde), COD (DR Congo),
  //   HAI (Haiti), CUW (Curaçao)
};
