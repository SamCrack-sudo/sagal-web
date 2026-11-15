/**
 * Panel de precio en vivo. No expone el margen: muestra estimaciones técnicas
 * (peso, horas) y los ajustes que el cliente controla (cantidad, urgencia).
 */
import type { ConfigPrecios } from '@/lib/precios/tipos';
import { formatoCOP, formatoNumero, type ResultadoCotizacion } from '@/lib/precios/motor';

interface Props {
  config: ConfigPrecios;
  resultado: ResultadoCotizacion | null;
  error: string | null;
  bloqueado?: string | null;
  idDestino: string;
}

export default function PanelPrecio({ config, resultado, error, bloqueado, idDestino }: Props) {
  const r = resultado;
  return (
    <section className="precio" aria-labelledby="precio-titulo">
      <h2 className="precio__rotulo" id="precio-titulo">
        Precio estimado
      </h2>

      {r ? (
        <>
          <p className="precio__total cifra" aria-live="polite" aria-atomic="true">
            {formatoCOP(r.pedido.total)}
          </p>
          <p className="precio__sub">
            {r.pedido.cantidad > 1 ? (
              <>
                {r.pedido.cantidad} piezas · {formatoCOP(r.precioUnitario)} c/u
              </>
            ) : (
              '1 pieza'
            )}
            {config.iva.cobrar ? ' · IVA incluido' : ''}
          </p>

          <dl className="especificaciones precio__lista">
            <dt>Entrega estimada</dt>
            <dd>
              {r.entrega.diasHabiles} día{r.entrega.diasHabiles === 1 ? '' : 's'} hábil{r.entrega.diasHabiles === 1 ? '' : 'es'}
            </dd>
            <dt>Peso estimado</dt>
            <dd>{formatoNumero(r.pedido.gramos, r.pedido.gramos < 10 ? 1 : 0)} g</dd>
            <dt>Tiempo de máquina</dt>
            <dd>{formatoNumero(r.pedido.horas, 1)} h</dd>
            {r.pedido.descuento > 0 && (
              <>
                <dt>Descuento por cantidad</dt>
                <dd>−{Math.round(r.pedido.descuento * 100)} %</dd>
              </>
            )}
            {r.pedido.recargoUrgencia > 0 && (
              <>
                <dt>Recargo por urgencia</dt>
                <dd>+{Math.round(r.pedido.recargoUrgencia * 100)} %</dd>
              </>
            )}
            {config.iva.cobrar && (
              <>
                <dt>IVA ({Math.round(config.iva.tasa * 100)} %)</dt>
                <dd>{formatoCOP(r.pedido.iva)}</dd>
              </>
            )}
          </dl>

          {r.pedido.aplicaMinimo && (
            <p className="campo__ayuda">Incluye el valor mínimo de pedido ({formatoCOP(config.pedidoMinimo)}).</p>
          )}
        </>
      ) : (
        <p className="precio__vacio">{error ?? 'Elige las opciones para ver el precio.'}</p>
      )}

      <p className="precio__nota">
        <strong>Precio estimado; lo confirmamos al revisar tu archivo.</strong> El plazo cuenta desde que apruebas la cotización.
      </p>

      {config.esDemo && (
        <p className="precio__demo">
          <span className="cinta">Demo</span> Precios de demostración [CONFIGURAR]: no son tarifas reales.
        </p>
      )}

      {bloqueado ? (
        <p className="aviso aviso--alerta">{bloqueado}</p>
      ) : (
        <a className="boton boton--primario boton--ancho" href={`#${idDestino}`}>
          Enviar para revisión
        </a>
      )}
    </section>
  );
}
