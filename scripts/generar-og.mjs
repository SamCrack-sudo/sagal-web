/**
 * Genera la imagen Open Graph (public/og/sagal-og.png, 1200 × 630) a partir de
 * la marca de src/config/marca.ts. Requiere Playwright con Chromium:
 *   npx playwright install chromium   (solo la primera vez, si no lo tienes)
 *   node scripts/generar-og.mjs
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const raiz = fileURLToPath(new URL('..', import.meta.url));
const { chromium } = require('playwright');

// Lee los textos de la marca sin compilar TypeScript.
const fuenteMarca = readFileSync(`${raiz}src/config/marca.ts`, 'utf8');
const valor = (clave) => new RegExp(`${clave}:\\s*'([^']*)'`).exec(fuenteMarca)?.[1] ?? '';
const nombreFuerte = valor('nombreFuerte');
const nombreSuave = valor('nombreSuave');
const ciudad = valor('ciudad');
const region = valor('region');
const fuente = readFileSync(`${raiz}node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2`).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(data:font/woff2;base64,${fuente}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#16325C;color:#F2F5F9;font-family:A,sans-serif;padding:36px}
.marco{position:relative;height:100%;border:1px solid rgba(233,238,245,.3);padding:56px 64px;overflow:hidden;
background-image:linear-gradient(rgba(233,238,245,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(233,238,245,.07) 1px,transparent 1px);background-size:24px 24px}
.logo{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:750;font-stretch:120%}
.logo span{font-weight:400}
h1{margin-top:48px;font-size:64px;line-height:1.02;font-weight:750;font-stretch:116%;letter-spacing:-.01em;max-width:720px}
p{margin-top:24px;font-size:24px;color:#C8D3E2;font-stretch:100%;max-width:620px}
.cta{position:absolute;left:64px;bottom:56px;display:inline-flex;align-items:center;height:58px;padding:0 28px;background:#FF6A13;color:#10151C;font-weight:700;font-size:24px;border-radius:3px}
svg.engranaje{position:absolute;right:-170px;top:40px}
.cajetin{position:absolute;right:40px;bottom:40px;border:1px solid #E9EEF5;font-size:16px;font-stretch:85%;background:#16325C}
.cajetin div{padding:8px 14px;border-bottom:1px solid #E9EEF5}.cajetin div:last-child{border:0}
</style></head><body><div class="marco">
<svg class="engranaje" width="520" height="520" viewBox="0 0 440 440" fill="none">
<circle cx="220" cy="220" r="160" stroke="rgba(233,238,245,.22)" stroke-width="26" stroke-dasharray="18 20"/>
<circle cx="220" cy="220" r="146" stroke="#E9EEF5" stroke-width="1.6"/><circle cx="220" cy="220" r="70" stroke="#E9EEF5" stroke-width="1.4"/>
<circle cx="220" cy="220" r="26" stroke="#FF6A13" stroke-width="4"/>
<path d="M40 220H400M220 40V400" stroke="rgba(233,238,245,.45)" stroke-dasharray="16 4 3 4"/></svg>
<div class="logo"><svg width="44" height="44" viewBox="0 0 32 32" fill="none"><rect x="1" y="1" width="30" height="30" rx="2" stroke="#E9EEF5" stroke-width="1.5"/><circle cx="16" cy="16" r="7" stroke="#FF6A13" stroke-width="2.5"/><path d="M16 4V10M16 22V28M4 16H10M22 16H28" stroke="#E9EEF5" stroke-width="1.5"/></svg>${nombreFuerte} <span>${nombreSuave}</span></div>
<h1>Impresión 3D, diseño CAD y robótica</h1>
<p>Taller de ingeniería en ${ciudad}, ${region}. Cotiza tu pieza al instante.</p>
<div class="cta">Cotizar impresión 3D</div>
<div class="cajetin"><div><strong>${(nombreFuerte + ' ' + nombreSuave).toUpperCase()}</strong></div><div>Plano OG-001 · Rev. A · ${ciudad}</div></div>
</div></body></html>`;

mkdirSync(`${raiz}public/og`, { recursive: true });
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await pagina.setContent(html, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.screenshot({ path: `${raiz}public/og/sagal-og.png` });
await navegador.close();
console.log('Imagen generada en public/og/sagal-og.png');
