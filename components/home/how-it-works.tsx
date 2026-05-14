"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/home/section-heading";
import { HowItWorksModal } from "@/components/chrome/how-it-works-modal";

export function HowItWorks() {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="space-y-3">
      <SectionHeading title="How it Works" />
      <Card padding="hero" className="gap-5">
        <div className="mx-auto flex max-w-[68ch] flex-col gap-4 text-center font-sans text-[14px] leading-[1.55] text-ink-3 [text-wrap:pretty]">
          <p>
            The World Cup turns everyone into a football expert. First-timers and lifelong fans
            alike suddenly have strong opinions. Who starts? Who comes off the bench? Who do you
            build around?
          </p>
          <p>
            Pick a country, choose your formation, and build your team. Submit your lineup and
            find out if you&apos;re a Consensus, Hot Take, or Throwback manager. Then see how
            other fans would line up the team or against you.
          </p>
          <p className="display text-[18px] leading-[1.2] text-ink [text-wrap:balance]">
            Pick your country. Build your XI. See where you stand.
          </p>
        </div>
        <div className="flex justify-center pt-1">
          <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
            See the full guide
          </Button>
        </div>
      </Card>
      <HowItWorksModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
