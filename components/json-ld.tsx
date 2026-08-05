/**
 * Server component that renders JSON-LD structured data into the page.
 * Accepts a single schema object or an array of objects (emitted as @graph).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
