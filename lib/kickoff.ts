// 2026 FIFA World Cup kicks off June 11, 2026 (Mexico City opener).
// Stored as UTC midnight so the countdown is timezone-stable on the server.
export const WC_2026_KICKOFF = new Date(Date.UTC(2026, 5, 11));

export function daysUntilKickoff(now: Date = new Date()): number {
  const ms = WC_2026_KICKOFF.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
