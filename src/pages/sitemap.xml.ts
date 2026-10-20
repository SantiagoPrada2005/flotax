import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import { listarVehiculos, LOCAL_CANONICO_DEFECTO } from '@/lib/flota';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site ? site.toString().replace(/\/$/, '') : 'https://flotax.innovaweb.pro';
  const now = new Date().toISOString().slice(0, 10);

  const db = env.DB ? getDb(env.DB) : undefined;
  const vehiculos = await listarVehiculos(db);

  const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
    { loc: `${baseUrl}/`, lastmod: now, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/catalogo`, lastmod: now, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/catalogo/${LOCAL_CANONICO_DEFECTO.slug}`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { loc: `${baseUrl}/c/${LOCAL_CANONICO_DEFECTO.slug}`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
  ];

  for (const v of vehiculos) {
    urls.push({
      loc: `${baseUrl}/vehiculos/${v.id}`,
      lastmod: now,
      changefreq: 'daily',
      priority: '0.7',
    });
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
