/**
 * Formulario de contacto general y formulario empresarial (B2B).
 * Envía a /api/contacto con adjuntos opcionales.
 */
import { useRef, useState, type FormEvent } from 'react';
import { CampoArchivos, CampoArea, CampoSeleccion, CampoTexto, CamposContacto, Consentimiento, Trampa } from './formularios/campos';
import { Turnstile } from './formularios/Turnstile';
import { Confirmacion } from './formularios/Confirmacion';
import { camposDe, enfocarPrimerError, useEnvio } from './formularios/envio';
import { REGLAS_ADJUNTOS, validarArchivos, validarContacto, validarEmpresa, type Errores } from '@/lib/solicitudes/validacion';
import { registrarEvento } from '@/lib/cliente/analitica';

type Variante = 'contacto' | 'empresa';

const SECTORES: [string, string][] = [
  ['', 'Elige un sector'],
  ['alimentos', 'Alimentos y bebidas'],
  ['manufactura', 'Manufactura y metalmecánica'],
  ['plasticos', 'Plásticos y empaques'],
  ['agro', 'Agroindustria y floricultura'],
  ['farma', 'Farmacéutica y cosmética'],
  ['construccion', 'Construcción'],
  ['educacion', 'Educación e investigación'],
  ['otro', 'Otro'],
];

const TIPOS_PIEZA: [string, string][] = [
  ['', 'Elige una opción'],
  ['repuesto', 'Repuesto de mantenimiento'],
  ['ingenieria-inversa', 'Ingeniería inversa de una pieza descontinuada'],
  ['jig-fixture', 'Jig, fixture o herramental'],
  ['guarda', 'Guarda o protección'],
  ['prototipo', 'Prototipo'],
  ['otro', 'Otro'],
];

const URGENCIAS: [string, string][] = [
  ['Sin urgencia', 'Sin urgencia'],
  ['Esta semana', 'La necesito esta semana'],
  ['Línea detenida', 'Urgente: equipo o línea detenida'],
];

const SERVICIOS: [string, string][] = [
  ['impresion', 'Impresión 3D'],
  ['diseno', 'Diseño CAD'],
  ['robotica', 'Robótica'],
  ['electronica', 'Electrónica'],
  ['empresa', 'Repuestos o piezas para empresa'],
  ['educacion', 'Talleres o educación'],
  ['otro', 'Aún no lo sé'],
];

