/**
 * Arranque del héroe 3D sin React (la portada no necesita el runtime de React).
 * Por defecto el héroe muestra el plano SVG estático; el modelo 3D lo reemplaza
 * solo si:
 *  - el usuario no pidió reducir el movimiento,
 *  - el equipo no es débil (núcleos, memoria, ahorro de datos, red 2G),
 *  - hay WebGL.
 * three.js se descarga en diferido: cuando el héroe es visible y el navegador
 * queda libre.
 */
import type { Mecanismo } from './escenaMecanismo';

export function equipoCapaz(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) return false;
  if ((nav.hardwareConcurrency ?? 4) < 4) return false;
  if ((nav.deviceMemory ?? 4) < 4) return false;
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function enReposo(fn: () => void) {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 2500 });
  else setTimeout(fn, 600);
}

function cuandoSeaVisible(el: Element, fn: () => void) {
  const io = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) {
      io.disconnect();
      fn();
    }
  });
  io.observe(el);
}

export function iniciarMecanismo(marco: HTMLElement): void {
  const lienzo = marco.querySelector<HTMLElement>('.mecanismo__lienzo');
  const portada = marco.closest<HTMLElement>('.portada') ?? marco;
  if (!lienzo || !equipoCapaz()) return;

  cuandoSeaVisible(marco, () =>
    enReposo(() => {
      import('./escenaMecanismo')
        .then(({ crearMecanismo }) => {
          let mecanismo: Mecanismo;
          try {
            mecanismo = crearMecanismo(lienzo);
          } catch {
            return; // Sin WebGL utilizable: queda el SVG.
          }
          marco.dataset.estado = 'listo';

          // Entrada: de plano técnico despiezado a pieza armada y sólida.
          mecanismo.objetivo({ explosion: 0, solidez: 1 });

          const alScroll = () => {
            const r = portada.getBoundingClientRect();
            mecanismo.objetivo({ explosion: Math.min(1, Math.max(0, -r.top / (r.height * 0.7))) });
          };
          window.addEventListener('scroll', alScroll, { passive: true });
          alScroll();

          portada.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'mouse') return;
            const r = portada.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            mecanismo.objetivo({ giroY: x * 0.6, giroX: y * 0.12 });
          });

          // No animar si el héroe no está en pantalla.
          new IntersectionObserver(([e]) => mecanismo.pausar(!e?.isIntersecting)).observe(marco);
        })
        .catch(() => undefined);
    }),
  );
}
