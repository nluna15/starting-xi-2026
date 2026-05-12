import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/section-heading";

export function AboutSection() {
  return (
    <section className="space-y-3">
      <SectionHeading title="About Starting XI 2026" />
      <Card padding="hero" className="items-center text-center gap-4">
        <div className="font-sans text-[14px] leading-[1.55] text-ink [text-wrap:pretty] max-w-[80ch] mx-auto space-y-4">
          <p>
            The FIFA World Cup doesn&apos;t come around often. And I wanted to celebrate the tournament's return to the USA.This site is for every kind of
            fan - the tactician who dies by formation and the casual supporter who wants to see
            their favorite player shine.
          </p>
          <p>
            Coaches know, matches are not won by the 11 who start on the field. Assemble your starters, then
            go further. Share with others who you believe are the substitutes that could impact
            the game when it matters most.
          </p>
          <p>
            When you&apos;re done, share it. Debate it. Send it to your friends, your group
            chat, your football-obsessed co-worker. This site is a celebration of the largest
            sporting event in the world, that in its own way brings people together.
          </p>
          <p>
            Thanks for landing on my site — I&apos;ll see you in the stands this summer.
          </p>
        </div>
        <p className="font-sans text-[13px] text-ink">
          <span aria-hidden="true">🫶</span> Pixels and Plays
        </p>
      </Card>
    </section>
  );
}
