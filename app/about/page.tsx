import { AboutSection } from "@/components/home/about-section";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="space-y-8 py-2">
      <AboutSection />
    </div>
  );
}
