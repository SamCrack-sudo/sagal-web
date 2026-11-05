/**
 * Visor 3D de la pieza del cliente. Carga three.js bajo demanda y, si el equipo
 * no tiene WebGL, muestra solo la ficha de medidas.
 */
import { useEffect, useRef, useState } from 'react';
import type { Malla } from '@/lib/malla/tipos';
import type { Visor, Volumen } from './escenaVisor';

interface Props {
  malla: Malla;
  factor: number;
  color: string;
  volumen: Volumen;
  cabe: boolean;
  medidas: [string, string, string];
}

export default function Visor3D({ malla, factor, color, volumen, cabe, medidas }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const visor = useRef<Visor | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-webgl'>('cargando');

  // Crear la escena una sola vez.
  useEffect(() => {
    let cancelado = false;
    import('./escenaVisor')
      .then(({ crearVisor }) => {
        if (cancelado || !contenedor.current) return;
        try {
          visor.current = crearVisor(contenedor.current, volumen);
          setEstado('listo');
        } catch {
          setEstado('sin-webgl');
        }
      })
      .catch(() => setEstado('sin-webgl'));
    return () => {
      cancelado = true;
      visor.current?.destruir();
      visor.current = null;
    };
  }, [volumen]);

  useEffect(() => {
    if (estado === 'listo') visor.current?.ponerModelo(malla, factor);
  }, [estado, malla, factor]);

  useEffect(() => {
    if (estado === 'listo') visor.current?.ponerColor(color);
  }, [estado, color]);

  useEffect(() => {
    if (estado === 'listo') visor.current?.ponerEncaje(cabe);
  }, [estado, cabe]);

  return (
    <figure className="visor">
      <div className="visor__lienzo" ref={contenedor} role="img" aria-label={`Vista 3D de la pieza: ${medidas.join(' por ')} milímetros`}>
        {estado === 'cargando' && <p className="visor__estado">Preparando la vista 3D…</p>}
        {estado === 'sin-webgl' && (
          <p className="visor__estado">Tu navegador no puede mostrar la vista 3D, pero calculamos las medidas igual.</p>
        )}
      </div>
      <div className="visor__cotas" aria-hidden="true">
        <span>
          X <strong>{medidas[0]}</strong>
        </span>
        <span>
          Y <strong>{medidas[1]}</strong>
        </span>
        <span>
          Z <strong>{medidas[2]}</strong>
        </span>
        <span>mm</span>
      </div>
      {estado === 'listo' && (
        <div className="visor__vistas" role="group" aria-label="Cambiar vista">
          <button type="button" onClick={() => visor.current?.vista('iso')}>
            Isométrica
          </button>
          <button type="button" onClick={() => visor.current?.vista('frente')}>
            Frente
          </button>
          <button type="button" onClick={() => visor.current?.vista('arriba')}>
            Planta
          </button>
        </div>
      )}
      <figcaption className="visor__leyenda">
        Arrastra para girar, rueda o pellizco para acercar. La caja punteada es el volumen de impresión ({volumen.x} × {volumen.y} ×{' '}
        {volumen.z} mm).
      </figcaption>
    </figure>
  );
}
