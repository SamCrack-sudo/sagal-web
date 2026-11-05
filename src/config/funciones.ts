/**
 * Banderas de funciones. Permiten tener código listo pero apagado hasta que la
 * fase correspondiente (o la cuenta externa) esté configurada.
 */
export const funciones = {
  /** Página pública /pedido/[codigo] con el estado del pedido (fase 2, requiere Supabase). */
  seguimientoPedidos: false,
  /** Pago en línea con Wompi o Mercado Pago (apagado: por ahora enlace de pago o transferencia). */
  pagosEnLinea: false,
  proveedorPagos: 'wompi' as 'wompi' | 'mercadopago',
  /** Tienda de productos estándar (fase 3). */
  tienda: false,
  /** Sección de educación: talleres y kits (fase 3). */
  educacion: false,
} as const;
