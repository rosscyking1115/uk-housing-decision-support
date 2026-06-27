import type { Area } from "./types";
import { answerSentence } from "./summary";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/** schema.org Place + BreadcrumbList for an area page, as a @graph. */
export function areaJsonLd(area: Area, slug: string): Record<string, unknown> {
  const url = `${SITE_URL}/area/${slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        "@id": `${url}#place`,
        name: area.area_name,
        description: answerSentence(area),
        url,
        address: {
          "@type": "PostalAddress",
          addressRegion: area.region ?? undefined,
          addressLocality: area.local_authority_name ?? undefined,
          addressCountry: "GB",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Areas", item: `${SITE_URL}/search` },
          { "@type": "ListItem", position: 3, name: area.area_name, item: url },
        ],
      },
    ],
  };
}
