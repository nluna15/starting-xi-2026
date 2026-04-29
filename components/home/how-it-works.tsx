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
        {STEPS.map((step) => (
          <div
            key={step.title}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <h3 className="text-sm font-semibold text-zinc-100">{step.title}</h3>
            <p className="mt-1 text-sm text-white">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