export default function FormularioSolicitud({ variante = 'contacto', tema = 'claro' }: { variante?: Variante; tema?: 'claro' | 'azul' }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [reinicioTurnstile, setReinicioTurnstile] = useState(0);
  const { estado, respuesta, enviar, reiniciar } = useEnvio('/api/contacto');

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = new FormData(form);
    const campos = camposDe(datos);
    const adjuntos = datos.getAll('adjuntos').filter((a): a is File => a instanceof File && a.size > 0);

    const nuevos: Errores = { ...validarContacto(campos).errores };
    if (variante === 'empresa') Object.assign(nuevos, validarEmpresa(campos).errores);
    if ((campos.mensaje ?? '').trim().length < 10) nuevos.mensaje = 'Cuéntanos un poco más (mínimo 10 caracteres).';
    const errorAdjuntos = validarArchivos(adjuntos, REGLAS_ADJUNTOS);
    if (errorAdjuntos) nuevos.adjuntos = errorAdjuntos;

    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(form);
      return;
    }
    const r = await enviar(datos);
    if (r.ok) {
      registrarEvento('formulario_envio', { tipo: variante, demo: r.demo });
      form.reset();
    } else {
      setErrores(r.errores ?? {});
      setReinicioTurnstile((n) => n + 1);
      enfocarPrimerError(form);
    }
  }

  if (estado === 'ok' && respuesta) {
    return (
      <Confirmacion
        respuesta={respuesta}
        titulo={variante === 'empresa' ? 'Recibimos tu solicitud' : 'Recibimos tu mensaje'}
        onOtra={() => {
          reiniciar();
          setErrores({});
        }}
      >
        <p>
          {variante === 'empresa'
            ? 'Revisamos la información técnica y te respondemos con una propuesta, normalmente con preguntas puntuales sobre la pieza.'
            : 'Te respondemos con una propuesta y un precio.'}
        </p>
      </Confirmacion>
    );
  }

  return (
    <form ref={formRef} className="formulario" onSubmit={alEnviar} noValidate encType="multipart/form-data">
      <input type="hidden" name="tipo" value={variante} />
      <Trampa />

      {variante === 'empresa' ? (
        <>
          <fieldset className="grupo">
            <legend>Empresa</legend>
            <div className="formulario__pila">
              <div className="fila-campos fila-campos--2">
                <CampoTexto etiqueta="Empresa" name="empresa" autoComplete="organization" error={errores.empresa} maxLength={160} />
                <CampoTexto etiqueta="NIT" name="nit" opcional inputMode="numeric" error={errores.nit} maxLength={30} placeholder="900123456-7" />
              </div>
              <CampoSeleccion etiqueta="Sector" name="sector" opcional opciones={SECTORES} defaultValue="" />
            </div>
          </fieldset>

          <fieldset className="grupo">
            <legend>Lo que necesitas</legend>
            <div className="formulario__pila">
              <div className="fila-campos fila-campos--3">
                <CampoSeleccion etiqueta="Tipo de pieza" name="tipoPieza" opcional opciones={TIPOS_PIEZA} defaultValue="" />
                <CampoTexto etiqueta="Cantidad" name="cantidad" opcional maxLength={40} placeholder="Ej.: 4 unidades" />
                <CampoSeleccion etiqueta="Urgencia" name="urgencia" opcional opciones={URGENCIAS} defaultValue="Sin urgencia" />
              </div>
              <CampoArea
                etiqueta="Describe la pieza o el problema"
                name="mensaje"
                rows={5}
                maxLength={4000}
                error={errores.mensaje}
                placeholder="Qué pieza es, en qué equipo trabaja, qué falla, medidas críticas, material actual, temperatura o químicos a los que está expuesta…"
              />
              <CampoArchivos
                etiqueta="Planos o fotos"
                name="adjuntos"
                multiple
                accept={REGLAS_ADJUNTOS.extensiones.join(',')}
                error={errores.adjuntos}
                ayuda="Hasta 5 archivos de 10 MB: fotos, PDF, STEP, STL, 3MF, DXF o DWG. Si es una pieza rota, fotografíala junto a una regla."
              />
            </div>
          </fieldset>

          <fieldset className="grupo">
            <legend>Persona de contacto</legend>
            <div className="formulario__pila">
              <CamposContacto errores={errores} tipoFijo="empresa" mostrarCiudad />
            </div>
          </fieldset>

          <details className="formulario__desplegable">
            <summary>Datos de facturación (opcional)</summary>
            <div className="formulario__pila">
              <CampoTexto etiqueta="Razón social" name="razonSocial" opcional maxLength={160} />
              <div className="fila-campos fila-campos--2">
                <CampoTexto
                  etiqueta="Correo de facturación electrónica"
                  name="correoFacturacion"
                  type="email"
                  opcional
                  maxLength={160}
                  error={errores.correoFacturacion}
                />
                <CampoTexto etiqueta="Dirección de facturación" name="direccionFacturacion" opcional maxLength={240} />
              </div>
            </div>
          </details>
        </>
      ) : (
        <div className="formulario__pila">
          <CamposContacto errores={errores} mostrarCiudad={false} />
          <CampoSeleccion etiqueta="¿Qué necesitas?" name="servicio" opciones={SERVICIOS} defaultValue="impresion" />
          <CampoArea
            etiqueta="Cuéntanos tu proyecto"
            name="mensaje"
            rows={5}
            maxLength={4000}
            error={errores.mensaje}
            placeholder="Qué quieres hacer, medidas aproximadas, para cuándo lo necesitas…"
          />
          <CampoArchivos
            etiqueta="Fotos o archivos"
            name="adjuntos"
            multiple
            accept={REGLAS_ADJUNTOS.extensiones.join(',')}
            error={errores.adjuntos}
            ayuda="Hasta 5 archivos de 10 MB."
          />
        </div>
      )}

      <Consentimiento error={errores.consentimiento} />
      <Turnstile reinicio={reinicioTurnstile} tema={tema === 'azul' ? 'dark' : 'light'} />

      {estado === 'error' && respuesta?.mensaje && (
        <p className="aviso aviso--error" role="alert">
          {respuesta.mensaje}
        </p>
      )}

      <div>
        <button type="submit" className="boton boton--primario" disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Enviando…' : variante === 'empresa' ? 'Enviar solicitud' : 'Enviar mensaje'}
        </button>
      </div>
    </form>
  );
}
