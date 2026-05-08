import type { Player, FormationSlot } from "@/lib/db/schema";
import { lastName } from "@/lib/utils";

type Props = {
  formationName: string;
  slots: FormationSlot[];
  starters: Player[];
};

const POSITION_ORDER: Array<FormationSlot["position"]> = ["GK", "DEF", "MID", "FWD"];
const POSITION_LABEL: Record<FormationSlot["position"], string> = {
  GK: "GK",
  DEF: "DEF",
  MID: "MID",
  FWD: "FWD",
};

// Buckets starters by their formation slot's broad position. Slot order is
// preserved within each bucket so the on-pitch reading order (left → right,
// back → front from the formation definition) carries over.
export function SubmissionPositionList({ formationName, slots, starters }: Props) {
  const buckets: Record<FormationSlot["position"], string[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };
  for (let i = 0; i < slots.length; i++) {
    const player = starters[i];
    if (!player) continue;
    buckets[slots[i].position].push(lastName(player.fullName).toUpperCase());
  }

  return (
    <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
      <div className="mono mb-2 text-[10px] font-bold tracking-[0.16em] text-ink-faint">
        FULL XI · {formationName}
      </div>
      <ul className="space-y-1.5">
        {POSITION_ORDER.map((pos) => {
          const names = buckets[pos];
          if (names.length === 0) return null;
          return (
            <li key={pos} className="flex gap-2.5 text-[12px] leading-tight">
              <span className="mono shrink-0 w-7 pt-px text-[10px] font-bold tracking-[0.12em] text-ink-faint">
                {POSITION_LABEL[pos]}
              </span>
              <span className="cond text-[12px] tracking-[0.04em] text-ink">
                {names.join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
