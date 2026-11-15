import { useEffect, useRef, type ReactNode } from 'react';
import { enlaceWhatsApp, marca } from '@/config/marca';
import type { RespuestaSolicitud } from '@/lib/solicitudes/tipos';

/** Mensaje de éxito tras enviar un formulario. Recibe el foco al aparecer. */
export function Confirmacion({
  respuesta,
  titulo,
  children,
  onOtra,
  textoOtra = 'Enviar otra solicitud',
}: {
  respuesta: RespuestaSolicitud;
  titulo: string;
  children?: ReactNode;
  onOtra?: () => void;
  textoOtra?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const whatsapp = respuesta.codigo
    ? enlaceWhatsApp(`Hola ${marca.nombre}, acabo de enviar la solicitud ${respuesta.codigo}.`)
    : null;

  return (
    <div className="confirmacion" ref={ref} tabIndex={-1} role="status" aria-live="polite">
      {respuesta.demo && (
        <p className="aviso aviso--alerta">
          <strong>Modo demostración.</strong> {respuesta.mensaje} Configura Resend para recibir las solicitudes (ver README).
        </p>
      )}
      <h3 className="titulo-3">{titulo}</h3>
      {respuesta.codigo && (
        <p>
          Tu número de referencia es <strong className="confirmacion__codigo">{respuesta.codigo}</strong>.
          {respuesta.demo ? ' (Código de ejemplo: en modo demo no se envía ningún correo.)' : ' Te enviamos una copia a tu correo.'}
        </p>
      )}
      {children}
      <div className="grupo-botones">
        {whatsapp && (
          <a className="boton boton--azul" href={whatsapp} target="_blank" rel="noopener" data-evento="clic_whatsapp" data-origen="confirmacion">
            Escribirnos por WhatsApp
          </a>
        )}
        {onOtra && (
          <button type="button" className="boton boton--contorno" onClick={onOtra}>
            {textoOtra}
          </button>
        )}
      </div>
    </div>
  );
}
