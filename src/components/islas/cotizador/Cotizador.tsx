/**
 * COTIZADOR INSTANTÁNEO
 * El cliente sube un STL/3MF: se lee en el navegador, se muestra en 3D con sus
 * medidas reales, se verifica contra el volumen de impresión y el precio se
 * calcula en vivo con el mismo motor que usa el servidor. Al enviar, el
 * servidor vuelve a leer el archivo y recalcula el precio.
 * Si no tiene archivo, abre una solicitud de diseño CAD.
 */
import { lazy, Suspense, useCallback, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import type { ConfigPrecios } from '@/lib/precios/tipos';
import { cotizar, ErrorCotizacion, formatoCOP, formatoNumero } from '@/lib/precios/motor';
import {
  calcularMetricas,
  ErrorMalla,
  escalarMetricas,
  extensionDe,
  leerModelo,
  TAM_MAX_MODELO,
  UNIDADES_ARCHIVO,
  verificarVolumen,
  volumenSospechoso,
  type Malla,
  type MetricasMalla,
  type UnidadArchivo,
} from '@/lib/malla';
import { REGLAS_FOTOS, validarArchivos, validarContacto, type Errores } from '@/lib/solicitudes/validacion';
import { registrarEvento } from '@/lib/cliente/analitica';
import Parametros, { valoresIniciales, type ValoresParametros } from './Parametros';
import PanelPrecio from './PanelPrecio';
import { CampoArchivos, CampoArea, CampoTexto, CamposContacto, Consentimiento, Trampa } from '../formularios/campos';
import { Turnstile } from '../formularios/Turnstile';
import { Confirmacion } from '../formularios/Confirmacion';
import { camposDe, enfocarPrimerError, useEnvio } from '../formularios/envio';
import type { Volumen } from './escenaVisor';
import './cotizador.css';

const Visor3D = lazy(() => import('./Visor3D'));

interface Props {
  config: ConfigPrecios;
  volumen: Volumen;
}

type Modo = 'inicio' | 'archivo' | 'diseno';

interface Pieza {
  archivo: File;
  malla: Malla;
  metricas: MetricasMalla;
  esStl: boolean;
}

const ID_ENVIO = 'cotizacion-envio';

export default function Cotizador({ config, volumen }: Props) {
  const [modo, setModo] = useState<Modo>('inicio');
  const [pieza, setPieza] = useState<Pieza | null>(null);
  const [unidad, setUnidad] = useState<UnidadArchivo>('mm');
  const [leyendo, setLeyendo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [valores, setValores] = useState<ValoresParametros>(() => valoresIniciales(config));
  const [errores, setErrores] = useState<Errores>({});
  const [reinicioTurnstile, setReinicioTurnstile] = useState(0);
  const iniciado = useRef(false);
  const { estado, respuesta, enviar, reiniciar } = useEnvio('/api/cotizacion');

  const marcarInicio = useCallback(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    registrarEvento('cotizacion_inicio');
  }, []);

  // ── Lectura del archivo (en el navegador; nada se sube hasta enviar) ──
  const leerArchivo = useCallback(
    async (archivo: File) => {
      marcarInicio();
      setErrorArchivo(null);
      const ext = extensionDe(archivo.name);
      if (ext !== '.stl' && ext !== '.3mf') {
        setErrorArchivo('Solo aceptamos archivos STL o 3MF. Si tienes otro formato (STEP, OBJ, DWG…), usa “No tengo archivo” y adjúntalo.');
        return;
      }
      if (archivo.size > TAM_MAX_MODELO) {
        setErrorArchivo(`El archivo pesa más de ${TAM_MAX_MODELO / 1024 / 1024} MB. Escríbenos y lo revisamos por otro medio.`);
        return;
      }
      setLeyendo(true);
      // Se cede un cuadro para que se pinte el estado "Leyendo…" antes del cálculo.
      await new Promise((r) => setTimeout(r, 30));
      try {
        const malla = leerModelo(archivo.name, await archivo.arrayBuffer());
        const metricas = calcularMetricas(malla);
        setPieza({ archivo, malla, metricas, esStl: ext === '.stl' });
        setUnidad('mm');
        setModo('archivo');
        registrarEvento('cotizacion_archivo_cargado', { formato: ext.slice(1) });
      } catch (e) {
        setErrorArchivo(e instanceof ErrorMalla ? e.message : 'No pudimos leer el archivo. ¿Está completo?');
      } finally {
        setLeyendo(false);
      }
    },
    [marcarInicio],
  );

  const factor = pieza?.esStl ? UNIDADES_ARCHIVO[unidad].factor : 1;
  const metricas = useMemo(() => (pieza ? escalarMetricas(pieza.metricas, factor) : null), [pieza, factor]);
  const encaje = useMemo(() => (metricas ? verificarVolumen(metricas.caja.tamano, volumen) : null), [metricas, volumen]);

  const { resultado, errorPrecio } = useMemo(() => {
    if (!metricas) return { resultado: null, errorPrecio: null };
    try {
      return { resultado: cotizar({ ...valores, volumenMm3: metricas.volumenMm3, areaMm2: metricas.areaMm2 }, config), errorPrecio: null };
    } catch (e) {
      return { resultado: null, errorPrecio: e instanceof ErrorCotizacion ? e.message : 'No pudimos calcular el precio.' };
    }
  }, [metricas, valores, config]);

  const medidas = (metricas?.caja.tamano.map((n) => formatoNumero(n, 1)) ?? ['0', '0', '0']) as [string, string, string];
  const colorVisor = config.colores.find((c) => c.id === valores.colores[0])?.hex ?? '#ff6a13';

  function alSoltar(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setArrastrando(false);
    const archivo = e.dataTransfer.files?.[0];
    if (archivo) void leerArchivo(archivo);
  }

  function reiniciarTodo() {
    reiniciar();
    setPieza(null);
    setModo('inicio');
    setErrores({});
    setErrorArchivo(null);
    setValores(valoresIniciales(config));
  }

  // ── Envío ──
  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = new FormData(form);
    const nuevos: Errores = { ...validarContacto(camposDe(datos)).errores };

    if (modo === 'diseno') {
      const descripcion = String(datos.get('descripcion') ?? '').trim();
      if (descripcion.length < 15) nuevos.descripcion = 'Cuéntanos con algo más de detalle qué necesitas (mínimo 15 caracteres).';
      const fotos = datos.getAll('fotos').filter((f): f is File => f instanceof File && f.size > 0);
      const errorFotos = validarArchivos(fotos, REGLAS_FOTOS);
      if (errorFotos) nuevos.fotos = errorFotos;
      datos.set('modalidad', 'diseno');
    } else {
      if (!pieza || !resultado) return;
      datos.set('modalidad', 'archivo');
      datos.set('modelo', pieza.archivo, pieza.archivo.name);
      datos.set('unidad', unidad);
      datos.set('parametros', JSON.stringify(valores));
    }

    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(form);
      return;
    }
    const r = await enviar(datos);
    if (r.ok) {
      registrarEvento(modo === 'diseno' ? 'solicitud_cad_envio' : 'cotizacion_envio', {
        demo: r.demo,
        valor: modo === 'archivo' ? r.total : undefined,
      });
      window.scrollTo({ top: (document.getElementById('cotizador')?.offsetTop ?? 0) - 16, behavior: 'smooth' });
    } else {
      setErrores(r.errores ?? {});
      setReinicioTurnstile((n) => n + 1);
      enfocarPrimerError(form);
    }
  }

  // ── Confirmación ──
  if (estado === 'ok' && respuesta) {
    return (
      <div className="cotizador">
        <Confirmacion
          respuesta={respuesta}
          titulo={modo === 'diseno' ? 'Recibimos tu solicitud de diseño' : 'Recibimos tu cotización'}
          onOtra={reiniciarTodo}
          textoOtra="Cotizar otra pieza"
        >
          {modo === 'archivo' && typeof respuesta.total === 'number' && (
            <p>
              Precio estimado: <strong>{formatoCOP(respuesta.total)}</strong>. Revisamos tu archivo y te confirmamos el valor final y el
              plazo antes de fabricar.
            </p>
          )}
          {modo === 'diseno' && <p>Revisamos tu descripción y te enviamos una propuesta de diseño con su precio.</p>}
        </Confirmacion>
      </div>
    );
  }

  const bloqueado =
    encaje && !encaje.cabe && !encaje.cabeRotada
      ? 'La pieza no cabe en la impresora. Puedes enviarla igual y te proponemos dividirla o escalarla.'
      : null;

  return (
    <div className="cotizador" id="cotizador">
      {/* ── Paso 1: archivo o diseño ── */}
      {modo === 'inicio' && (
        <div className="cotizador__inicio">
          <label
            className={`zona-carga${arrastrando ? ' zona-carga--activa' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
          >
            <input
              type="file"
              accept=".stl,.3mf,model/stl,model/3mf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void leerArchivo(f);
                e.target.value = '';
              }}
              aria-describedby="zona-carga-ayuda"
            />
            <svg className="zona-carga__icono" viewBox="0 0 48 48" width="56" height="56" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M24 6L40 15V33L24 42L8 33V15Z" />
              <path d="M8 15L24 24L40 15" />
              <path d="M24 24V42" />
            </svg>
            <span className="zona-carga__titulo">{leyendo ? 'Leyendo el archivo…' : 'Sube tu archivo STL o 3MF'}</span>
            <span className="zona-carga__texto" id="zona-carga-ayuda">
              Arrástralo aquí o haz clic para elegirlo. Máximo {TAM_MAX_MODELO / 1024 / 1024} MB. Lo leemos en tu navegador para darte el precio
              al instante.
            </span>
            <span className="boton boton--azul" aria-hidden="true">
              Elegir archivo
            </span>
          </label>

          {errorArchivo && (
            <p className="aviso aviso--error" role="alert">
              {errorArchivo}
            </p>
          )}

          <div className="cotizador__alternativa">
            <div>
              <h2 className="titulo-4">¿No tienes archivo 3D?</h2>
              <p className="secundario">
                Descríbenos la pieza, envíanos fotos y medidas, y la diseñamos en CAD. El diseño se cotiza aparte y se puede abonar al pedido de
                fabricación.
              </p>
            </div>
            <button
              type="button"
              className="boton boton--contorno"
              onClick={() => {
                marcarInicio();
                setModo('diseno');
              }}
            >
              No tengo archivo
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 2a: pieza cargada ── */}
      {modo === 'archivo' && pieza && metricas && encaje && (
        <div className="cotizador__rejilla">
          <div className="cotizador__principal">
            <section className="cotizador__pieza" aria-labelledby="pieza-titulo">
              <div className="cotizador__cabecera-pieza">
                <h2 className="titulo-4" id="pieza-titulo">
                  <span className="sr-only">Tu pieza: </span>
                  {pieza.archivo.name}
                </h2>
                <button type="button" className="boton boton--texto" onClick={reiniciarTodo}>
                  Cambiar archivo
                </button>
              </div>

              <Suspense fallback={<div className="visor visor--cargando" />}>
                <Visor3D malla={pieza.malla} factor={factor} color={colorVisor} volumen={volumen} cabe={encaje.cabe} medidas={medidas} />
              </Suspense>

              <dl className="especificaciones ficha-pieza">
                <dt>Medidas (X × Y × Z)</dt>
                <dd>
                  {medidas.join(' × ')} mm
                </dd>
                <dt>Volumen</dt>
                <dd>{formatoNumero(metricas.volumenMm3 / 1000, 1)} cm³</dd>
                <dt>Área de superficie</dt>
                <dd>{formatoNumero(metricas.areaMm2 / 100, 1)} cm²</dd>
                <dt>Triángulos</dt>
                <dd>{formatoNumero(metricas.triangulos)}</dd>
              </dl>

              {pieza.esStl && (
                <div className="campo ficha-pieza__unidad">
                  <label className="campo__etiqueta" htmlFor="cot-unidad">
                    Unidades del archivo
                  </label>
                  <select id="cot-unidad" className="control" value={unidad} onChange={(e) => setUnidad(e.target.value as UnidadArchivo)}>
                    {Object.entries(UNIDADES_ARCHIVO).map(([id, u]) => (
                      <option key={id} value={id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                  <span className="campo__ayuda">El STL no guarda unidades: si la pieza se ve diminuta o enorme, cámbialas aquí.</span>
                </div>
              )}

              <div className="ficha-pieza__avisos" aria-live="polite">
                {encaje.cabe ? (
                  <p className="aviso aviso--ok">
                    <strong>Cabe en la impresora.</strong> Volumen útil {volumen.x} × {volumen.y} × {volumen.z} mm.
                  </p>
                ) : encaje.cabeRotada ? (
                  <p className="aviso aviso--alerta">
                    <strong>No cabe en esta orientación, pero sí rotándola.</strong> La orientaremos al preparar la impresión.
                  </p>
                ) : (
                  <p className="aviso aviso--error">
                    <strong>La pieza no cabe en la impresora.</strong>{' '}
                    {encaje.excesos.map((x) => `${x.eje}: ${formatoNumero(x.medida, 1)} mm (máx. ${x.limite})`).join(' · ')}. Podemos dividirla en partes
                    o ajustar la escala.
                  </p>
                )}
                {volumenSospechoso(metricas) && (
                  <p className="aviso aviso--alerta">
                    <strong>El volumen parece incorrecto.</strong> La malla podría estar abierta (no es un sólido cerrado). Revisaremos el archivo
                    antes de confirmar el precio.
                  </p>
                )}
              </div>
            </section>

            <section className="cotizador__opciones" aria-labelledby="opciones-titulo">
              <h2 className="titulo-3" id="opciones-titulo">
                Opciones de fabricación
              </h2>
              <Parametros config={config} valores={valores} onCambio={setValores} />
            </section>
          </div>

          <aside className="cotizador__lateral">
            <PanelPrecio config={config} resultado={resultado} error={errorPrecio} bloqueado={null} idDestino={ID_ENVIO} />
          </aside>
        </div>
      )}

      {/* ── Paso 2b: solicitud de diseño CAD ── */}
      {modo === 'diseno' && (
        <div className="cotizador__diseno-cabecera">
          <div>
            <h2 className="titulo-3">Solicitud de diseño CAD</h2>
            <p className="secundario">
              Con una descripción, fotos y medidas podemos modelar la pieza. Si es un repuesto, fotografíalo junto a una regla o un calibrador.
            </p>
          </div>
          <button type="button" className="boton boton--texto" onClick={reiniciarTodo}>
            Tengo un archivo
          </button>
        </div>
      )}

      {/* ── Paso 3: datos de contacto y envío ── */}
      {modo !== 'inicio' && (
        <form className="cotizador__envio formulario" id={ID_ENVIO} onSubmit={alEnviar} noValidate tabIndex={-1}>
          <Trampa />
          {modo === 'diseno' && (
            <fieldset className="grupo">
              <legend>La pieza</legend>
              <div className="formulario__pila">
                <CampoArea
                  etiqueta="¿Qué necesitas?"
                  name="descripcion"
                  rows={5}
                  maxLength={4000}
                  error={errores.descripcion}
                  placeholder="Para qué sirve la pieza, dónde va montada, qué esfuerzos soporta, si reemplaza una pieza rota…"
                />
                <div className="fila-campos fila-campos--3">
                  <CampoTexto etiqueta="Medidas principales" name="medidas" opcional maxLength={600} placeholder="Ej.: 80 × 40 × 25 mm" />
                  <CampoTexto etiqueta="Uso o ambiente" name="uso" opcional maxLength={300} placeholder="Interior, exterior, calor…" />
                  <CampoTexto etiqueta="Cantidad" name="cantidad" opcional maxLength={20} inputMode="numeric" placeholder="1" />
                </div>
                <CampoArchivos
                  etiqueta="Fotos, bocetos o planos"
                  name="fotos"
                  multiple
                  accept={REGLAS_FOTOS.extensiones.join(',')}
                  error={errores.fotos}
                  ayuda="Hasta 5 imágenes o PDF de 10 MB cada uno."
                />
              </div>
            </fieldset>
          )}

          <fieldset className="grupo">
            <legend>{modo === 'archivo' ? 'Envíanos la cotización para revisarla' : 'Tus datos'}</legend>
            <div className="formulario__pila">
              <CamposContacto errores={errores} />
              {modo === 'archivo' && (
                <CampoArea
                  etiqueta="Notas para el taller"
                  name="notas"
                  opcional
                  rows={3}
                  maxLength={2000}
                  placeholder="Colores por zona, tolerancias, fecha límite, si la pieza encaja con otra…"
                />
              )}
            </div>
          </fieldset>

          <Consentimiento error={errores.consentimiento} />
          <Turnstile reinicio={reinicioTurnstile} />

          {modo === 'archivo' && bloqueado && <p className="aviso aviso--alerta">{bloqueado}</p>}
          {estado === 'error' && respuesta?.mensaje && (
            <p className="aviso aviso--error" role="alert">
              {respuesta.mensaje}
            </p>
          )}

          <div className="cotizador__enviar">
            <button type="submit" className="boton boton--primario" disabled={estado === 'enviando' || (modo === 'archivo' && !resultado)}>
              {estado === 'enviando' ? 'Enviando…' : modo === 'archivo' ? 'Enviar cotización' : 'Enviar solicitud de diseño'}
            </button>
            {modo === 'archivo' && resultado && (
              <span className="secundario">
                Total estimado <strong className="cifra">{formatoCOP(resultado.pedido.total)}</strong> · sin compromiso
              </span>
            )}
          </div>
        </form>
      )}

      {/* Barra fija con el precio en celulares */}
      {modo === 'archivo' && resultado && (
        <div className="barra-precio" aria-hidden="true">
          <span>
            <small>Estimado</small>
            <strong className="cifra">{formatoCOP(resultado.pedido.total)}</strong>
          </span>
          <a href={`#${ID_ENVIO}`} className="boton boton--primario boton--chico" tabIndex={-1}>
            Enviar
          </a>
        </div>
      )}
    </div>
  );
}
