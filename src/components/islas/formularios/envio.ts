/**
 * Lógica de envío compartida por los formularios React.
 */
import { useCallback, useState } from 'react';
import type { RespuestaSolicitud } from '@/lib/solicitudes/tipos';
import { obtenerOrigen } from '@/lib/cliente/origen';

export type EstadoEnvio = 'inactivo' | 'enviando' | 'ok' | 'error';

export function useEnvio(url: string) {
  const [estado, setEstado] = useState<EstadoEnvio>('inactivo');
  const [respuesta, setRespuesta] = useState<RespuestaSolicitud | null>(null);

  const enviar = useCallback(
    async (datos: FormData): Promise<RespuestaSolicitud> => {
      setEstado('enviando');
      datos.set('origen', JSON.stringify(obtenerOrigen()));
      let r: RespuestaSolicitud;
      try {
        const res = await fetch(url, { method: 'POST', body: datos, headers: { Accept: 'application/json' } });
        r = (await res.json().catch(() => ({ ok: false }))) as RespuestaSolicitud;
        if (!res.ok && r.ok !== false) r = { ok: false };
      } catch {
        r = { ok: false, mensaje: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.' };
      }
      if (!r.ok && !r.mensaje) r.mensaje = 'No pudimos enviar tu solicitud. Inténtalo de nuevo en un momento.';
      setRespuesta(r);
      setEstado(r.ok ? 'ok' : 'error');
      return r;
    },
    [url],
  );

  const reiniciar = useCallback(() => {
    setEstado('inactivo');
    setRespuesta(null);
  }, []);

  return { estado, respuesta, enviar, reiniciar };
}

/** Lleva el foco al primer campo con error (accesibilidad). */
export function enfocarPrimerError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}

/** Convierte FormData en un objeto plano de textos, para validar en el cliente. */
export function camposDe(datos: FormData): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const [k, v] of datos.entries()) if (typeof v === 'string') campos[k] = v;
  return campos;
}
