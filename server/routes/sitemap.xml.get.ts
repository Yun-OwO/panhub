function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const siteUrl = (config.public?.siteUrl as string) || "";
  const base = siteUrl.replace(/\/$/, "");
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    { loc: `${base}/`, priority: 0.9 },
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map(
        (u) =>
          `<url><loc>${escapeXml(u.loc)}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${u.priority.toFixed(
            1
          )}</priority></url>`
      )
      .join("") +
    `</urlset>`;

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  return body;
});
