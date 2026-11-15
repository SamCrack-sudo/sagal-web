// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// URL pública del sitio. Se usa en el sitemap, las URL canónicas y Open Graph.
// Mientras no haya dominio se usa un dominio reservado (.example) que deja claro
// que falta configurarlo. Defínela en Cloudflare como PUBLIC_SITE_URL.
const site = process.env.PUBLIC_SITE_URL || 'https://sagal-robotics.example';

export default defineConfig({
  site,
  // Salida híbrida: las páginas se prerenderizan (HTML estático) y solo las rutas
  // que declaran `export const prerender = false` (API, admin, seguimiento) se
  // ejecutan en el Worker de Cloudflare.
  output: 'static',
  adapter: cloudflare({
    imageService: 'passthrough',
    // Las páginas estáticas se prerenderizan en Node (más rápido y sin red).
    prerenderEnvironment: 'node',
  }),
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/pedido/') && !page.includes('/api/'),
      i18n: { defaultLocale: 'es-CO', locales: { 'es-CO': 'es-CO' } },
    }),
  ],
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  build: { format: 'file' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  env: {
    // Todas son opcionales: si faltan, el sitio funciona en MODO DEMO.
    schema: {
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_ANALYTICS_PROVIDER: envField.enum({
        context: 'client',
        access: 'public',
        values: ['ninguno', 'ga4', 'plausible'],
        default: 'ninguno',
      }),
      PUBLIC_ANALYTICS_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),
      OWNER_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
    validateSecrets: false,
  },
  vite: {
    build: { chunkSizeWarningLimit: 800 },
  },
});
