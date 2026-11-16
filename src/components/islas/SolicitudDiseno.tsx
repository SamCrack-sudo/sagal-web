/**
 * Solicitud de diseño CAD: para quien NO tiene un archivo 3D y quiere que le
 * diseñen la pieza. Envía a /api/cotizacion con modalidad "diseno".
 */
import { useRef, useState, type FormEvent } from 'react';
import { CampoArchivos, CampoArea, CampoSeleccion, CampoTexto, CamposContacto, Consentimiento, Trampa } from './formularios/campos';
import { Turnstile } from './formularios/Turnstile';
import { Confirmacion } from './formularios/Confirmacion';
import { camposDe, enfocarPrimerError, useEnvio } from './formularios/envio';
import { REGLAS_FOTOS, validarArchivos, validarContacto, type Errores } from '@/lib/solicitudes/validacion';
import { registrarEvento } from '@/lib/cliente/analitica';

interface Paquete {
  id: string;
  nombre: string;
  para: string;
}

export default function SolicitudDiseno({ paquetes, abono }: { paquetes: Paquete[]; abono: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [reinicioTurnstile, setReinicioTurnstile] = useState(0);
  const { estado, respuesta, enviar, reiniciar } = useEnvio('/api/cotizacion');

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = new FormData(form);
    const nuevos: Errores = { ...validarContacto(camposDe(datos)).errores };
    if (String(datos.get('descripcion') ?? '').trim().length < 15) {
      nuevos.descripcion = 'Cuéntanos con algo más de detalle qué necesitas (mínimo 15 caracteres).';
    }
    const fotos = datos.getAll('fotos').filter((f): f is File => f instanceof File && f.size > 0);
    const errorFotos = validarArchivos(fotos, REGLAS_FOTOS);
    if (errorFotos) nuevos.fotos = errorFotos;

    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(form);
      return;
    }
    datos.set('modalidad', 'diseno');
    const r = await enviar(datos);
    if (r.ok) {
      registrarEvento('solicitud_cad_envio', { demo: r.demo, paquete: String(datos.get('paquete') || 'no-se') });
      form.reset();
      formRef.current?.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        titulo="Recibimos tu solicitud de diseño"
        onOtra={() => {
          reiniciar();
          setErrores({});
        }}
        textoOtra="Pedir otro diseño"
      >
        <p>
          Revisamos tu descripción y te respondemos con el paquete que aplica, el precio del diseño y el plazo. Si nos falta una medida o una foto, te
          escribimos. Nada se empieza sin tu aprobación.
        </p>
      </Confirmacion>
    );
  }

  return (
    <form ref={formRef} className="formulario" onSubmit={alEnviar} noValidate encType="multipart/form-data">
      <Trampa />
      <fieldset className="grupo">
        <legend>La pieza que necesitas</legend>
        <div className="formulario__pila">
          <CampoArea
            etiqueta="¿Qué necesitas que diseñemos?"
            name="descripcion"
            rows={6}
            maxLength={4000}
            error={errores.descripcion}
            placeholder="Para qué sirve la pieza, dónde va montada, con qué otras piezas encaja, qué esfuerzos soporta. Si es un repuesto, qué se rompió."
          />
          <div className="fila-campos fila-campos--2">
            <CampoTexto etiqueta="Medidas principales" name="medidas" opcional maxLength={600} placeholder="Ej.: 80 × 40 × 25 mm" />
            <CampoTexto etiqueta="Cantidad" name="cantidad" opcional maxLength={20} inputMode="numeric" placeholder="1" />
          </div>
          <CampoTexto etiqueta="Uso o ambiente" name="uso" opcional maxLength={300} placeholder="Interior, exterior, cerca de calor, contacto con agua…" />
          <CampoArchivos
            etiqueta="Fotos, bocetos o planos"
            name="fotos"
            multiple
            accept={REGLAS_FOTOS.extensiones.join(',')}
            error={errores.fotos}
            ayuda="Hasta 5 imágenes o PDF de 10 MB. Si es una pieza existente, fotografíala de varios lados junto a una regla o un calibrador."
          />
          <CampoSeleccion
            etiqueta="Paquete que crees que necesitas"
            name="paquete"
            opcional
            defaultValue=""
            ayuda="Si no estás seguro, déjalo así: te decimos cuál aplica antes de empezar."
            opciones={[['', 'No estoy seguro'], ...paquetes.map((p) => [p.id, `${p.nombre}: ${p.para}`] as [string, string])]}
          />
          <label className="casilla">
            <input type="checkbox" name="fabricar" value="true" defaultChecked />
            <span>También quiero que fabriquen la pieza (impresión 3D). El {Math.round(abono * 100)} % del valor del diseño se descuenta de la fabricación.</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>Tus datos</legend>
        <div className="formulario__pila">
          <CamposContacto errores={errores} />
        </div>
      </fieldset>

      <Consentimiento error={errores.consentimiento} />
      <Turnstile reinicio={reinicioTurnstile} />

      {estado === 'error' && respuesta?.mensaje && (
        <p className="aviso aviso--error" role="alert">
          {respuesta.mensaje}
        </p>
      )}

      <div>
        <button type="submit" className="boton boton--primario" disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Enviando…' : 'Enviar solicitud de diseño'}
        </button>
      </div>
    </form>
  );
}
