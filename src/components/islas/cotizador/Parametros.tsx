/**
 * Selección de material, color, calidad, relleno, cantidad, posprocesado y urgencia.
 */
import type { ConfigPrecios } from '@/lib/precios/tipos';
import { formatoNumero } from '@/lib/precios/motor';

export interface ValoresParametros {
  materialId: string;
  colores: string[];
  calidadId: string;
  relleno: number;
  cantidad: number;
  posprocesadoId: string;
  urgenciaId: string;
}

interface Props {
  config: ConfigPrecios;
  valores: ValoresParametros;
  onCambio: (v: ValoresParametros) => void;
}

const porcentaje = (f: number) => `${Math.round(f * 100)} %`;

export function valoresIniciales(config: ConfigPrecios): ValoresParametros {
  const material = config.materiales.find((m) => m.activo)!;
  const color = material.colores.find((c) => config.colores.some((x) => x.id === c && x.activo))!;
  return {
    materialId: material.id,
    colores: [color],
    calidadId: (config.calidades.find((q) => q.activo && q.factorVelocidad === 1) ?? config.calidades.find((q) => q.activo))!.id,
    relleno: config.rellenoPorDefecto,
    cantidad: 1,
    posprocesadoId: (config.posprocesados.find((p) => p.activo && p.costoPorPieza === 0) ?? config.posprocesados[0]!).id,
    urgenciaId: (config.urgencias.find((u) => u.activo && u.recargo === 0) ?? config.urgencias[0]!).id,
  };
}

