# SAGAL Robotics — plataforma web

Sitio comercial y herramienta de gestión de **SAGAL Robotics**, un taller de ingeniería en Cajicá (Cundinamarca): diseño CAD, impresión 3D multicolor (Bambu Lab P2S + AMS 2 Pro), robótica y electrónica.

El sitio no es solo una página de presentación: su objetivo es **convertir visitas en solicitudes y pedidos**. Su pieza central es un **cotizador instantáneo** que lee el archivo STL/3MF del cliente, lo muestra en 3D con sus medidas reales y calcula el precio en vivo.

> **¿No eres programador?** Empieza por la [Guía del sitio para no programadores](GUIA.md): cómo funciona, qué hace cada archivo y cómo pedir cambios.

> **Estado: Fase 2 (gestión) terminada.** Base de datos Supabase con seguridad por filas, panel `/admin`, seguimiento público `/pedido/[codigo]` y correos de avance. La fase 3 (tienda, educación, proyectos, guías y métricas avanzadas) está pendiente. Ver [Hoja de ruta](#hoja-de-ruta).

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
| Datos | Supabase: Postgres, Auth (enlace mágico), Storage, RLS | Solicitudes, clientes, archivos, historial y precios editables. Sin Supabase, almacén de demostración en memoria. |
| Pruebas | Vitest + PGlite | Motor de precios, lectores de mallas, validación, correos, métricas y la migración SQL con sus políticas RLS ejecutada en un Postgres real. |
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
    funciones.ts              Banderas (seguimiento activo; pagos y tienda apagados)
  styles/
    tokens.css                Tokens del sistema de diseño
    componentes.css           Botones, campos, tablas, etiquetas de estado, avisos…
  lib/
    malla/                    Lectores STL y 3MF + volumen, área, encaje (puro, con pruebas)
    precios/motor.ts          Motor de precios (puro, con pruebas)
    solicitudes/              Validación compartida cliente/servidor y códigos de seguimiento
    servidor/                 Entorno, Turnstile, Resend, plantillas de correo y avisos
    datos/                    Repositorio: Supabase (real) y demo (memoria), sesión del panel
    gestion/                  Estados, métricas del resumen, CSV y formatos (puro, con pruebas)
    cliente/                  Analítica (adaptador) y captura de UTM
    seo.ts                    schema.org: LocalBusiness, Service, FAQPage, migas
  components/
    islas/cotizador/          Cotizador, visor 3D, parámetros, panel de precio
    islas/formularios/        Campos, consentimiento, Turnstile, envío
    islas/portada/            Escena 3D del héroe (reductor que se despieza)
    islas/admin/              Editor de precios y materiales del panel
  layouts/Base.astro          Metadatos, Open Graph, encabezado, pie, WhatsApp
  layouts/Admin.astro         Layout del panel
  middleware.ts               Protege /admin y /api/admin (solo ADMIN_EMAILS)
  pages/                      Rutas del sitio, del panel (admin/) y API
supabase/
  migrations/                 Esquema SQL con RLS, bucket de archivos y disparadores
  seed.sql                    Configuración de precios inicial (npm run semilla)
  esquema.test.ts             Prueba la migración y las políticas en PGlite
scripts/generar-og.mjs        Genera la imagen Open Graph desde la marca
scripts/generar-semilla.mjs   Genera supabase/seed.sql desde src/config/precios.ts
```

### Mapa del sitio

Público: `/` · `/cotizar` · `/servicios/impresion-3d` · `/servicios/diseno-cad` · `/servicios/robotica-y-electronica` · `/empresas` · `/contacto` · `/nosotros` · `/pedido/[codigo]` · `/politica-de-datos` · `/terminos` · 404 · 500 · `/robots.txt` · `/sitemap-index.xml`

Panel: `/admin` (resumen) · `/admin/solicitudes` · `/admin/solicitudes/[id]` · `/admin/clientes` · `/admin/clientes/[id]` · `/admin/precios` · `/admin/exportar` · `/admin/ingresar`

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
| `npm run semilla` | Regenera `supabase/seed.sql` a partir de `src/config/precios.ts`. |

---

## Modo demo

Si faltan variables de entorno, **el sitio compila y funciona igual**:

- El cotizador calcula precios con los **valores de demostración** de `src/config/precios.ts` y lo dice en pantalla («Precios de demostración [CONFIGURAR]»).
- **Sin Supabase**, las solicitudes se guardan en un **almacén de demostración en memoria** (con datos de ejemplo marcados «(demo)»), que se borra al reiniciar. El panel `/admin` abre sin iniciar sesión, con una franja «Modo demo», y el seguimiento `/pedido/[codigo]` funciona con esos datos.
- **Sin Resend**, no se envían correos; los formularios lo avisan.
- Sin `PUBLIC_TURNSTILE_SITE_KEY` no aparece el widget antispam, y sin `TURNSTILE_SECRET_KEY` el servidor omite esa verificación.
- La analítica queda apagada.

Son dos interruptores independientes: los datos reales se activan con las variables de Supabase y los correos con `RESEND_API_KEY`. Los precios dejan de mostrarse como demo cuando desmarcas «Precios de demostración» en `/admin/precios`.

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

### 5. Supabase (base de datos, archivos y acceso al panel)

**1. Crea el proyecto**

1. Entra a <https://supabase.com>, crea una cuenta y luego **New project**.
2. Región: la más cercana a Colombia (por ejemplo *South America (São Paulo)*).
3. Guarda la contraseña de la base de datos en un lugar seguro.

**2. Crea las tablas** (una sola vez)

1. En el panel de Supabase abre **SQL Editor → New query**.
2. Copia todo el contenido de [`supabase/migrations/20261116000000_esquema_inicial.sql`](supabase/migrations/20261116000000_esquema_inicial.sql), pégalo y pulsa **Run**.
3. Abre otra consulta, pega [`supabase/seed.sql`](supabase/seed.sql) (los precios iniciales de demostración) y pulsa **Run**.
4. Comprueba en **Table Editor** que aparecen `solicitudes`, `clientes`, `archivos`, `eventos`, `configuracion` y `administradores`, todas con RLS activado, y en **Storage** el bucket privado `archivos`.

Si prefieres la terminal, con la CLI de Supabase: `npx supabase link --project-ref TU_PROYECTO` y luego `npx supabase db push`.

**3. Configura el inicio de sesión del panel**

1. **Authentication → URL Configuration**:
   - *Site URL*: tu dominio, por ejemplo `https://www.tu-dominio.co`.
   - *Redirect URLs*: agrega `https://www.tu-dominio.co/admin/auth/confirmar` y, para probar en tu computador, `http://localhost:4321/admin/auth/confirmar`.
2. **Authentication → Emails → Magic Link** (plantilla del correo): reemplaza el enlace por
   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.
   Así el enlace funciona aunque lo abras en otro navegador o en el celular. Sin este cambio también funciona, pero solo en el mismo navegador donde lo pediste.
3. **Correo de los enlaces (muy recomendado):** el servicio de correo incluido en Supabase solo envía unos pocos correos por hora. En **Authentication → Emails → SMTP Settings** activa un SMTP propio con Resend:
   - Host `smtp.resend.com`, puerto `465`, usuario `resend`.
   - Contraseña: tu clave de API de Resend.
   - Remitente: una dirección de tu dominio verificado.
4. *(Opcional, más seguro)* En **Authentication → Sign In / Providers** desactiva *Allow new users to sign up* y crea cada administrador en **Authentication → Users → Add user**. Aunque no lo hagas, alguien que se registre por su cuenta no ve ningún dato: las políticas RLS solo dejan pasar a los correos de `ADMIN_EMAILS`.

**4. Copia las claves al sitio**

En **Project Settings → API Keys** (o **API**) copia estos tres valores y ponlos en Cloudflare (y en tu `.env` para probar en tu computador):

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | La *Project URL* (`https://xxxx.supabase.co`). |
| `SUPABASE_ANON_KEY` | La clave pública: *anon* o *publishable*. |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave **secreta**: *service_role* o *secret*. Márcala como *Secret* en Cloudflare. **Nunca** la pegues en el código ni en una variable `PUBLIC_`. |
| `ADMIN_EMAILS` | Los correos con acceso al panel, separados por coma. |

Después entra a `/admin/ingresar`, escribe tu correo y abre el enlace que te llega. Cada vez que un administrador inicia sesión, la tabla `administradores` (que usan las políticas RLS) queda igual a `ADMIN_EMAILS`.

**Para probar las políticas sin una cuenta:** `npm test` ejecuta la migración en un Postgres local (PGlite) y verifica que un visitante y un usuario sin permiso no ven datos, y que un administrador sí.

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

Se editan en **`/admin/precios`**, sin tocar código: el editor valida cada valor, muestra una cotización de prueba mientras escribes y aplica los cambios al cotizador en cuanto guardas. Los valores iniciales salen de [`src/config/precios.ts`](src/config/precios.ts) (también se usan como respaldo si la base de datos no responde). **Todos son de demostración** y están marcados `[CONFIGURAR]`; no son precios reales.

| Parámetro | Qué controla |
| --- | --- |
| `materiales[]` | Nombre, densidad (g/cm³), precio por kg, factor de velocidad, colores, multicolor, activo. |
| `colores[]`, `calidades[]`, `posprocesados[]`, `urgencias[]` | Opciones del cotizador, cada una con su precio o factor y bandera `activo`. |
| `desperdicio`, `paredes` | Material de más y el modelo de volumen efectivo. |
| `caudalCm3PorHora`, `factorCalibracion`, `horasMinimasPorPieza` | Estimación de tiempo. Calíbralo comparando con los tiempos de Bambu Studio. |
| `tarifaMaquinaHora`, `preparacionPorPedido`, `recargoCambioColor` | Costos fijos y variables. |
| `margen`, `pedidoMinimo`, `descuentosCantidad`, `iva`, `redondeo` | Precio final. |
| `entrega` | Horas de máquina por día y días de preparación, para el plazo. |
| `esDemo` | Desmárcalo («Precios de demostración») cuando los precios sean reales. |

Los paquetes de diseño CAD siguen en `src/config/servicios.ts`.

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

Entra a **`/admin`** (desde el celular también funciona). Con Supabase configurado, pide el enlace mágico en `/admin/ingresar`; sin Supabase, el panel abre en modo demo con datos de ejemplo.

| Sección | Para qué |
| --- | --- |
| **Resumen** | Cotizaciones de los últimos 7 días, conversión cotización → pedido (30 días), ingresos y ticket promedio del mes, pedidos en producción, solicitudes por atender, cotizaciones esperando aprobación, origen de los clientes (UTM o sitio de procedencia) y solicitudes por estado. |
| **Solicitudes** | Tablero por estados (nuevo → cotizado → aprobado → en producción → listo → entregado → pagado, y cancelado), con búsqueda y vista de lista. |
| **Ficha de una solicitud** | Datos, opciones del cotizador, archivos para descargar, desglose de costos, historial y acciones. |
| **Clientes** | Personas, empresas y colegios con su historial, total pagado, origen y notas. |
| **Precios** | Todo el cotizador: materiales, colores, calidades, rellenos, acabados, urgencias, descuentos, margen, mínimo, IVA y calibración. |
| **Exportar** | CSV de solicitudes y de clientes para Excel. |

### El recorrido de una cotización

1. Llega una solicitud. Te avisa un correo con un botón **Abrir en el panel**, y la solicitud aparece en **Por atender**.
2. Revisa el archivo, la orientación y los soportes. En **Cotización final** escribe el precio, el plazo, el enlace de pago (opcional) y un mensaje, deja marcado «Pasar a Cotizado» y «Avisar al cliente», y guarda.
3. El cliente recibe un correo y, en su página `/pedido/[codigo]`, ve el precio y el botón **Aprobar la cotización**. Cuando aprueba, te llega un correo y el pedido pasa a **Aprobado**.
4. Avanza el pedido con **Cambiar estado**: En producción → Listo → Entregado → Pagado. Si quieres, agrega un mensaje y avísale por correo en cada paso.
5. Usa **Nota** para apuntes internos (el cliente no los ve) o, marcando la casilla, para dejarle un mensaje en su página de seguimiento.

Si el pedido no tiene enlace de pago, la página del cliente muestra las instrucciones de transferencia de `marca.pagos.instruccionesTransferencia`.

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
- [ ] `pagos.instruccionesTransferencia`: banco, cuenta, titular y a dónde enviar el comprobante (se muestra en `/pedido/[codigo]`).

### Precios y operación

- [ ] Todos los precios de demostración, desde `/admin/precios`: precio por kg, tarifa de máquina, preparación, recargo de color AMS, margen, pedido mínimo, descuentos, urgencias, posprocesados, IVA, calibración y entregas. Luego desmarca «Precios de demostración».
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
- [ ] Supabase: proyecto, migración, semilla, URLs de redirección, plantilla del enlace mágico, SMTP con Resend y las variables `SUPABASE_*` y `ADMIN_EMAILS`.
- [ ] Analítica (opcional).

---

## Decisiones tomadas

- **Astro 7 + Cloudflare**, como pedía el documento. Salida *estática con rutas de servidor* (lo que antes se llamaba «híbrida»): todo se prerenderiza salvo `/api/*`.
- **Una cotización y su pedido son la misma fila** (`solicitudes`), que avanza por los estados; el historial vive en `eventos`, con marca de visible para el cliente o interno.
- **Seguridad**: RLS en todas las tablas. El público no tiene permisos sobre los datos: las solicitudes entran por `/api/*`, que usa la clave de servicio solo en el servidor. El panel usa la sesión del administrador, así que RLS también protege lo que el panel puede leer. `ADMIN_EMAILS` es la única lista de administradores; se copia a la tabla `administradores` en cada inicio de sesión.
- **Si Supabase falla**, la solicitud no se pierde: el correo al dueño la registra con una advertencia. El cotizador usa los precios de respaldo si la base de datos tarda más de 4 s.
- **Los precios se guardan como un JSON validado** en `configuracion`, con la misma forma que `src/config/precios.ts`. Su lectura es pública porque el cotizador los necesita en el navegador para calcular en vivo; eso implica que el margen se puede deducir viendo el código de la página.
- **El cliente aprueba su cotización** desde `/pedido/[codigo]` (el código no adivinable es la llave, ≈ 8 × 10¹⁴ combinaciones). Esa página no muestra datos de contacto y no se indexa.
- **Pagos**: por ahora, un enlace de pago por pedido o instrucciones de transferencia. La pasarela (Wompi o Mercado Pago) sigue detrás de la bandera `pagosEnLinea`, apagada.
- **Catálogo, proyectos y talleres** se editarán en el panel cuando existan sus páginas públicas (fase 3).
- **Probado sin una cuenta real de Supabase**: este entorno no puede conectarse a supabase.co. La migración y sus políticas se prueban en un Postgres local (PGlite), y el panel y el flujo completo, con el almacén de demostración. La primera conexión real debe verificarse al configurar la cuenta.
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
- **Fase 2 — Gestión** ✔︎ Supabase (migración, RLS, semilla), enlace mágico para `ADMIN_EMAILS`, panel `/admin` (resumen, tablero, ficha, clientes, precios, CSV), seguimiento `/pedido/[codigo]` con aprobación del cliente y correos de avance.
- **Fase 3 — Escala**: tienda con variantes y enlace a MercadoLibre, educación (talleres y kits, formulario para colegios), proyectos, guías en MDX (3 borradores), suscripción, pagos detrás de bandera y panel de métricas.
