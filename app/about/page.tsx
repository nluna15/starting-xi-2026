import { AboutSection } from "@/components/home/about-section";

export const metadata = {
  title: "About",
  description:
    "Learn about Starting XI 2026 — a fan-powered tool for building and sharing your ideal 2026 FIFA World Cup squads.",
};

export default function AboutPage() {
  return (
    <div className="space-y-8 py-2">
      <AboutSection />
    </div>
  );
}