export default function Parametros({ config, valores, onCambio }: Props) {
  const materiales = config.materiales.filter((m) => m.activo);
  const material = materiales.find((m) => m.id === valores.materialId) ?? materiales[0]!;
  const colores = config.colores.filter((c) => c.activo && material.colores.includes(c.id));
  const maxColores = material.permiteMulticolor ? config.maxColores : 1;
  const post = config.posprocesados.find((p) => p.id === valores.posprocesadoId);

  const cambiar = (parcial: Partial<ValoresParametros>) => onCambio({ ...valores, ...parcial });

  function elegirMaterial(id: string) {
    const nuevo = materiales.find((m) => m.id === id)!;
    const disponibles = valores.colores.filter((c) => nuevo.colores.includes(c));
    const max = nuevo.permiteMulticolor ? config.maxColores : 1;
    const coloresValidos = disponibles.slice(0, max);
    const primero = nuevo.colores.find((c) => config.colores.some((x) => x.id === c && x.activo))!;
    cambiar({ materialId: id, colores: coloresValidos.length ? coloresValidos : [primero] });
  }

  function alternarColor(id: string) {
    if (maxColores === 1) return cambiar({ colores: [id] });
    const elegido = valores.colores.includes(id);
    if (elegido && valores.colores.length === 1) return;
    if (!elegido && valores.colores.length >= maxColores) return;
    cambiar({ colores: elegido ? valores.colores.filter((c) => c !== id) : [...valores.colores, id] });
  }

  const cantidad = (n: number) => cambiar({ cantidad: Math.min(10000, Math.max(1, Math.round(n) || 1)) });

  return (
    <div className="parametros">
      <fieldset className="grupo">
        <legend>Material</legend>
        <div className="opciones-material">
          {materiales.map((m) => (
            <label key={m.id} className="opcion-material">
              <input type="radio" name="material" value={m.id} checked={m.id === material.id} onChange={() => elegirMaterial(m.id)} />
              <span>
                <strong>{m.nombre}</strong>
                <small>{m.descripcion}</small>
              </span>
            </label>
          ))}
        </div>
        <p className="campo__ayuda parametros__nota">
          <strong>Ideal para:</strong> {material.usos}
        </p>
      </fieldset>

      <fieldset className="grupo">
        <legend>
          Color{' '}
          <span className="campo__opcional">
            {maxColores > 1 ? `(hasta ${maxColores}, multicolor con AMS)` : '(un color en este material)'}
          </span>
        </legend>
        <div className="muestras">
          {colores.map((c) => {
            const elegido = valores.colores.includes(c.id);
            const bloqueado = !elegido && maxColores > 1 && valores.colores.length >= maxColores;
            return (
              <label key={c.id} className="muestra">
                <input
                  type={maxColores > 1 ? 'checkbox' : 'radio'}
                  name="color"
                  value={c.id}
                  checked={elegido}
                  disabled={bloqueado}
                  onChange={() => alternarColor(c.id)}
                />
                <span>
                  <i style={{ background: c.hex }} aria-hidden="true" />
                  {c.nombre}
                </span>
              </label>
            );
          })}
        </div>
        {valores.colores.length > 1 && (
          <p className="campo__ayuda parametros__nota">
            Para piezas multicolor, sube un 3MF con los colores ya asignados o indícanos en las notas qué va de cada color.
          </p>
        )}
      </fieldset>

      <fieldset className="grupo">
        <legend>Calidad (altura de capa)</legend>
        <div className="segmentos">
          {config.calidades
            .filter((q) => q.activo)
            .map((q) => (
              <label key={q.id} className="segmento" title={q.descripcion}>
                <input type="radio" name="calidad" value={q.id} checked={q.id === valores.calidadId} onChange={() => cambiar({ calidadId: q.id })} />
                <span>
                  {q.nombre}
                  <small>{formatoNumero(q.alturaCapaMm, 2)} mm</small>
                </span>
              </label>
            ))}
        </div>
        <p className="campo__ayuda parametros__nota">{config.calidades.find((q) => q.id === valores.calidadId)?.descripcion}</p>
      </fieldset>

      <fieldset className="grupo">
        <legend>Relleno</legend>
        <div className="segmentos">
          {config.rellenos.map((r) => (
            <label key={r} className="segmento">
              <input type="radio" name="relleno" value={r} checked={r === valores.relleno} onChange={() => cambiar({ relleno: r })} />
              <span>{porcentaje(r)}</span>
            </label>
          ))}
        </div>
        <p className="campo__ayuda parametros__nota">
          15–25 % sirve para la mayoría de piezas. Sube el relleno si la pieza soporta cargas o va a ser perforada.
        </p>
      </fieldset>

      <div className="fila-campos fila-campos--2">
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="cot-cantidad">
            Cantidad
          </label>
          <div className="contador">
            <button type="button" onClick={() => cantidad(valores.cantidad - 1)} aria-label="Una pieza menos" disabled={valores.cantidad <= 1}>
              −
            </button>
            <input
              id="cot-cantidad"
              className="control"
              type="number"
              inputMode="numeric"
              min={1}
              max={10000}
              value={valores.cantidad}
              onChange={(e) => cantidad(Number(e.target.value))}
            />
            <button type="button" onClick={() => cantidad(valores.cantidad + 1)} aria-label="Una pieza más">
              +
            </button>
          </div>
          {config.descuentosCantidad.length > 0 && (
            <span className="campo__ayuda">
              Descuento por cantidad:{' '}
              {config.descuentosCantidad.map((d) => `${d.desde}+ piezas −${Math.round(d.descuento * 100)} %`).join(' · ')}
            </span>
          )}
        </div>

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="cot-post">
            Posprocesado
          </label>
          <select
            id="cot-post"
            className="control"
            value={valores.posprocesadoId}
            onChange={(e) => cambiar({ posprocesadoId: e.target.value })}
            aria-describedby="cot-post-ayuda"
          >
            {config.posprocesados
              .filter((p) => p.activo)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
          </select>
          <span className="campo__ayuda" id="cot-post-ayuda">
            {post?.descripcion}
          </span>
        </div>
      </div>

      <fieldset className="grupo">
        <legend>Urgencia</legend>
        <div className="segmentos">
          {config.urgencias
            .filter((u) => u.activo)
            .map((u) => (
              <label key={u.id} className="segmento" title={u.descripcion}>
                <input type="radio" name="urgencia" value={u.id} checked={u.id === valores.urgenciaId} onChange={() => cambiar({ urgenciaId: u.id })} />
                <span>
                  {u.nombre}
                  <small>{u.recargo > 0 ? `+${Math.round(u.recargo * 100)} %` : 'Sin recargo'}</small>
                </span>
              </label>
            ))}
        </div>
      </fieldset>
    </div>
  );
}
