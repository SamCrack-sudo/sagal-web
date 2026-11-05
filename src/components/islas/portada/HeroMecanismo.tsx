/**
 * Isla de la portada. Por defecto el héroe muestra el plano SVG estático; esta
 * isla lo reemplaza por el modelo 3D solo si:
 *  - el usuario no pidió reducir el movimiento,
 *  - el equipo no es débil (núcleos, memoria, ahorro de datos),
 *  - hay WebGL.
 * three.js se descarga en diferido, cuando el navegador queda libre.
 */
import { useEffect, useRef } from 'react';
import type { Mecanismo } from './escenaMecanismo';

function equipoCapaz(): boolean {
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

const enReposo = (fn: () => void) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 2500 }) : window.setTimeout(fn, 600);

export default function HeroMecanismo() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    const marco = lienzo?.closest<HTMLElement>('[data-mecanismo]');
    const portada = lienzo?.closest<HTMLElement>('.portada') ?? marco;
    if (!lienzo || !marco || !portada || !equipoCapaz()) return;

    let mecanismo: Mecanismo | null = null;
    let cancelado = false;
    const limpiar: (() => void)[] = [];

    enReposo(() => {
      import('./escenaMecanismo')
        .then(({ crearMecanismo }) => {
          if (cancelado) return;
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
            const progreso = Math.min(1, Math.max(0, -r.top / (r.height * 0.7)));
            mecanismo?.objetivo({ explosion: progreso });
          };
          window.addEventListener('scroll', alScroll, { passive: true });
          limpiar.push(() => window.removeEventListener('scroll', alScroll));

          const alMover = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return;
            const r = portada.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            mecanismo?.objetivo({ giroY: x * 0.6, giroX: y * 0.12 });
          };
          portada.addEventListener('pointermove', alMover);
          limpiar.push(() => portada.removeEventListener('pointermove', alMover));

          // No animar si el héroe no está en pantalla o la pestaña está oculta.
          const io = new IntersectionObserver(([e]) => mecanismo?.pausar(!e?.isIntersecting));
          io.observe(marco);
          limpiar.push(() => io.disconnect());
        })
        .catch(() => undefined);
    });

    return () => {
      cancelado = true;
      limpiar.forEach((f) => f());
      mecanismo?.destruir();
      delete marco.dataset.estado;
    };
  }, []);

  return <div ref={ref} className="mecanismo__lienzo" aria-hidden="true" />;
}
