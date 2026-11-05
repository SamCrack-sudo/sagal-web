/**
 * Campos de formulario en React con las clases del sistema de diseño.
 * Accesibles: etiqueta asociada, aria-invalid y aria-describedby para errores.
 */
import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { TIPOS_CLIENTE, type TipoCliente } from '@/lib/solicitudes/tipos';
import type { Errores } from '@/lib/solicitudes/validacion';

interface BaseCampo {
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
  opcional?: boolean;
}

function Envoltura({
  id,
  etiqueta,
  error,
  ayuda,
  opcional,
  children,
}: BaseCampo & { id: string; children: ReactNode }) {
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta} {opcional && <span className="campo__opcional">(opcional)</span>}
      </label>
      {children}
      {ayuda && (
        <span className="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </span>
      )}
      {error && (
        <span className="campo__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function describir(id: string, error?: string, ayuda?: ReactNode) {
  return [ayuda ? `${id}-ayuda` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
}

export function CampoTexto({ etiqueta, error, ayuda, opcional, ...resto }: BaseCampo & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} opcional={opcional}>
      <input
        id={id}
        className="control"
        required={!opcional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describir(id, error, ayuda)}
        {...resto}
      />
    </Envoltura>
  );
}

export function CampoArea({ etiqueta, error, ayuda, opcional, ...resto }: BaseCampo & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} opcional={opcional}>
      <textarea
        id={id}
        className="control"
        required={!opcional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describir(id, error, ayuda)}
        {...resto}
      />
    </Envoltura>
  );
}

export function CampoSeleccion({
  etiqueta,
  error,
  ayuda,
  opcional,
  opciones,
  ...resto
}: BaseCampo & SelectHTMLAttributes<HTMLSelectElement> & { opciones: [string, string][] }) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} opcional={opcional}>
      <select
        id={id}
        className="control"
        required={!opcional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describir(id, error, ayuda)}
        {...resto}
      >
        {opciones.map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>
    </Envoltura>
  );
}

export function CampoArchivos({
  etiqueta,
  error,
  ayuda,
  ...resto
}: BaseCampo & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} opcional>
      <input
        id={id}
        type="file"
        className="control control--archivo"
        aria-invalid={error ? true : undefined}
        aria-describedby={describir(id, error, ayuda)}
        {...resto}
      />
    </Envoltura>
  );
}

function CampoCiudad() {
  return <CampoTexto etiqueta="Ciudad o municipio" name="ciudad" autoComplete="address-level2" opcional maxLength={160} placeholder="Cajicá, Chía, Bogotá…" />;
}

/** Datos de contacto comunes a todos los formularios. */
export function CamposContacto({
  errores,
  tipoFijo,
  mostrarCiudad = true,
}: {
  errores: Errores;
  /** Si se fija el tipo de cliente, se envía oculto. */
  tipoFijo?: TipoCliente;
  mostrarCiudad?: boolean;
}) {
  return (
    <>
      <div className="fila-campos fila-campos--2">
        <CampoTexto etiqueta="Nombre" name="nombre" autoComplete="name" maxLength={120} error={errores.nombre} placeholder="Tu nombre" />
        <CampoTexto
          etiqueta="Correo"
          name="correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={160}
          error={errores.correo}
          placeholder="tucorreo@ejemplo.com"
        />
      </div>
      <div className="fila-campos fila-campos--2">
        <CampoTexto
          etiqueta="WhatsApp o teléfono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={30}
          opcional
          error={errores.telefono}
          placeholder="300 123 4567"
          ayuda="Te escribimos por aquí si es más rápido."
        />
        {tipoFijo ? (
          mostrarCiudad && <CampoCiudad />
        ) : (
          <CampoSeleccion
            etiqueta="Eres"
            name="tipoCliente"
            defaultValue="persona"
            error={errores.tipoCliente}
            opciones={Object.entries(TIPOS_CLIENTE) as [string, string][]}
          />
        )}
      </div>
      {tipoFijo && <input type="hidden" name="tipoCliente" value={tipoFijo} />}
      {!tipoFijo && mostrarCiudad && <CampoCiudad />}
    </>
  );
}

/** Autorización de tratamiento de datos (Ley 1581 de 2012): obligatoria. */
export function Consentimiento({ error }: { error?: string }) {
  const id = useId();
  return (
    <div className="campo">
      <label className="casilla" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          name="consentimiento"
          value="true"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span>
          Autorizo el tratamiento de mis datos personales según la{' '}
          <a href="/politica-de-datos" target="_blank" rel="noopener" className="enlace">
            política de tratamiento de datos
          </a>{' '}
          para responder esta solicitud.
        </span>
      </label>
      {error && (
        <span className="campo__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** Campo trampa para bots: invisible para personas y lectores de pantalla. */
export function Trampa() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
      <label>
        No llenes este campo
        <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
