import type { MetadataRoute } from "next";
import { search } from "@/lib/api";
import { areaSlug } from "@/lib/slug";
import { completeness } from "@/lib/quality";

export const revalidate = 86400;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

// Staged indexation: emit the core pages plus the top tranche of areas that
// clear the quality gate. We expand the tranche in batches rather than dumping
// all ~7k pages at once (thin-content discipline + crawl-budget hygiene).
const AREA_TRANCHE = 1000;
const PAGE = 200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const core: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/check`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/methodology`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const areas: MetadataRoute.Sitemap = [];
    for (let offset = 0; offset < AREA_TRANCHE; offset += PAGE) {
      const res = await search({ limit: PAGE, offset });
      for (const area of res.results) {
        if (completeness(area).indexable) {
          areas.push({
            url: `${SITE_URL}/area/${areaSlug(area.area_id, area.area_name)}`,
            changeFrequency: "monthly",
            priority: 0.6,
          });
        }
      }
      if (res.offset + res.limit >= res.total) break;
    }
    return [...core, ...areas];
  } catch {
    // API unavailable at build — ship the core sitemap rather than failing.
    return core;
  }
}
