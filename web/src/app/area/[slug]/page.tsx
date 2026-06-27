import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ApiError, getArea } from "@/lib/api";
import { areaSlug, msoaFromSlug } from "@/lib/slug";
import { completeness } from "@/lib/quality";
import { answerSentence } from "@/lib/summary";
import { areaJsonLd } from "@/lib/structured-data";
import { AreaReceipt } from "@/components/AreaReceipt";
import { JsonLd } from "@/components/JsonLd";
import type { Area } from "@/lib/types";

// ISR: pre-render on first request, then serve cached for a day. Long-tail
// areas generate on demand (dynamicParams defaults to true).
export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<Area | null> {
  try {
    return await getArea(msoaFromSlug(slug));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = await load(slug);
  if (!area) return { title: "Area not found", robots: { index: false, follow: false } };

  const { indexable } = completeness(area);
  const title = `${area.area_name} — area score, rent & crime`;
  const canonical = `/area/${areaSlug(area.area_id, area.area_name)}`;
  return {
    title,
    description: answerSentence(area),
    alternates: { canonical },
    openGraph: { title, description: answerSentence(area), url: canonical },
    // Thin-content discipline: sparse areas stay out of the index until they fill in.
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = await load(slug);
  if (!area) notFound();

  // Canonicalise: send /area/<code> or a stale name straight to the human slug.
  const canonical = areaSlug(area.area_id, area.area_name);
  if (slug !== canonical) permanentRedirect(`/area/${canonical}`);

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <nav className="mb-6 text-xs text-ink-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/search" className="hover:text-ink">Areas</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{area.area_name}</span>
      </nav>

      <AreaReceipt area={area} />

      <div className="mt-10 rounded-card border border-rule bg-paper-raised p-5">
        <h2 className="text-sm font-semibold">Compare this with somewhere else</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Set your own priorities and see how {area.area_name} ranks against every
          other neighbourhood.
        </p>
        <Link
          href={`/search?regions=${encodeURIComponent(area.region ?? "")}`}
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          Search areas in {area.region ?? "England & Wales"} →
        </Link>
      </div>

      <p className="mt-8 text-xs text-ink-faint">
        Area-level indicators only — not a property valuation, and never a
        &ldquo;safe&rdquo; or &ldquo;unsafe&rdquo; label. See our{" "}
        <Link href="/methodology" className="underline">methodology</Link>.
      </p>

      <JsonLd data={areaJsonLd(area, canonical)} />
    </article>
  );
}
