"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type Step = { title: string; body: React.ReactNode };

const STEPS: Step[] = [
  {
    title: "Pick a Country",
    body: "Choose any qualified World Cup nation — a host like USA, a perennial powerhouse like France, or a country that you're curious about. No wrong answer.",
  },
  {
    title: "Choose a Formation",
    body: "Set your team's shape before you pick players. 5-4-1, 3-5-2 (defense-midfield-forwards), more defenders means hard to score on, more forwards means you want to score goals. Pick your philosophy.",
  },
  {
    title: "Build Your XI",
    body: "Fill 11 starting spots plus bench. Each player card shows position, age, and caps (appearances) — plus how often other fans have picked them. See 🔥🔥🔥? The crowd loves them. No heat? You can make a bold pick.",
  },
  {
    title: "Submit and Share",
    body: "Hit submit and get a unique link to your lineup — complete with a pitch graphic, formation, and squad stats. Post it, send it, save it for gameday.",
  },
  {
    title: "See How You Stack Up",
    body: (
      <>
        Check <strong className="font-semibold text-ink">Lineup Data</strong> to see the
        crowd&apos;s consensus XI for any country. Your lineup gets a label like{" "}
        <strong className="font-semibold" style={{ color: "#dc2626" }}>
          Hot Take
        </strong>{" "}
        (bold, contrarian) or{" "}
        <strong className="font-semibold" style={{ color: "#92400e" }}>
          Throwback
        </strong>{" "}
        (old-school, classic picks). Which one are you?
      </>
    ),
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HowItWorksModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Your First Starting XI" size="md">
      <div className="flex items-center justify-between gap-2 border-b border-line px-6 py-4">
        <h2 className="cond text-[13px] text-ink">Your First Starting XI</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-my-1 -mr-2 inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[70dvh] overflow-y-auto px-6 py-5">
        <ol className="space-y-5">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.title}>
              {i === 2 && (
                <li aria-hidden className="flex justify-center pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/how-it-works-heat.png"
                    alt="Player card showing 🔥🔥 heat icons"
                    width={783}
                    height={136}
                    className="w-full max-w-[360px] rounded-lg border border-line"
                  />
                </li>
              )}
              {i === 4 && (
                <li aria-hidden className="flex justify-center pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/how-it-works-hot-take.png"
                    alt="Example England lineup labeled HOT TAKE"
                    width={406}
                    height={516}
                    className="w-full max-w-[260px] rounded-lg border border-line"
                  />
                </li>
              )}
              <li className="flex gap-3">
                <span className="display text-[20px] leading-[1.05] text-ink-faint tabular-nums">
                  {i + 1}.
                </span>
                <div className="flex flex-1 flex-col gap-1.5">
                  <h3 className="display text-[20px] leading-[1.05] text-ink [text-wrap:balance]">
                    {step.title}
                  </h3>
                  <p className="font-sans text-[14px] leading-[1.5] text-ink-3 [text-wrap:pretty]">
                    {step.body}
                  </p>
                </div>
              </li>
            </React.Fragment>
          ))}
        </ol>
      </div>
    </Modal>
  );
}
