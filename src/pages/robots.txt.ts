import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site ?? 'https://sagal-robotics.example').toString();
  const cuerpo = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /pedido/', '', `Sitemap: ${sitemap}`, ''].join('\n');
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
