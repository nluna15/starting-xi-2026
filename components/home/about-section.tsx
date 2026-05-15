import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/home/section-heading";

export function AboutSection() {
  return (
    <section className="space-y-3">
      <SectionHeading title="About Starting XI 2026" />
      <Card padding="hero" className="items-center text-center gap-4">
        <div className="font-sans text-[14px] leading-[1.55] text-ink [text-wrap:pretty] max-w-[80ch] mx-auto space-y-4">
          <p>
            The FIFA World Cup doesn&apos;t come around often. And to celebrate the tournament's return to the USA, I wanted to build this project. This site is for every kind of
            fan - the tactician who dies by formation,the casual supporter who wants to see
            their favorite player shine, or the fan new to soccer who wants to see their country do well.
          </p>
          <p>
            Coaches know that matches are not won by the 11 who start on the field. So assemble your starters, then
            go further by adding your substitutes that could impact the game in a crucial moment.
          </p>
          <p>
            When you&apos;re done, share it. Debate it. Send it to your friends, your group
            chat, your football-obsessed co-worker. This site is a celebration of the largest
            sporting event in the world, that in its own way brings people together.
          </p>
          <p>
            Thanks for landing on my site — I&apos;ll see you in the stands this summer!
          </p>
          <div className="flex flex-col items-center gap-1">
            <a
              href="https://substack.com/@nehemiasluna"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-deep"
            >
              Read my Substack
            </a>
            <a
              href="https://linkedin.com/in/nmluna"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-deep"
            >
              Find me on LinkedIn
            </a>
          </div>
        </div>
        <p className="font-sans text-[13px] text-ink">
          <span aria-hidden="true">🫶</span> Nehemias Luna
        </p>
      </Card>
    </section>
  );
}
