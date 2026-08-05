const BASE_URL = "https://startingxi2026.app";

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Starting XI 2026",
    url: BASE_URL,
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Starting XI 2026",
    url: BASE_URL,
    logo: `${BASE_URL}/opengraph-image.png`,
  };
}

export function buildSportsTeamSchema(team: { name: string; code: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    sport: "Soccer",
    url: `${BASE_URL}/${team.code.toLowerCase()}/build`,
    memberOf: {
      "@type": "SportsOrganization",
      name: "2026 FIFA World Cup",
    },
  };
}

/**
 * Each crumb is a { name, href } pair. The last item is treated as the
 * current page (no item URL per Google's spec).
 */
export function buildBreadcrumbSchema(crumbs: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      ...(i < crumbs.length - 1 ? { item: `${BASE_URL}${crumb.href}` } : {}),
    })),
  };
}
