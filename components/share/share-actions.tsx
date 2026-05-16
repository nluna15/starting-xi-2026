"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { Player } from "@/lib/db/schema";
import type { FormationDef } from "@/lib/formations";
import type { BadgeKind } from "@/components/community/recent-submission-tags";
import { shareImageFilename, useShareImage } from "./use-share-image";

type Props = {
  team: { name: string; flagEmoji: string };
  formation: FormationDef;
  starters: Player[];
  bench: Player[];
  category: { badge: BadgeKind } | null;
};

export function ShareActions({ team, formation, starters, bench, category }: Props) {
  const { state, ensureBlob } = useShareImage({ team, formation, starters, bench, category });
  const [busy, setBusy] = React.useState(false);

  const filename = React.useMemo(() => shareImageFilename(team.name), [team.name]);

  const handleSave = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await ensureBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Defer revoke so Safari has time to read the URL.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Silently swallow — the button returns to its idle label and the user
      // can retry. Surfacing an error toast here is out of scope.
    } finally {
      setBusy(false);
    }
  }, [busy, ensureBlob, filename]);

  const generating = state === "rendering" || busy;

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleSave}
      disabled={generating}
      className="w-full rounded-md! max-[410px]:flex-1 max-[410px]:basis-0 max-[410px]:min-w-0 max-[410px]:px-2"
      aria-live="polite"
    >
      {busy ? (
        <SpinnerLabel>
          <span className="max-[410px]:hidden">Generating image…</span>
          <span className="hidden max-[410px]:inline">…</span>
        </SpinnerLabel>
      ) : (
        <>
          Download<span className="max-[410px]:hidden"> Team</span>
        </>
      )}
    </Button>
  );
}

function SpinnerLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner />
      <span>{children}</span>
    </span>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
