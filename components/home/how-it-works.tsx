import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Pick Your Nation",
    body: "Select from any of the qualified countries.",
  },
  {
    title: "Assemble Your Squad",
    body: "Set the formation, pick your starting 11, and add your best impact substitutes.",
  },
  {
    title: "Compare Against Others",
    body: "See how your lineup compares against others.",
  },
];

export function HowItWorks() {
  return (
    <section>
      <h2 className="mb-3 text-2xl font-semibold text-black">How it Works</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step) => {
          const isCompareStep = step.title === "Compare Against Others";
          const cardBg = "bg-[rgba(111,110,108,0.5)]";
          return (
            <div
              key={step.title}
              className={cn(
                "rounded-xl p-4",
                cardBg,
                isCompareStep && "text-white",
              )}
            >
              <h3
                className={
                  isCompareStep
                    ? "text-[1.3125rem] font-semibold leading-tight"
                    : "text-[1.3125rem] font-semibold leading-tight text-zinc-100"
                }
              >
                {step.title}
              </h3>
              <p
                className={
                  isCompareStep ? "mt-3 text-sm" : "mt-3 text-sm text-white"
                }
              >
                {step.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
