# Guía del sitio web para no programadores

Esta guía explica, sin tecnicismos, cómo funciona el sitio de SAGAL Robotics, qué hace cada archivo y cómo pedir o hacer cambios. Para la configuración técnica paso a paso (cuentas, claves, despliegue), usa el [README](README.md).

## Índice

1. [La idea general](#1-la-idea-general)
2. [Qué pasa cuando alguien visita el sitio](#2-qué-pasa-cuando-alguien-visita-el-sitio)
3. [Qué pasa cuando alguien pide una cotización](#3-qué-pasa-cuando-alguien-pide-una-cotización)
4. [El mapa de archivos](#4-el-mapa-de-archivos)
5. [Los archivos que sí puedes tocar](#5-los-archivos-que-sí-puedes-tocar)
6. [Recetas: cambios comunes paso a paso](#6-recetas-cambios-comunes-paso-a-paso)
7. [Cómo sugerir cambios](#7-cómo-sugerir-cambios)
8. [Cómo se publica un cambio](#8-cómo-se-publica-un-cambio)
9. [Si algo se rompe](#9-si-algo-se-rompe)
10. [Glosario](#10-glosario)

---

## 1. La idea general

Piensa en el sitio como un taller con tres zonas:

| Zona | Qué es | Dónde vive |
| --- | --- | --- |
| **La vitrina** | Las páginas que ve el visitante: inicio, servicios, empresas, contacto… | `src/pages/` |
| **El mostrador** | Lo que recibe las solicitudes y cotizaciones, revisa que estén bien y te avisa por correo. | `src/pages/api/` y `src/lib/servidor/` |
| **El cuaderno de configuración** | Los datos del negocio que cambias sin programar: nombre, teléfono, precios, materiales. | `src/config/` |

La mayoría de los cambios que vas a querer hacer están en el **cuaderno de configuración** (`src/config/`) o en el **texto de las páginas** (`src/pages/`). El resto es maquinaria que normalmente no necesitas tocar.

Las herramientas principales:

- **Astro** arma las páginas. Toma los archivos de `src/pages/` y produce páginas web listas.
- **React** se usa solo en las partes interactivas: el cotizador y los formularios.
- **three.js** dibuja el 3D: el mecanismo de la portada y el visor de piezas del cotizador.
- **Cloudflare** es donde se publicará el sitio, el "local" donde atiende la vitrina.
- **Resend** envía los correos.

---

## 2. Qué pasa cuando alguien visita el sitio

1. La persona escribe tu dirección o hace clic en Google.
2. Cloudflare le entrega la página. Las páginas ya están "preimpresas" (se arman una vez al publicar), por eso cargan rápido.
3. Si la página tiene algo interactivo (el cotizador, un formulario, el 3D de la portada), el navegador descarga ese pedacito extra. El resto de la página no necesita programación.
4. Sin que la persona lo note, el sitio anota de dónde llegó (Google, Instagram, una campaña) para contártelo cuando te escriba.

---

## 3. Qué pasa cuando alguien pide una cotización

1. El cliente entra a `/cotizar` y sube su archivo 3D (STL o 3MF).
2. **Su propio navegador** lee el archivo: calcula medidas y volumen, lo muestra en 3D y revisa si cabe en la impresora. El archivo todavía no se ha enviado a ningún lado.
3. El cliente elige material, color, calidad, relleno, cantidad, acabado y urgencia. El precio cambia en vivo según las reglas de `src/config/precios.ts`.
4. Escribe su nombre y correo, marca la casilla de autorización de datos y envía.
5. El **servidor** (el mostrador) recibe el archivo, **lo vuelve a leer y recalcula el precio**. Así nadie puede engañar al cotizador cambiando el precio en su navegador.
6. Se envían dos correos:
   - **Al cliente:** "Recibimos tu cotización" con su número de referencia (por ejemplo `SR-7KQ4M-9XDTA`).
   - **A ti:** todos los datos, el desglose de costos, de dónde llegó el cliente, el archivo adjunto y un botón para escribirle por WhatsApp.

Mientras no configures Resend, el sitio está en **modo demo**: todo funciona y se valida, pero no se envían correos y aparece un aviso de "Modo demostración".

---

## 4. El mapa de archivos

No necesitas memorizar esto. Úsalo como plano cuando quieras ubicar algo. Las marcas indican qué tan seguro es editar cada cosa:

- ✅ **Seguro**: datos y textos. Puedes editarlo tú.
- ⚠️ **Con cuidado**: textos mezclados con código. Cambia solo lo que está entre comillas o entre etiquetas.
- ⛔ **Técnico**: pídele el cambio a Claude.

### Raíz del proyecto

| Archivo | Para qué sirve | |
| --- | --- | --- |
| `README.md` | Manual técnico: instalación, cuentas, despliegue, lista de pendientes. | ✅ |
| `GUIA.md` | Esta guía. | ✅ |
| `.env.example` | Lista comentada de las claves de servicios externos. No lleva claves reales. | ⚠️ |
| `package.json` | Lista de herramientas que usa el proyecto y comandos (`npm run dev`, etc.). | ⛔ |
| `package-lock.json` | Versiones exactas de cada herramienta. Se actualiza solo. **No lo edites.** | ⛔ |
| `astro.config.mjs` | Configuración general de Astro y de Cloudflare. | ⛔ |
| `wrangler.jsonc` | Configuración de publicación en Cloudflare. | ⛔ |
| `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts` | Configuración de revisiones automáticas de código. | ⛔ |
| `.gitignore` | Lista de archivos que **nunca** se suben a GitHub (por ejemplo, claves). | ⛔ |
| `.nvmrc` | Versión de Node recomendada. | ⛔ |

### Carpetas

| Carpeta | Qué hay | |
| --- | --- | --- |
| `referencia/` | `diseno.html`: el diseño original del que salió el estilo del sitio. Es de consulta. | ✅ |
| `public/` | Archivos que se publican tal cual: el ícono de la pestaña (`favicon.svg`) y la imagen para redes sociales (`og/sagal-og.png`). | ✅ |
| `scripts/` | `generar-og.mjs`: crea la imagen para redes a partir de la marca (`npm run og`). | ⛔ |
| `src/` | Todo el sitio. Se explica abajo. | — |

### `src/config/`: el cuaderno de configuración ✅

| Archivo | Qué controla |
| --- | --- |
| `marca.ts` | **El más importante.** Nombre de la marca, eslogan, descripción, correo, WhatsApp, Instagram, ubicación, horario, datos legales (responsable, NIT) y volumen de la impresora. Cambias aquí y cambia en todo el sitio. |
| `precios.ts` | Todo el cotizador: materiales (precio por kilo, densidad, colores), calidades, rellenos, acabados, urgencias, tarifa de máquina, margen, pedido mínimo, descuentos por cantidad, IVA y plazos. **Hoy tiene valores de demostración.** |
| `servicios.ts` | Los tres paquetes de diseño CAD (simple, medio, complejo): para qué son, qué incluyen, revisiones, plazo y precio. |
| `navegacion.ts` | Los enlaces del menú superior y de los textos legales del pie de página. |
| `funciones.ts` | Interruptores de funciones futuras (seguimiento de pedidos, pagos en línea, tienda). Están apagados hasta su fase. |

### `src/pages/`: las páginas (la vitrina) ⚠️

Cada archivo es una página. El nombre del archivo es la dirección:

| Archivo | Dirección | Qué es |
| --- | --- | --- |
| `index.astro` | `/` | Portada: el mecanismo 3D, servicios, cotizador, proceso, proyectos, confianza, preguntas frecuentes. |
| `cotizar.astro` | `/cotizar` | La página del cotizador y sus preguntas frecuentes. |
| `servicios/impresion-3d.astro` | `/servicios/impresion-3d` | Servicio de impresión 3D. |
| `servicios/diseno-cad.astro` | `/servicios/diseno-cad` | Servicio de diseño CAD y sus paquetes. |
| `servicios/robotica-y-electronica.astro` | `/servicios/robotica-y-electronica` | Servicio de robótica y electrónica. |
| `empresas.astro` | `/empresas` | Página para empresas, con su formulario. |
| `contacto.astro` | `/contacto` | Datos de contacto y formulario general. |
| `nosotros.astro` | `/nosotros` | Quiénes somos. |
| `politica-de-datos.astro` | `/politica-de-datos` | Política de datos (borrador legal). |
| `terminos.astro` | `/terminos` | Términos y condiciones (borrador legal). |
| `404.astro` | Cualquier dirección que no existe | Página de "no encontrado". |
| `robots.txt.ts` | `/robots.txt` | Instrucciones para Google sobre qué indexar. ⛔ |
| `api/cotizacion.ts` | `/api/cotizacion` | **El mostrador de cotizaciones**: recibe, revisa, recalcula y envía los correos. ⛔ |
| `api/contacto.ts` | `/api/contacto` | **El mostrador de contacto y empresas.** ⛔ |

Dentro de un archivo `.astro`, la parte de arriba entre dos líneas `---` es código (por ejemplo, las listas de preguntas frecuentes). La parte de abajo es la página: textos entre etiquetas como `<h2>Título</h2>` o `<p>Párrafo</p>`. Puedes cambiar el texto, pero no las etiquetas.

### `src/components/`: piezas reutilizables ⚠️/⛔

Son "bloques" que se usan en varias páginas.

| Archivo | Qué es |
| --- | --- |
| `Encabezado.astro` | La barra azul de arriba con el logo y el menú. |
| `PiePagina.astro` | El pie de página. |
| `Logo.astro` | El símbolo del logo (la mira naranja). El texto sale de `marca.ts`. |
| `BotonWhatsApp.astro` | El botón flotante de WhatsApp. Aparece solo cuando pongas tu número en `marca.ts`. |
| `CabeceraPagina.astro` | El título grande de las páginas interiores, con las migas de pan ("Inicio / Empresas"). |
| `BandaCta.astro` | La franja azul final con botones ("¿Trabajamos juntos?"). |
| `Faq.astro` | El bloque de preguntas frecuentes que se abre y se cierra. |
| `Icono.astro` | Los íconos de línea (impresora, engranaje, empresa…). |
| `portada/Mecanismo.astro` | El dibujo técnico de la portada y su versión 3D. |
| `islas/` | Las partes interactivas (⛔). Ver abajo. |

Las **islas** (`src/components/islas/`) son las partes que "se mueven". Son técnicas:

| Carpeta | Qué hace |
| --- | --- |
| `islas/cotizador/` | El cotizador completo: `Cotizador.tsx` (el flujo), `Visor3D.tsx` y `escenaVisor.ts` (el visor 3D), `Parametros.tsx` (las opciones), `PanelPrecio.tsx` (el precio), `cotizador.css` (su estilo). |
| `islas/formularios/` | Piezas comunes de los formularios: campos, casilla de autorización de datos, antispam, envío y mensaje de confirmación. |
| `islas/FormularioSolicitud.tsx` | Los formularios de contacto y de empresas. |
| `islas/portada/` | El mecanismo 3D de la portada: cómo se dibuja (`escenaMecanismo.ts`) y cuándo se activa (`iniciarMecanismo.ts`). |

### `src/layouts/` ⛔

`Base.astro` es el "molde" que envuelve todas las páginas: pone el encabezado, el pie, el botón de WhatsApp, los datos para Google y redes sociales, y la analítica.

### `src/styles/`: la apariencia ⚠️

| Archivo | Qué controla |
| --- | --- |
| `tokens.css` | **La paleta y las medidas**: colores (azul `#16325C`, naranja `#FF6A13`…), tamaños de letra, espacios. Cambiar un color aquí lo cambia en todo el sitio. |
| `componentes.css` | El aspecto de botones, campos, tablas, avisos, etiquetas, preguntas frecuentes. |
| `global.css` | Reglas base de todo el sitio. ⛔ |

### `src/lib/`: la maquinaria ⛔

| Carpeta | Qué hace |
| --- | --- |
| `malla/` | Lee los archivos STL y 3MF y calcula volumen, área y medidas, y si la pieza cabe en la impresora. |
| `precios/` | **El motor de precios**: aplica la fórmula con los valores de `config/precios.ts`. |
| `solicitudes/` | Revisa que los formularios estén bien llenos y crea los números de referencia. |
| `servidor/` | Envía correos (Resend), verifica el antispam (Turnstile) y arma el contenido de los correos. |
| `cliente/` | Anota de dónde llegan las visitas (UTM) y la analítica (apagada por ahora). |
| `seo.ts` | Los datos que lee Google para mostrar tu negocio (ubicación, servicios, preguntas). |

Los archivos que terminan en `.test.ts` son **pruebas automáticas**: comprueban que el motor de precios y el lector de archivos hagan bien las cuentas. Corren con `npm test`.

---

## 5. Los archivos que sí puedes tocar

Para empezar, concéntrate en estos cuatro:

1. **`src/config/marca.ts`**: tus datos.
2. **`src/config/precios.ts`**: tus precios y materiales.
3. **`src/config/servicios.ts`**: los paquetes de diseño.
4. **Los textos de `src/pages/`**: lo que dice cada página.

### Reglas de oro al editar

- **Respeta las comillas y las comas.** Un texto va así: `'Mi texto',`. Si borras una comilla o una coma, el sitio deja de funcionar (el error se ve en la terminal y se arregla devolviendo el carácter).
- **Si tu texto lleva un apóstrofo** (`'`), escríbelo con el carácter tipográfico `’`.
- **Los números van sin puntos de miles:** `100000`, no `100.000`. Los decimales llevan punto: `1.24`.
- **Los textos entre corchetes** como `[MI NÚMERO CON +57]` son **marcadores pendientes**. Reemplázalos por el dato real, sin los corchetes.
- **Nunca escribas claves o contraseñas** en ningún archivo. Van en Cloudflare, como explica el README.
- **Haz un cambio a la vez** y revísalo en el navegador antes del siguiente.

### Truco para encontrar dónde está un texto

En VS Code, pulsa **`Ctrl + Shift + F`** (buscar en todos los archivos) y escribe una frase que veas en la página, por ejemplo `Competimos por calidad`. VS Code te muestra el archivo y la línea exactos.

---

## 6. Recetas: cambios comunes paso a paso

Antes de cualquier receta, ten el sitio corriendo en tu computador (`npm run dev` en la terminal de VS Code, y el navegador en `http://localhost:4321`). Al guardar un archivo (`Ctrl + S`), el navegador se actualiza solo.

### Poner tu número de WhatsApp

Archivo: `src/config/marca.ts`. Busca:

```ts
whatsapp: '[MI NÚMERO CON +57]',
```

Cámbialo por tu número **solo con dígitos**, empezando por 57:

```ts
whatsapp: '573001234567',
```

Al guardar, aparece el botón flotante de WhatsApp en todas las páginas.

### Poner tu Instagram

Mismo archivo, `instagram: '[MI_USUARIO]',` cámbialo por tu usuario **sin la arroba**: `instagram: 'sagalrobotics',`.

### Cambiar el precio de un material

Archivo: `src/config/precios.ts`. Busca el material, por ejemplo `nombre: 'PLA'`, y unas líneas abajo:

```ts
precioKg: 100000, // [CONFIGURAR] DEMO
```

Cambia el número por tu precio real del kilo de filamento en pesos. Abre `/cotizar`, sube un archivo y verás el nuevo precio.

Cuando todos los precios sean reales, cambia al principio del archivo `esDemo: true,` por `esDemo: false,` para quitar el aviso de "precios de demostración".

### Desactivar un material o un color

En `src/config/precios.ts`, cambia su `activo: true,` por `activo: false,`. Deja de aparecer en el cotizador sin borrarlo.

### Cambiar el texto de una página

1. Busca la frase con `Ctrl + Shift + F`.
2. Cambia solo el texto, sin tocar lo que está entre `<` y `>`.
3. Guarda y mira el navegador.

### Agregar una pregunta frecuente

En la página correspondiente (por ejemplo `src/pages/index.astro`), arriba, hay una lista `preguntas`. Cada pregunta tiene esta forma:

```ts
{
  pregunta: '¿Atienden los sábados?',
  respuesta: 'Escribe aquí tu respuesta.',
},
```

Copia un bloque completo (de `{` a `},`), pégalo debajo del último y cambia los textos. Además de aparecer en la página, Google la puede mostrar en los resultados de búsqueda.

### Cambiar un color

Archivo: `src/styles/tokens.css`. Por ejemplo, `--c-azul: #16325c;` es el azul de la marca. Cambia el código del color (puedes elegirlo en cualquier selector de colores en línea). **Ojo:** el naranja nunca debe usarse como color de texto sobre fondo claro, porque no se lee bien.

### Cambiar el nombre de la marca

Archivo: `src/config/marca.ts`: `nombre`, `nombreFuerte` y `nombreSuave`. Después, en la terminal, corre `npm run og` para regenerar la imagen que aparece al compartir el sitio en redes.

---

## 7. Cómo sugerir cambios

Tienes cuatro caminos, de más fácil a más directo.

### Camino A: pedírselo a Claude (recomendado)

Abre una sesión de Claude Code con este repositorio y escríbele lo que quieres en lenguaje normal. Un buen pedido tiene:

1. **Dónde:** la página o la dirección (`/empresas`, la portada…).
2. **Qué ves hoy:** si puedes, una captura de pantalla.
3. **Qué quieres:** el resultado esperado, no cómo hacerlo.
4. **Por qué** (opcional, pero ayuda a decidir bien).

Ejemplos:

> En la portada, la sección "Trabajos recientes" muestra recuadros con [FOTO DEL PROYECTO]. Te adjunto 3 fotos con sus nombres y descripciones; pon estos proyectos ahí.

> En /cotizar, quiero agregar el material "PETG-CF" a [tu precio] pesos el kilo, solo en color negro, para piezas industriales rígidas.

> En el celular, el botón de WhatsApp tapa el botón de enviar del cotizador. Mira la captura.

Claude hace el cambio en una rama aparte, lo prueba y abre un **pull request** para que lo revises antes de publicarlo. Nada llega al sitio sin que tú lo apruebes.

### Camino B: abrir una "solicitud de cambio" en GitHub

Útil para anotar ideas a medida que las ves, aunque no las resuelvas ese día.

1. Entra a <https://github.com/SamCrack-sudo/sagal-web/issues>.
2. Pulsa **New issue** y elige **Solicitud de cambio**. (Este formulario aparece cuando el pull request #1 esté fusionado en `main`; antes, usa **Blank issue** y escribe lo mismo.)
3. Llena el formulario: tipo de cambio, página, qué ves, qué quieres. Puedes arrastrar capturas.
4. Cuando quieras resolverlo, dile a Claude: *"Resuelve la solicitud número 3 del repositorio"*.

Así tienes una lista ordenada de pendientes y un historial de por qué se hizo cada cambio.

### Camino C: comentar en un pull request

Cuando Claude (o cualquiera) proponga un cambio, aparece en la pestaña **Pull requests** de GitHub. Ahí puedes:

- Dejar un comentario general ("el título quedó muy largo, acórtalo").
- En la pestaña **Files changed**, comentar una línea específica pulsando el **+** azul junto a ella.
- Cuando estés conforme, pulsar **Merge pull request** para aceptarlo.

### Camino D: hacerlo tú mismo

Para cambios de texto o de datos, puedes editar directamente:

**En GitHub, desde el navegador:**

1. Abre el archivo en GitHub y pulsa el **lápiz** (Edit).
2. Haz el cambio.
3. Pulsa **Commit changes…**, escribe en una línea qué cambiaste y elige **Create a new branch… and start a pull request**.
4. Revisa y fusiona el pull request.

**En VS Code, en tu computador:**

1. Haz el cambio y revísalo con `npm run dev`.
2. En la barra izquierda, abre el ícono de **Control de código fuente** (las ramitas).
3. Escribe un mensaje corto ("Cambia el precio del PLA") y pulsa **Commit**.
4. Pulsa **Sync Changes** (o **Publish Branch**) para subirlo a GitHub.

Si no estás seguro de un cambio, usa el camino A o B: es mejor preguntar que romper algo.

---

## 8. Cómo se publica un cambio

El recorrido de cualquier cambio es:

```
Idea  →  rama aparte  →  pull request (revisión)  →  Merge a main  →  Cloudflare publica solo
```

- **`main`** es la versión oficial del sitio.
- Los cambios se preparan en **ramas** aparte, para no tocar `main` mientras se trabajan.
- Un **pull request** es la propuesta de pasar una rama a `main`. Ahí se revisa y se comenta.
- Cuando Cloudflare esté conectado (ver README), **cada vez que fusiones algo en `main`, el sitio se publica solo** en un par de minutos.

Hoy todo el sitio está en el pull request #1, que aún no se ha fusionado. Cuando lo revises y pulses **Merge**, quedará en `main`.

---

## 9. Si algo se rompe

- **En tu computador, el sitio deja de cargar después de editar:** mira la terminal. Casi siempre es una comilla, una coma o una llave borrada, y el error dice el archivo y la línea. Deshaz con `Ctrl + Z` en VS Code.
- **Quieres descartar todos tus cambios locales sin subir:** en VS Code, en Control de código fuente, clic derecho sobre el archivo → **Discard Changes**.
- **Algo malo llegó al sitio publicado:** en GitHub, abre el pull request que lo causó y pulsa **Revert**. Se crea un pull request que deshace el cambio; fusiónalo y el sitio vuelve a como estaba.
- **Nada se pierde:** Git guarda la historia de cada cambio. Cualquier versión anterior se puede recuperar.

---

## 10. Glosario

| Palabra | Qué significa |
| --- | --- |
| **Repositorio** | La carpeta del proyecto con toda su historia, guardada en GitHub. |
| **Commit** | Una "foto" guardada de un cambio, con un mensaje que lo describe. |
| **Rama** (*branch*) | Una copia paralela del proyecto para trabajar un cambio sin afectar la versión oficial. |
| **`main`** | La rama oficial: lo que se publica. |
| **Pull request (PR)** | La propuesta de llevar los cambios de una rama a `main`, con espacio para revisar y comentar. |
| **Merge** (fusionar) | Aceptar un pull request: sus cambios pasan a `main`. |
| **Issue** (solicitud) | Una nota en GitHub para pedir un cambio o reportar un problema. |
| **Build** (compilar) | Convertir el código en el sitio listo para publicar (`npm run build`). |
| **Deploy** (desplegar) | Publicar el sitio en internet (Cloudflare). |
| **Servidor de desarrollo** | El sitio corriendo en tu computador para probar cambios (`npm run dev`, en `localhost:4321`). |
| **Modo demo** | El sitio funciona pero no envía correos, porque faltan las cuentas externas. |
| **Isla** | Una parte interactiva de una página (el cotizador, un formulario). |
| **Variable de entorno / clave** | Datos secretos, como la clave de Resend. Van en Cloudflare, **nunca** en el código. |
| **Marcador** | Un texto entre corchetes, como `[NIT O CÉDULA]`, que indica un dato pendiente. |
| **SEO** | Lo que ayuda a que Google encuentre y muestre tu sitio. |
| **UTM** | Etiquetas en un enlace que dicen de qué campaña vino una visita. |
