# SAGAL Robotics — plataforma web

Sitio comercial y herramienta de gestión de **SAGAL Robotics**, un taller de ingeniería en Cajicá (Cundinamarca): diseño CAD, impresión 3D multicolor (Bambu Lab P2S + AMS 2 Pro), robótica y electrónica.

El sitio no es solo una página de presentación: su objetivo es **convertir visitas en solicitudes y pedidos**. Su pieza central es un **cotizador instantáneo** que lee el archivo STL/3MF del cliente, lo muestra en 3D con sus medidas reales y calcula el precio en vivo.

> **Estado: Fase 1 (base y ventas) terminada.** La gestión (Supabase, panel `/admin`, seguimiento de pedidos) corresponde a la fase 2, y la tienda, la educación, los proyectos, las guías y las métricas a la fase 3. Ver [Hoja de ruta](#hoja-de-ruta).

---

## Índice

1. [Arquitectura](#arquitectura)
2. [Cómo correrlo](#cómo-correrlo)
3. [Modo demo](#modo-demo)
4. [Configurar los servicios externos](#configurar-los-servicios-externos) (Resend, Turnstile, Cloudflare, analítica, Supabase)
5. [Cómo cambiar la marca](#cómo-cambiar-la-marca)
6. [Cómo cambiar precios y materiales](#cómo-cambiar-precios-y-materiales)
7. [El cotizador por dentro](#el-cotizador-por-dentro)
8. [Panel de administración](#panel-de-administración)
9. [Marcadores pendientes](#marcadores-pendientes)
10. [Decisiones tomadas](#decisiones-tomadas)
11. [Hoja de ruta](#hoja-de-ruta)

---

## Arquitectura

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Sitio | [Astro 7](https://astro.build) + TypeScript estricto | HTML estático rápido; JavaScript solo donde hace falta. |
| Interactividad | Islas de React 19 | El cotizador y los formularios. La portada **no** carga React. |
| 3D | three.js (carga diferida) | Solo se descarga en la portada (cuando el héroe es visible) y en el cotizador (cuando el cliente sube un archivo). |
| Servidor | Cloudflare Workers con `@astrojs/cloudflare` | Salida híbrida: páginas prerenderizadas + rutas de API en el Worker. |
| Correo | [Resend](https://resend.com) (API HTTP, sin SDK) | Acuse al cliente y aviso al dueño con el archivo adjunto. |
| Antispam | Cloudflare Turnstile + campo trampa | Sin captchas molestos. |
| Datos (fase 2) | Supabase: Postgres, Auth, Storage, RLS | Panel, historial, seguimiento. |
| Pruebas | Vitest | Motor de precios, lectores de mallas, validación, correos. |
| Calidad | ESLint (TS + Astro), `astro check` | Se ejecutan en `npm run build` y `npm run lint`. |

### Estructura de carpetas

```
referencia/diseno.html        Diseño de referencia (fuente de verdad visual)
src/
  config/
    marca.ts                  ÚNICO archivo de marca: nombre, contacto, legal, SEO
    precios.ts                Configuración del cotizador (valores DEMO)
    servicios.ts              Paquetes de diseño CAD
    navegacion.ts             Menús
    funciones.ts              Banderas (seguimiento, pagos, tienda…) apagadas
  styles/
    tokens.css                Tokens del sistema de diseño
    componentes.css           Botones, campos, tablas, etiquetas de estado, avisos…
  lib/
    malla/                    Lectores STL y 3MF + volumen, área, encaje (puro, con pruebas)
    precios/motor.ts          Motor de precios (puro, con pruebas)
    solicitudes/              Validación compartida cliente/servidor y códigos de seguimiento
    servidor/                 Entorno, Turnstile, Resend, plantillas de correo
    cliente/                  Analítica (adaptador) y captura de UTM
    seo.ts                    schema.org: LocalBusiness, Service, FAQPage, migas
  components/
    islas/cotizador/          Cotizador, visor 3D, parámetros, panel de precio
    islas/formularios/        Campos, consentimiento, Turnstile, envío
    islas/portada/            Escena 3D del héroe (reductor que se despieza)
  layouts/Base.astro          Metadatos, Open Graph, encabezado, pie, WhatsApp
  pages/                      Rutas del sitio y API (/api/cotizacion, /api/contacto)
scripts/generar-og.mjs        Genera la imagen Open Graph desde la marca
```

### Mapa del sitio (fase 1)

`/` · `/cotizar` · `/servicios/impresion-3d` · `/servicios/diseno-cad` · `/servicios/robotica-y-electronica` · `/empresas` · `/contacto` · `/nosotros` · `/politica-de-datos` · `/terminos` · 404 · `/robots.txt` · `/sitemap-index.xml`

---

## Cómo correrlo

Requisitos: **Node 22.23.4 o superior** (hay un `.nvmrc`).

```bash
npm install
```

```bash
npm run dev
```

Abre <http://localhost:4321>. Sin configurar nada, el sitio funciona en [modo demo](#modo-demo).

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Revisa tipos (`astro check`) y compila a `dist/`. |
| `npm run preview` | Sirve la compilación en el entorno de Workers local. |
| `npm test` | Pruebas unitarias (Vitest). |
| `npm run lint` | ESLint. |
| `npm run og` | Regenera `public/og/sagal-og.png` (requiere Playwright). |

---

## Modo demo

Si faltan variables de entorno, **el sitio compila y funciona igual**:

- El cotizador calcula precios con los **valores de demostración** de `src/config/precios.ts` y lo dice en pantalla («Precios de demostración [CONFIGURAR]»).
- Los formularios validan todo (también en el servidor, incluido releer el archivo 3D), pero **no envían correos ni guardan nada**: responden con un código de ejemplo y un aviso «Modo demostración».
- Sin `PUBLIC_TURNSTILE_SITE_KEY` no aparece el widget antispam, y sin `TURNSTILE_SECRET_KEY` el servidor omite esa verificación.
- La analítica queda apagada.

El modo demo se desactiva al configurar `RESEND_API_KEY`. Los precios dejan de mostrarse como demo cuando pones `esDemo: false` en `src/config/precios.ts`.

---

## Configurar los servicios externos

Todas las variables están documentadas en [`.env.example`](.env.example). **Nunca subas un `.env` con claves: el repositorio es público.** El `.gitignore` ya excluye `.env` y `.dev.vars`.

Para desarrollo local, copia el archivo:

```bash
cp .env.example .env
```

### 1. Resend (correos)

1. Crea una cuenta en <https://resend.com>.
2. **Domains → Add domain**: agrega tu dominio y crea en tu DNS los registros que te indica (SPF y DKIM). Mientras no tengas dominio, puedes usar el remitente de pruebas `onboarding@resend.dev`, que solo entrega al correo de tu propia cuenta de Resend.
3. **API Keys → Create API key** con permiso *Sending access*.
4. Define:
   - `RESEND_API_KEY` = la clave (secreta).
   - `RESEND_FROM` = `SAGAL Robotics <cotizaciones@tu-dominio.co>`.
   - `OWNER_EMAIL` = el correo que recibe los avisos (por defecto, el de `marca.ts`).

Cada solicitud envía dos correos: al **cliente** (acuse con su número de referencia) y a **ti** (todos los datos, el desglose, el origen UTM, el archivo adjunto y un botón para escribirle por WhatsApp). Los archivos de más de 20 MB no se adjuntan; el correo te avisa para que se los pidas al cliente.

### 2. Cloudflare Turnstile (antispam)

1. En el panel de Cloudflare: **Turnstile → Add widget**.
2. Nombre: «SAGAL web». Dominios: tu dominio y, para probar, `localhost`.
3. Modo: *Managed*.
4. Copia las dos claves:
   - `PUBLIC_TURNSTILE_SITE_KEY` (pública: va en el navegador).
   - `TURNSTILE_SECRET_KEY` (secreta: solo en el servidor).

Configura **las dos o ninguna**: si solo pones la secreta, el servidor rechazará los envíos porque el navegador no envía el token.

### 3. Cloudflare Workers (despliegue)

El sitio se publica como un Worker con archivos estáticos. Opción recomendada, **despliegue automático desde GitHub**:

1. Crea una cuenta en <https://dash.cloudflare.com> (gratis).
2. **Workers & Pages → Create → Import a repository** y elige este repositorio.
3. Configuración de compilación:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Versión de Node: variable `NODE_VERSION` = `22.23.4` (o superior) si el panel lo pide.
4. **Settings → Variables and Secrets**: agrega las variables de `.env.example`. Marca como *Secret* las que no empiezan por `PUBLIC_`. Las `PUBLIC_*` y `PUBLIC_SITE_URL` deben existir **también como variables de compilación** (*Build variables*), porque se incrustan al compilar.
5. **Settings → Domains & Routes**: conecta tu dominio y pon esa URL en `PUBLIC_SITE_URL` (sin barra final).
6. El adaptador de Astro declara un espacio KV llamado `SESSION`; Cloudflare lo crea automáticamente en el primer despliegue.

Despliegue manual desde tu equipo, como alternativa:

```bash
npx wrangler login
```

```bash
npm run build && npx wrangler deploy
```

Para cargar un secreto desde la terminal:

```bash
npx wrangler secret put RESEND_API_KEY
```

### 4. Analítica (opcional, apagada por defecto)

- **Plausible**: `PUBLIC_ANALYTICS_PROVIDER=plausible` y `PUBLIC_ANALYTICS_ID=tu-dominio.co`.
- **GA4**: `PUBLIC_ANALYTICS_PROVIDER=ga4` y `PUBLIC_ANALYTICS_ID=G-XXXXXXX`.

Eventos de conversión que ya se registran: `clic_cta_cotizar`, `clic_whatsapp`, `cotizacion_inicio`, `cotizacion_archivo_cargado`, `cotizacion_envio` (con el valor), `solicitud_cad_envio`, `formulario_envio` y `suscripcion`. Los parámetros UTM, el referente y la página de llegada se guardan en el navegador y viajan con cada solicitud (aparecen en tu correo de aviso).

Si activas GA4 o Plausible, revisa la sección de encargados en la política de datos.

### 5. Supabase (fase 2)

Todavía no se usa. En la fase 2 se agregarán las migraciones SQL, las políticas RLS, los datos semilla y los pasos para:

1. Crear el proyecto en <https://supabase.com>.
2. Ejecutar las migraciones.
3. Configurar el inicio de sesión con enlace mágico, limitado a los correos de `ADMIN_EMAILS`.
4. Crear el bucket de Storage para STL/3MF.
5. Definir `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.

---

## Cómo cambiar la marca

El nombre **SAGAL Robotics es provisional**. Todo lo que depende de la marca vive en **un solo archivo**: [`src/config/marca.ts`](src/config/marca.ts).

- `nombre`, `nombreFuerte`, `nombreSuave`: el texto del logotipo y de todo el sitio.
- `prefijo`: prefijo de los números de referencia (`SR-XXXXX-XXXXX`).
- `eslogan`, `descripcion`, `descripcionCorta`.
- `contacto`: correo, WhatsApp (solo dígitos, con 57), Instagram, MercadoLibre.
- `ubicacion`, `legal` (responsable, NIT, fecha), `equipos` (volumen de impresión), `seo`.

Si cambias el símbolo del logo, edítalo en `src/components/Logo.astro` y en `public/favicon.svg`. Después regenera la imagen para redes:

```bash
npm run og
```

El botón flotante de WhatsApp aparece solo cuando `contacto.whatsapp` tiene un número real (mientras sea un marcador, el sitio ofrece el correo y los formularios).

---

## Cómo cambiar precios y materiales

En la fase 1 se editan en [`src/config/precios.ts`](src/config/precios.ts). **Todos los valores actuales son de demostración** y están marcados `[CONFIGURAR]`; no son precios reales.

| Parámetro | Qué controla |
| --- | --- |
| `materiales[]` | Nombre, densidad (g/cm³), precio por kg, factor de velocidad, colores, multicolor, activo. |
| `colores[]`, `calidades[]`, `posprocesados[]`, `urgencias[]` | Opciones del cotizador, cada una con su precio o factor y bandera `activo`. |
| `desperdicio`, `paredes` | Material de más y el modelo de volumen efectivo. |
| `caudalCm3PorHora`, `factorCalibracion`, `horasMinimasPorPieza` | Estimación de tiempo. Calíbralo comparando con los tiempos de Bambu Studio. |
| `tarifaMaquinaHora`, `preparacionPorPedido`, `recargoCambioColor` | Costos fijos y variables. |
| `margen`, `pedidoMinimo`, `descuentosCantidad`, `iva`, `redondeo` | Precio final. |
| `entrega` | Horas de máquina por día y días de preparación, para el plazo. |
| `esDemo` | Ponlo en `false` cuando los precios sean reales. |

Los paquetes de diseño CAD están en `src/config/servicios.ts`. En la fase 2 todo esto se editará desde `/admin` sin tocar código.

**Para calibrar el tiempo**: lamina 3 o 4 piezas reales en Bambu Studio, anota las horas y ajusta `factorCalibracion` hasta que el cotizador dé tiempos parecidos.

---

## El cotizador por dentro

1. El cliente sube un **STL** (binario o ASCII) o un **3MF** (con componentes, transformaciones y unidades). El archivo se lee **en el navegador**: no se sube nada hasta que envía la cotización.
2. Se calculan el **volumen** (método de tetraedros con signo), el área, la caja límite y si **cabe en el volumen de impresión** (también probando a rotarla). Se avisa si la malla parece abierta.
3. El visor three.js muestra la pieza sobre la cama, con el volumen de impresión a escala y las cotas.
4. El cliente elige material, colores (AMS), calidad, relleno, cantidad, posprocesado y urgencia; el precio y el plazo se recalculan en vivo.
5. Al enviar, **el servidor vuelve a leer el archivo y recalcula el precio** con el mismo motor, así que el precio no se puede manipular desde el navegador.

### Fórmula (`src/lib/precios/motor.ts`)

```
volumen efectivo = mín(V, área × perímetros × ancho de línea) + resto × relleno
gramos  = volumen efectivo × densidad × (1 + desperdicio)
horas   = máx(horas mínimas, volumen efectivo / (caudal × f.calidad × f.material) × calibración)
costo   = (gramos × precio/g + horas × tarifa + posprocesado + cambios de color × recargo) × cantidad
          + preparación del pedido
precio  = máx(pedido mínimo, costo × (1 + margen)) × (1 − descuento por cantidad) × (1 + urgencia)
total   = precio + IVA (si se cobra)
```

---

## Panel de administración

Llega en la **fase 2**. Incluirá: resumen (cotizaciones de la semana, conversión, ingresos, ticket promedio, pedidos en producción, origen de clientes), tablero por estados (nuevo → cotizado → aprobado → en producción → listo → entregado → pagado), clientes, catálogo, precios y materiales, y exportación a CSV, con acceso por enlace mágico solo para `ADMIN_EMAILS`.

Mientras tanto, **cada solicitud te llega por correo** con todos los datos y el archivo adjunto, y ese correo es el registro de la solicitud. Las etiquetas de estado del sistema de diseño ya existen (`.estado--nuevo`, `.estado--en_produccion`, etc.).

---

## Marcadores pendientes

Todo valor entre corchetes es un dato que falta. Para encontrarlos todos:

```bash
grep -rnE "\[(CONFIGURAR|CONFIRMAR|MARCADOR|MI |FOTO|NOMBRE|DIRECCIÓN|HORARIO|NIT|FECHA|AÑO|ENLACE)" src
```

### Datos del negocio (`src/config/marca.ts`)

- [ ] `contacto.whatsapp`: número con 57, solo dígitos (activa el botón de WhatsApp).
- [ ] `contacto.instagram`: usuario sin arroba.
- [ ] `contacto.mercadoLibre`: enlace a la tienda (fase 3).
- [ ] `ubicacion.direccion` (o déjalo sin publicar) y `ubicacion.horario`.
- [ ] `legal.responsable`, `legal.identificacion` (NIT o cédula), `legal.fechaActualizacion`.
- [ ] `fundacion`: año.
- [ ] **CONFIRMAR** el volumen de impresión de 256 × 256 × 256 mm.

### Precios y operación

- [ ] Todos los `[CONFIGURAR]` de `src/config/precios.ts`: precio por kg, tarifa de máquina, preparación, recargo de color AMS, margen, pedido mínimo, descuentos, urgencias, posprocesados, IVA, calibración y entregas. Luego `esDemo: false`.
- [ ] Catálogo real de **materiales y colores** (los actuales son de ejemplo).
- [ ] **CONFIRMAR** el máximo de colores por pieza del AMS 2 Pro (`maxColores`).
- [ ] Paquetes CAD (`src/config/servicios.ts`): precio, plazo, revisiones y condiciones del abono al pedido.
- [ ] Medios de pago, anticipo, facturación electrónica, envíos y zonas de entrega (preguntas frecuentes de `/`, `/cotizar` y `/empresas`).

### Contenido

- [ ] Fotos, nombres y descripción de 3 proyectos destacados (portada).
- [ ] Foto del taller o del fundador y, si quieres, su nombre (`/nosotros`).
- [ ] Documentación entregada en proyectos de robótica; acuerdo de confidencialidad; visitas técnicas.

### Legal (borradores: **revísalos con un abogado**)

- [ ] `/politica-de-datos`: proveedores encargados (Cloudflare, Resend, analítica…) y plazo de conservación de archivos.
- [ ] `/terminos`: vigencia de cotizaciones, IVA, anticipo, tolerancia dimensional, garantía, propiedad de los diseños, entregas.

### Cuentas y configuración (tú)

- [ ] Dominio y `PUBLIC_SITE_URL`.
- [ ] Resend (con dominio verificado), Turnstile y Cloudflare Workers.
- [ ] Analítica (opcional).

---

## Decisiones tomadas

- **Astro 7 + Cloudflare**, como pedía el documento. Salida *estática con rutas de servidor* (lo que antes se llamaba «híbrida»): todo se prerenderiza salvo `/api/*`.
- **Sin base de datos en la fase 1**: el correo al dueño hace de registro (con el archivo adjunto). La página de seguimiento `/pedido/[codigo]` está detrás de la bandera `seguimientoPedidos` y llega con Supabase. Los códigos ya son no adivinables (≈ 8 × 10¹⁴ combinaciones).
- **El precio se recalcula en el servidor** a partir del archivo; el del navegador es orientativo.
- **Volumen efectivo** = paredes (área × perímetros × ancho de línea) + interior × relleno. No modela capas superiores/inferiores ni soportes: el desperdicio los absorbe. Cambios de color AMS por pieza = colores − 1.
- La **preparación** se cobra una vez por pedido y el **pedido mínimo** se aplica al pedido completo, antes del descuento y de la urgencia (orden literal de la fórmula).
- El panel de precio **no muestra el margen** al cliente: muestra peso, horas, descuento, urgencia e IVA.
- Los STL no guardan unidades: el cotizador asume mm y permite cambiar a cm o pulgadas (el servidor aplica la misma escala). Los 3MF usan las unidades que declaran.
- Límite de archivo 3D: 50 MB; adjuntos de formularios: 5 archivos de 10 MB.
- **La portada no usa React**: el héroe 3D es un script de 1,7 KB que descarga three.js solo si el equipo lo permite (WebGL, sin movimiento reducido, ≥ 4 núcleos y ≥ 4 GB, sin ahorro de datos ni 2G). Si no, queda el plano SVG del diseño de referencia.
- Los **materiales de ejemplo** (PLA, PETG, ASA, TPU) usan densidades típicas de cada familia; los precios son de demostración.
- La captura de correos «avísame del catálogo» abre un correo prellenado en la fase 1; el formulario de suscripción llega con la tienda (fase 3).

---

## Hoja de ruta

- **Fase 1 — Base y ventas** ✔︎ Sistema de diseño, layout, portada con el momento 3D, servicios, empresas, contacto, cotizador completo, legales, SEO y modo demo.
- **Fase 2 — Gestión**: Supabase (migraciones, RLS, semilla), autenticación con enlace mágico, panel `/admin`, seguimiento `/pedido/[codigo]`, notificaciones al cliente por cambio de estado.
- **Fase 3 — Escala**: tienda con variantes y enlace a MercadoLibre, educación (talleres y kits, formulario para colegios), proyectos, guías en MDX (3 borradores), suscripción, pagos detrás de bandera y panel de métricas.
