/**
 * Editor de la configuración de precios del cotizador.
 * Edita una copia local, valida con las mismas reglas del servidor, muestra
 * una cotización de prueba en vivo y guarda con POST /api/admin/precios.
 */
import { useMemo, useState, type ReactNode } from 'react';
import type { Calidad, Color, ConfigPrecios, Material, Posprocesado, Urgencia } from '@/lib/precios/tipos';
import { validarConfigPrecios } from '@/lib/precios/validar';
import { cotizar, formatoCOP, formatoNumero } from '@/lib/precios/motor';

type Ruta = (string | number)[];

function fijar<T>(obj: T, ruta: Ruta, valor: unknown): T {
  const copia = structuredClone(obj) as unknown as Record<string | number, unknown>;
  let nodo: Record<string | number, unknown> = copia;
  for (let i = 0; i < ruta.length - 1; i++) nodo = nodo[ruta[i]!] as Record<string | number, unknown>;
  nodo[ruta.at(-1)!] = valor;
  return copia as unknown as T;
}

function idNuevo(base: string, existentes: { id: string }[]): string {
  let n = existentes.length + 1;
  while (existentes.some((x) => x.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ── Campos ──────────────────────────────────────────────────────────────
function Numero({
  etiqueta,
  valor,
  onCambio,
  paso = 1,
  ayuda,
  sufijo,
}: {
  etiqueta: string;
  valor: number;
  onCambio: (n: number) => void;
  paso?: number;
  ayuda?: string;
  sufijo?: string;
}) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">
        {etiqueta} {sufijo && <span className="campo__opcional">({sufijo})</span>}
      </span>
      <input
        className="control"
        type="number"
        inputMode="decimal"
        step={paso}
        value={Number.isFinite(valor) ? valor : ''}
        onChange={(e) => onCambio(e.target.value === '' ? Number.NaN : Number(e.target.value))}
      />
      {ayuda && <span className="campo__ayuda">{ayuda}</span>}
    </label>
  );
}

/** Edita una fracción (0,25) mostrándola como porcentaje (25). */
function Porcentaje(p: { etiqueta: string; valor: number; onCambio: (n: number) => void; ayuda?: string }) {
  return (
    <Numero
      etiqueta={p.etiqueta}
      sufijo="%"
      paso={0.5}
      ayuda={p.ayuda}
      valor={Math.round(p.valor * 10000) / 100}
      onCambio={(n) => p.onCambio(n / 100)}
    />
  );
}

function Texto({ etiqueta, valor, onCambio, largo }: { etiqueta: string; valor: string; onCambio: (t: string) => void; largo?: boolean }) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      {largo ? (
        <textarea className="control" rows={2} value={valor} onChange={(e) => onCambio(e.target.value)} />
      ) : (
        <input className="control" value={valor} onChange={(e) => onCambio(e.target.value)} />
      )}
    </label>
  );
}

function Casilla({ etiqueta, valor, onCambio }: { etiqueta: string; valor: boolean; onCambio: (b: boolean) => void }) {
  return (
    <label className="casilla">
      <input type="checkbox" checked={valor} onChange={(e) => onCambio(e.target.checked)} />
      <span>{etiqueta}</span>
    </label>
  );
}

function Bloque({ titulo, children, descripcion }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="panel editor-bloque">
      <h2>{titulo}</h2>
      {descripcion && <p className="secundario">{descripcion}</p>}
      {children}
    </section>
  );
}

