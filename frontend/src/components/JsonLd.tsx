/**
 * Renders one or more JSON-LD structured-data blocks. Server component — the
 * script is emitted straight into the HTML so crawlers read it without JS.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // structured data is trusted, app-generated content
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
