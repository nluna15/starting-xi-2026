"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SubmittedModal } from "@/components/submitted-modal";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/db/schema";

type Props = {
  slug: string;
  team: { name: string; flagEmoji: string };
  teamCode: string;
  starters: Player[];
  bench: Player[];
  pickRates: {
    totalSubmissions: number;
    picksByPlayerId: Map<number, number>;
  };
};

export function LineupSubmittedOverlay({
  slug,
  team,
  teamCode,
  starters,
  bench,
  pickRates,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "1";
  const [modalOpen, setModalOpen] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  const showSubmitButton = justSubmitted && !dismissed;

  function handleSubmit() {
    setModalOpen(true);
  }

  function handleClose() {
    setModalOpen(false);
    setDismissed(true);
    router.replace(`/lineup/${slug}`, { scroll: false });
    requestAnimationFrame(() => {
      const noteEl = document.getElementById("lineup-note");
      if (noteEl) {
        noteEl.scrollIntoView({ behavior: "smooth", block: "center" });
        noteEl.focus({ preventScroll: true });
      }
    });
  }

  return (
    <>
      {showSubmitButton && (
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          className="w-full"
        >
          Submit Squad
        </Button>
      )}
      <SubmittedModal
        open={modalOpen}
        onClose={handleClose}
        team={team}
        teamCode={teamCode}
        starters={starters}
        bench={bench}
        pickRates={pickRates}
      />
    </>
  );
}
