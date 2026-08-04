import type { MetadataRoute } from "next";
import { WC_2026_SLOTS } from "@/lib/wc-2026-teams";

const BASE_URL = "https://startingxi2026.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const confirmedCodes = WC_2026_SLOTS.filter((s) => s.kind === "confirmed").map((s) =>
    s.code.toLowerCase(),
  );

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/countries`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/community`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/feedback`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const teamPages: MetadataRoute.Sitemap = confirmedCodes.flatMap((code) => [
    { url: `${BASE_URL}/${code}/build`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${BASE_URL}/${code}/crowd`, changeFrequency: "daily" as const, priority: 0.6 },
  ]);

  const communityPages: MetadataRoute.Sitemap = confirmedCodes.map((code) => ({
    url: `${BASE_URL}/community/${code}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...teamPages, ...communityPages];
}
