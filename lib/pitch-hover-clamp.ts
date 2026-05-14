// The `soccer-pitch` package renders its hover card centered on each player
// marker (`left: 50%; transform: translateX(-50%)`). When the marker sits near
// the pitch edges (e.g. LB at x=15%, RB at x=85%), the card extends past the
// pitch on narrow viewports and gets clipped.
//
// We can't reposition the card from React (it's rendered inside the package),
// but we can override its transform via scoped CSS. For each slot we know its
// X% from the formation. Using `container-type: inline-size` on the pitch
// surface lets `1cqw` resolve to 1% of pitch width inside `calc()`, so we can
// express the clamp without measuring DOM at runtime.
//
// The override only kicks in when an edge would overflow — for centered slots
// both `max(0, …)` terms are 0 and the resulting transform equals the default
// `translateX(-50%)`. Animation on entry (framer-motion's scale/y) is lost
// because we replace `transform` outright, but the 140ms tween is brief.

// Half of the card's `max-width: 14rem` — the worst-case half-width we have
// to keep inside the pitch.
const CARD_HALF = "7rem";

function clampTransform(xPct: number): string {
  const overflowLeft = `max(0px, calc(${CARD_HALF} - ${xPct}cqw))`;
  const overflowRight = `max(0px, calc(${xPct - 100}cqw + ${CARD_HALF}))`;
  return `transform: translateX(calc(-50% + ${overflowLeft} - ${overflowRight})) !important;`;
}

const HOVER_CARD_SEL = ".sp-min-w-\\[10rem\\]";

export function hoverCardClampCSS(
  scope: string,
  starterXs: readonly number[],
  benchCount: number,
): string {
  const rules: string[] = [
    // Establish a containment context so `cqw` inside markers maps to the
    // pitch surface width (and bench-row width for bench markers).
    `.${scope} .sp-soccer-pitch > .sp-relative { container-type: inline-size; }`,
  ];

  starterXs.forEach((x, i) => {
    const sel = `.${scope} .sp-soccer-pitch > .sp-relative > .sp-absolute.sp-inset-0:last-child > :nth-child(${i + 1}) ${HOVER_CARD_SEL}`;
    rules.push(`${sel} { ${clampTransform(x)} }`);
  });

  if (benchCount > 0) {
    rules.push(
      `.${scope} .sp-bench-row { container-type: inline-size; }`,
    );
    const step = 100 / (benchCount + 1);
    for (let i = 0; i < benchCount; i++) {
      const x = step * (i + 1);
      const sel = `.${scope} .sp-bench-row > .sp-absolute > :nth-child(${i + 1}) ${HOVER_CARD_SEL}`;
      rules.push(`${sel} { ${clampTransform(x)} }`);
    }
  }

  return rules.join("\n");
}
