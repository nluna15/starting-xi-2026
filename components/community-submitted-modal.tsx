"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SubmittedModal } from "@/components/submitted-modal";
import type { Player } from "@/lib/db/schema";
import type { FormationDef } from "@/lib/formations";

type Props = {
  team: { name: string; flagEmoji: string };
  teamCode: string;
  formation: FormationDef;
  starters: Player[];
  bench: Player[];
  pickRates: {
    totalSubmissions: number;
    picksByPlayerId: Map<number, number>;
  };
};

export function CommunitySubmittedModal({
  team,
  teamCode,
  formation,
  starters,
  bench,
  pickRates,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);

  function handleClose() {
    setOpen(false);
    router.replace("/community", { scroll: false });
  }

  return (
    <SubmittedModal
      open={open}
      onClose={handleClose}
      team={team}
      teamCode={teamCode}
      formation={formation}
      starters={starters}
      bench={bench}
      pickRates={pickRates}
    />
  );
}
