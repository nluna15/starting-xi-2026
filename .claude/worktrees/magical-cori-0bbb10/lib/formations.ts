import formationsJson from "@/data/formations.json";
import type { FormationSlot } from "@/lib/db/schema";

export type FormationDef = {
  name: string;
  slots: FormationSlot[];
};

export const FORMATIONS: FormationDef[] = formationsJson as FormationDef[];

export function getFormation(name: string): FormationDef | undefined {
  return FORMATIONS.find((f) => f.name === name);
}

export const POSITION_LABEL: Record<string, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};