function Elemento({
  titulo,
  id,
  activo,
  children,
  onQuitar,
}: {
  titulo: string;
  id: string;
  activo?: boolean;
  children: ReactNode;
  onQuitar?: () => void;
}) {
  return (
    <fieldset className="editor-elemento" data-activo={activo === false ? 'no' : 'si'}>
      <legend>
        {titulo || 'Sin nombre'} <span className="secundario">· {id}</span>
      </legend>
      <div className="editor-elemento__campos">{children}</div>
      {onQuitar && (
        <button type="button" className="boton boton--texto" onClick={onQuitar}>
          Eliminar
        </button>
      )}
    </fieldset>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────
export default function EditorPrecios({ inicial, demo }: { inicial: ConfigPrecios; demo: boolean }) {
  const [c, setC] = useState<ConfigPrecios>(inicial);
  const [estado, setEstado] = useState<'inactivo' | 'guardando' | 'ok' | 'error'>('inactivo');
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const cambiado = useMemo(() => JSON.stringify(c) !== JSON.stringify(inicial), [c, inicial]);
  const validacion = useMemo(() => validarConfigPrecios(c), [c]);
  const set = (ruta: Ruta, v: unknown) => {
    setC((anterior) => fijar(anterior, ruta, v));
    setEstado('inactivo');
  };

  // Cotización de prueba: cubo de 20 mm con el primer material activo.
  const prueba = useMemo(() => {
    if (!validacion.ok) return null;
    const m = c.materiales.find((x) => x.activo);
    const color = m?.colores.find((id) => c.colores.some((x) => x.id === id && x.activo));
    const calidad = c.calidades.find((q) => q.activo);
    const post = c.posprocesados.find((p) => p.activo);
    const urg = c.urgencias.find((u) => u.activo);
    if (!m || !color || !calidad || !post || !urg) return null;
    try {
      return {
        material: m.nombre,
        r: cotizar(
          { volumenMm3: 8000, areaMm2: 2400, materialId: m.id, colores: [color], calidadId: calidad.id, relleno: c.rellenoPorDefecto, cantidad: 1, posprocesadoId: post.id, urgenciaId: urg.id },
          c,
        ),
      };
    } catch {
      return null;
    }
  }, [c, validacion.ok]);

  async function guardar() {
    if (!validacion.ok) return;
    setEstado('guardando');
    setErroresServidor([]);
    try {
      const res = await fetch('/api/admin/precios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
      const datos = (await res.json().catch(() => ({}))) as { ok?: boolean; errores?: string[]; mensaje?: string };
      if (res.ok && datos.ok) {
        setEstado('ok');
        window.location.reload();
      } else {
        setErroresServidor(datos.errores ?? [datos.mensaje ?? 'No se pudo guardar.']);
        setEstado('error');
      }
    } catch {
      setErroresServidor(['Sin conexión. Inténtalo de nuevo.']);
      setEstado('error');
    }
  }

  const textoRellenos = c.rellenos.map((r) => Math.round(r * 100)).join(', ');

  return (
    <div className="editor-precios">
      <div className="editor-precios__barra">
        <div>
          {!validacion.ok ? (
            <span className="etiqueta etiqueta--error">{validacion.errores.length} error(es)</span>
          ) : cambiado ? (
            <span className="etiqueta etiqueta--alerta">Cambios sin guardar</span>
          ) : (
            <span className="etiqueta etiqueta--ok">Guardado</span>
          )}
          {prueba && (
            <span className="editor-precios__prueba">
              Cubo de 20 mm en {prueba.material}: <strong className="cifra">{formatoCOP(prueba.r.pedido.total)}</strong> ·{' '}
              {formatoNumero(prueba.r.pieza.horas, 2)} h · {prueba.r.entrega.diasHabiles} día(s)
            </span>
          )}
        </div>
        <div className="grupo-botones">
          {cambiado && (
            <button type="button" className="boton boton--texto" onClick={() => setC(inicial)}>
              Descartar
            </button>
          )}
          <button type="button" className="boton boton--primario" disabled={!cambiado || !validacion.ok || estado === 'guardando'} onClick={guardar}>
            {estado === 'guardando' ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {demo && (
        <p className="aviso aviso--alerta">
          <strong>Modo demo:</strong> los cambios se guardan en memoria y se pierden al reiniciar.
        </p>
      )}
      {(!validacion.ok || erroresServidor.length > 0) && (
        <div className="aviso aviso--error" role="alert">
          <strong>Corrige antes de guardar:</strong>
          <ul>
            {[...validacion.errores, ...erroresServidor].map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <Bloque titulo="General">
        <Casilla
          etiqueta="Precios de demostración (el cotizador muestra el aviso «precios de demostración»)"
          valor={c.esDemo}
          onCambio={(b) => set(['esDemo'], b)}
        />
        <div className="fila-campos fila-campos--3">
          <Numero etiqueta="Tarifa de máquina" sufijo="COP por hora" paso={100} valor={c.tarifaMaquinaHora} onCambio={(n) => set(['tarifaMaquinaHora'], n)} />
          <Numero etiqueta="Preparación por pedido" sufijo="COP" paso={500} valor={c.preparacionPorPedido} onCambio={(n) => set(['preparacionPorPedido'], n)} />
          <Numero etiqueta="Cambio de color (AMS)" sufijo="COP por cambio y pieza" paso={100} valor={c.recargoCambioColor} onCambio={(n) => set(['recargoCambioColor'], n)} />
          <Porcentaje etiqueta="Margen" valor={c.margen} onCambio={(n) => set(['margen'], n)} />
          <Numero etiqueta="Pedido mínimo" sufijo="COP antes de IVA" paso={1000} valor={c.pedidoMinimo} onCambio={(n) => set(['pedidoMinimo'], n)} />
          <Porcentaje etiqueta="Desperdicio de material" valor={c.desperdicio} onCambio={(n) => set(['desperdicio'], n)} />
          <Numero etiqueta="Redondeo" sufijo="COP" paso={50} valor={c.redondeo} onCambio={(n) => set(['redondeo'], n)} />
          <Numero etiqueta="Máximo de colores por pieza" paso={1} valor={c.maxColores} onCambio={(n) => set(['maxColores'], n)} />
        </div>
        <div className="fila-campos fila-campos--3">
          <Casilla etiqueta="Cobrar IVA" valor={c.iva.cobrar} onCambio={(b) => set(['iva', 'cobrar'], b)} />
          <Porcentaje etiqueta="Tasa de IVA" valor={c.iva.tasa} onCambio={(n) => set(['iva', 'tasa'], n)} />
        </div>
      </Bloque>

      <Bloque titulo="Tiempo y entrega" descripcion="Compara con los tiempos de Bambu Studio y ajusta el factor de calibración hasta que coincidan.">
        <div className="fila-campos fila-campos--3">
          <Numero etiqueta="Caudal de referencia" sufijo="cm³ por hora" paso={0.5} valor={c.caudalCm3PorHora} onCambio={(n) => set(['caudalCm3PorHora'], n)} />
          <Numero etiqueta="Factor de calibración" paso={0.05} valor={c.factorCalibracion} onCambio={(n) => set(['factorCalibracion'], n)} />
          <Numero etiqueta="Horas mínimas por pieza" paso={0.05} valor={c.horasMinimasPorPieza} onCambio={(n) => set(['horasMinimasPorPieza'], n)} />
          <Numero etiqueta="Horas de máquina por día" paso={1} valor={c.entrega.horasMaquinaPorDia} onCambio={(n) => set(['entrega', 'horasMaquinaPorDia'], n)} />
          <Numero etiqueta="Días de preparación" paso={1} valor={c.entrega.diasPreparacion} onCambio={(n) => set(['entrega', 'diasPreparacion'], n)} />
          <Numero etiqueta="Perímetros (paredes)" paso={1} valor={c.paredes.lineas} onCambio={(n) => set(['paredes', 'lineas'], n)} />
          <Numero etiqueta="Ancho de línea" sufijo="mm" paso={0.01} valor={c.paredes.anchoLineaMm} onCambio={(n) => set(['paredes', 'anchoLineaMm'], n)} />
        </div>
      </Bloque>

      <Bloque titulo="Materiales" descripcion="Desactiva un material para ocultarlo del cotizador sin borrarlo.">
        {c.materiales.map((m: Material, i) => (
          <Elemento key={m.id} titulo={m.nombre} id={m.id} activo={m.activo} onQuitar={inicial.materiales.some((x) => x.id === m.id) ? undefined : () => set(['materiales'], c.materiales.filter((_, k) => k !== i))}>
            <div className="fila-campos fila-campos--3">
              <Texto etiqueta="Nombre" valor={m.nombre} onCambio={(t) => set(['materiales', i, 'nombre'], t)} />
              <Numero etiqueta="Precio por kg" sufijo="COP" paso={1000} valor={m.precioKg} onCambio={(n) => set(['materiales', i, 'precioKg'], n)} />
              <Numero etiqueta="Densidad" sufijo="g/cm³" paso={0.01} valor={m.densidad} onCambio={(n) => set(['materiales', i, 'densidad'], n)} />
              <Numero etiqueta="Factor de velocidad" paso={0.05} valor={m.factorVelocidad} onCambio={(n) => set(['materiales', i, 'factorVelocidad'], n)} ayuda="1 = como el PLA; menor = más lento" />
            </div>
            <Texto etiqueta="Descripción" valor={m.descripcion} onCambio={(t) => set(['materiales', i, 'descripcion'], t)} largo />
            <Texto etiqueta="Ideal para" valor={m.usos} onCambio={(t) => set(['materiales', i, 'usos'], t)} largo />
            <fieldset className="grupo">
              <legend className="campo__etiqueta">Colores disponibles</legend>
              <div className="editor-colores">
                {c.colores.map((col) => (
                  <label key={col.id} className="casilla">
                    <input
                      type="checkbox"
                      checked={m.colores.includes(col.id)}
                      onChange={(e) =>
                        set(['materiales', i, 'colores'], e.target.checked ? [...m.colores, col.id] : m.colores.filter((x) => x !== col.id))
                      }
                    />
                    <span>
                      <i className="editor-muestra" style={{ background: col.hex }} aria-hidden="true" /> {col.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="fila-campos fila-campos--2">
              <Casilla etiqueta="Admite varios colores (AMS)" valor={m.permiteMulticolor} onCambio={(b) => set(['materiales', i, 'permiteMulticolor'], b)} />
              <Casilla etiqueta="Activo en el cotizador" valor={m.activo} onCambio={(b) => set(['materiales', i, 'activo'], b)} />
            </div>
          </Elemento>
        ))}
        <button
          type="button"
          className="boton boton--contorno boton--chico"
          onClick={() =>
            set(['materiales'], [
              ...c.materiales,
              { id: idNuevo('material', c.materiales), nombre: '', descripcion: '', usos: '', densidad: 1.2, precioKg: 0, factorVelocidad: 1, permiteMulticolor: true, colores: [], activo: false },
            ])
          }
        >
          + Agregar material
        </button>
      </Bloque>

      <Bloque titulo="Colores">
        <div className="editor-lista">
          {c.colores.map((col: Color, i) => (
            <Elemento key={col.id} titulo={col.nombre} id={col.id} activo={col.activo} onQuitar={inicial.colores.some((x) => x.id === col.id) ? undefined : () => set(['colores'], c.colores.filter((_, k) => k !== i))}>
              <div className="fila-campos fila-campos--3">
                <Texto etiqueta="Nombre" valor={col.nombre} onCambio={(t) => set(['colores', i, 'nombre'], t)} />
                <label className="campo">
                  <span className="campo__etiqueta">Muestra</span>
                  <input className="control editor-color" type="color" value={/^#[0-9a-f]{6}$/i.test(col.hex) ? col.hex : '#000000'} onChange={(e) => set(['colores', i, 'hex'], e.target.value)} />
                </label>
                <Casilla etiqueta="Activo" valor={col.activo} onCambio={(b) => set(['colores', i, 'activo'], b)} />
              </div>
            </Elemento>
          ))}
        </div>
        <button type="button" className="boton boton--contorno boton--chico" onClick={() => set(['colores'], [...c.colores, { id: idNuevo('color', c.colores), nombre: '', hex: '#888888', activo: true }])}>
          + Agregar color
        </button>
      </Bloque>

      <Bloque titulo="Calidades (altura de capa)">
        {c.calidades.map((q: Calidad, i) => (
          <Elemento key={q.id} titulo={q.nombre} id={q.id} activo={q.activo}>
            <div className="fila-campos fila-campos--3">
              <Texto etiqueta="Nombre" valor={q.nombre} onCambio={(t) => set(['calidades', i, 'nombre'], t)} />
              <Numero etiqueta="Altura de capa" sufijo="mm" paso={0.01} valor={q.alturaCapaMm} onCambio={(n) => set(['calidades', i, 'alturaCapaMm'], n)} />
              <Numero etiqueta="Factor de velocidad" paso={0.05} valor={q.factorVelocidad} onCambio={(n) => set(['calidades', i, 'factorVelocidad'], n)} />
            </div>
            <Texto etiqueta="Descripción" valor={q.descripcion} onCambio={(t) => set(['calidades', i, 'descripcion'], t)} />
            <Casilla etiqueta="Activa" valor={q.activo} onCambio={(b) => set(['calidades', i, 'activo'], b)} />
          </Elemento>
        ))}
      </Bloque>

      <Bloque titulo="Relleno">
        <div className="fila-campos fila-campos--2">
          <label className="campo">
            <span className="campo__etiqueta">Opciones (%, separadas por coma)</span>
            <input
              key={textoRellenos}
              className="control"
              defaultValue={textoRellenos}
              onBlur={(e) => {
                const lista = e.target.value
                  .split(/[,;\s]+/)
                  .map(Number)
                  .filter((n) => n > 0 && n <= 100)
                  .map((n) => n / 100);
                set(['rellenos'], [...new Set(lista)].sort((a, b) => a - b));
              }}
            />
            <span className="campo__ayuda">Se aplica al salir del campo. Ej.: 10, 15, 25, 40, 100</span>
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Relleno por defecto</span>
            <select className="control" value={c.rellenoPorDefecto} onChange={(e) => set(['rellenoPorDefecto'], Number(e.target.value))}>
              {c.rellenos.map((r) => (
                <option key={r} value={r}>
                  {Math.round(r * 100)} %
                </option>
              ))}
            </select>
          </label>
        </div>
      </Bloque>

      <Bloque titulo="Posprocesado">
        {c.posprocesados.map((p: Posprocesado, i) => (
          <Elemento key={p.id} titulo={p.nombre} id={p.id} activo={p.activo} onQuitar={inicial.posprocesados.some((x) => x.id === p.id) ? undefined : () => set(['posprocesados'], c.posprocesados.filter((_, k) => k !== i))}>
            <div className="fila-campos fila-campos--3">
              <Texto etiqueta="Nombre" valor={p.nombre} onCambio={(t) => set(['posprocesados', i, 'nombre'], t)} />
              <Numero etiqueta="Costo por pieza" sufijo="COP" paso={500} valor={p.costoPorPieza} onCambio={(n) => set(['posprocesados', i, 'costoPorPieza'], n)} />
              <Numero etiqueta="Días extra" paso={1} valor={p.diasExtra} onCambio={(n) => set(['posprocesados', i, 'diasExtra'], n)} />
            </div>
            <Texto etiqueta="Descripción" valor={p.descripcion} onCambio={(t) => set(['posprocesados', i, 'descripcion'], t)} />
            <Casilla etiqueta="Activo" valor={p.activo} onCambio={(b) => set(['posprocesados', i, 'activo'], b)} />
          </Elemento>
        ))}
        <button
          type="button"
          className="boton boton--contorno boton--chico"
          onClick={() => set(['posprocesados'], [...c.posprocesados, { id: idNuevo('acabado', c.posprocesados), nombre: '', descripcion: '', costoPorPieza: 0, diasExtra: 0, activo: false }])}
        >
          + Agregar posprocesado
        </button>
      </Bloque>

      <Bloque titulo="Urgencia">
        {c.urgencias.map((u: Urgencia, i) => (
          <Elemento key={u.id} titulo={u.nombre} id={u.id} activo={u.activo}>
            <div className="fila-campos fila-campos--3">
              <Texto etiqueta="Nombre" valor={u.nombre} onCambio={(t) => set(['urgencias', i, 'nombre'], t)} />
              <Porcentaje etiqueta="Recargo" valor={u.recargo} onCambio={(n) => set(['urgencias', i, 'recargo'], n)} />
              <Numero etiqueta="Factor de plazo" paso={0.05} valor={u.factorPlazo} onCambio={(n) => set(['urgencias', i, 'factorPlazo'], n)} ayuda="0,5 = la mitad del tiempo" />
            </div>
            <Texto etiqueta="Descripción" valor={u.descripcion} onCambio={(t) => set(['urgencias', i, 'descripcion'], t)} />
            <Casilla etiqueta="Activa" valor={u.activo} onCambio={(b) => set(['urgencias', i, 'activo'], b)} />
          </Elemento>
        ))}
      </Bloque>

      <Bloque titulo="Descuentos por cantidad">
        {c.descuentosCantidad.map((d, i) => (
          <div key={i} className="fila-campos fila-campos--3 editor-descuento">
            <Numero etiqueta="Desde (piezas)" paso={1} valor={d.desde} onCambio={(n) => set(['descuentosCantidad', i, 'desde'], n)} />
            <Porcentaje etiqueta="Descuento" valor={d.descuento} onCambio={(n) => set(['descuentosCantidad', i, 'descuento'], n)} />
            <button type="button" className="boton boton--texto" onClick={() => set(['descuentosCantidad'], c.descuentosCantidad.filter((_, k) => k !== i))}>
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          className="boton boton--contorno boton--chico"
          onClick={() => set(['descuentosCantidad'], [...c.descuentosCantidad, { desde: (c.descuentosCantidad.at(-1)?.desde ?? 1) * 2, descuento: 0.05 }])}
        >
          + Agregar tramo
        </button>
      </Bloque>
    </div>
  );
}
