// Primary and secondary flag colors keyed by FIFA 3-letter code. Primary is
// the most identifiable solid color in the national flag (or the national
// team's home strip when one color is canonical). Secondary is the next
// most prominent non-white flag color — used as the dot border so each
// country reads as a two-color identifier.
//
// White is deliberately excluded from secondary slots: the chart sits on a
// light surface, so a white ring would vanish. For truly two-color
// red/white or blue/white flags (e.g. Canada, Switzerland, Japan), the
// secondary falls back to the primary so the dot reads as a clean solid.
//
// Used by the insight distribution chart in the community modals.

type FlagColors = { primary: string; secondary: string };

const FLAG_COLORS: Record<string, FlagColors> = {
  // Hosts
  USA: { primary: "#3C3B6E", secondary: "#B22234" },
  MEX: { primary: "#006847", secondary: "#CE1126" },
  CAN: { primary: "#D52B1E", secondary: "#D52B1E" }, // red+white only → solid red

  // CONMEBOL
  ARG: { primary: "#74ACDF", secondary: "#F6B40E" }, // Sun of May
  BRA: { primary: "#009C3B", secondary: "#FFDF00" },
  URU: { primary: "#7B9BD1", secondary: "#FCD116" }, // Sun of May
  COL: { primary: "#FCD116", secondary: "#003893" },
  ECU: { primary: "#FFD100", secondary: "#034EA2" },
  PAR: { primary: "#D52B1E", secondary: "#0038A8" },

  // UEFA
  FRA: { primary: "#0055A4", secondary: "#EF4135" },
  ENG: { primary: "#CE1124", secondary: "#CE1124" }, // red+white only → solid red
  ESP: { primary: "#AA151B", secondary: "#F1BF00" },
  GER: { primary: "#000000", secondary: "#DD0000" },
  POR: { primary: "#FF0000", secondary: "#006600" },
  NED: { primary: "#FF6600", secondary: "#21468B" },
  BEL: { primary: "#FDDA24", secondary: "#000000" },
  CRO: { primary: "#FF0000", secondary: "#171796" },
  SUI: { primary: "#FF0000", secondary: "#FF0000" }, // red+white only → solid red
  AUT: { primary: "#ED2939", secondary: "#ED2939" }, // red+white only → solid red
  NOR: { primary: "#EF2B2D", secondary: "#003E7E" },
  SWE: { primary: "#FECC00", secondary: "#006AA7" },
  SCO: { primary: "#0065BD", secondary: "#0065BD" }, // blue+white only → solid blue
  CZE: { primary: "#11457E", secondary: "#D7141A" },
  TUR: { primary: "#E30A17", secondary: "#E30A17" }, // red+white only → solid red
  BIH: { primary: "#002F6C", secondary: "#FECB00" },

  // AFC
  JPN: { primary: "#BC002D", secondary: "#BC002D" }, // red+white only → solid red
  KOR: { primary: "#003478", secondary: "#C60C30" },
  IRN: { primary: "#239F40", secondary: "#DA0000" },
  AUS: { primary: "#FFCD00", secondary: "#00843D" },
  KSA: { primary: "#006C35", secondary: "#006C35" }, // green+white only → solid green
  QAT: { primary: "#8A1538", secondary: "#8A1538" }, // maroon+white only → solid maroon
  JOR: { primary: "#000000", secondary: "#CE1126" },
  IRQ: { primary: "#CE1126", secondary: "#000000" },
  UZB: { primary: "#1EB53A", secondary: "#0099B5" },

  // CAF
  MAR: { primary: "#C1272D", secondary: "#006233" },
  SEN: { primary: "#00853F", secondary: "#FDEF42" },
  EGY: { primary: "#CE1126", secondary: "#000000" },
  CIV: { primary: "#FF8200", secondary: "#009E60" },
  ALG: { primary: "#006233", secondary: "#D21034" }, // crescent/star
  TUN: { primary: "#E70013", secondary: "#E70013" }, // red+white only → solid red
  GHA: { primary: "#CE1126", secondary: "#FCD116" },
  RSA: { primary: "#007749", secondary: "#FFB81C" },
  CPV: { primary: "#003893", secondary: "#CF2027" },
  COD: { primary: "#007FFF", secondary: "#F7D618" },

  // CONCACAF (beyond hosts)
  PAN: { primary: "#D21034", secondary: "#005293" },
  HAI: { primary: "#00209F", secondary: "#D21034" },
  CUW: { primary: "#002B7F", secondary: "#F9E814" },
  NZL: { primary: "#012169", secondary: "#CC142B" },
};

const FALLBACK: FlagColors = { primary: "#9CA3AF", secondary: "#4B5563" };

export function getFlagPrimaryColor(code: string): string {
  return (FLAG_COLORS[code.toUpperCase()] ?? FALLBACK).primary;
}

export function getFlagSecondaryColor(code: string): string {
  return (FLAG_COLORS[code.toUpperCase()] ?? FALLBACK).secondary;
}
