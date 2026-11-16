/**
 * CONDICIONES COMERCIALES
 * Pagos, anticipo, entregas, vigencia de cotizaciones, garantía y tolerancias.
 * Se usan en /terminos, en las preguntas frecuentes y en /pedido/[codigo].
 * Cambia aquí y se actualiza en todo el sitio.
 */
export const condiciones = {
  pagos: {
    /** Medios de pago aceptados. */
    medios: ['transferencia a cuenta de ahorros Bancolombia', 'Nequi', 'Bre-B'],
    /** Anticipo para empezar la producción (fracción: 0,5 = 50 %). El saldo se paga al entregar. */
    anticipo: 0.5,
    /**
     * Texto que ve el cliente en su página de seguimiento cuando el pedido no
     * tiene enlace de pago. No publica números de cuenta: se envían por mensaje.
     */
    instrucciones:
      'Puedes pagar por transferencia a cuenta de ahorros Bancolombia, por Nequi o con Bre-B. Te enviamos los datos exactos por correo o WhatsApp cuando apruebes la cotización. Envía el comprobante a sagalrobotics@gmail.com indicando tu código de pedido.',
  },

  entregas: {
    /**
     * Puntos de entrega acordados. El taller funciona en casa, así que las
     * entregas se hacen en lugares públicos y concurridos, con hora acordada.
     */
    puntos: ['Universidad Militar Nueva Granada, sede Cajicá', 'Centro Comercial Fontanar, Chía', 'Centro de Chía'],
    mensajeria: 'También enviamos por mensajería en la Sabana y Bogotá, o por transportadora a todo el país, con el costo a cargo del cliente.',
  },

  cotizacion: {
    /** Días calendario en que es válida una cotización final. */
    vigenciaDias: 15,
  },

  garantia: {
    /** Días de garantía por defectos de fabricación, desde la entrega. */
    dias: 90,
    cubre: 'defectos de fabricación: capas despegadas, piezas incompletas o medidas fuera de la tolerancia acordada',
    noCubre:
      'el desgaste normal, el uso distinto al informado al cotizar (temperatura, carga, químicos) ni errores de un diseño suministrado por el cliente',
    comoReclamar: 'Escríbenos con tu código de pedido y fotos de la pieza; si el defecto es de fabricación, la reimprimimos o te devolvemos el dinero.',
  },

  tolerancias: {
    /** Tolerancia dimensional general que se ofrece. */
    general: '±0,2 mm o ±0,5 % de la medida (lo que sea mayor) en PLA y PETG',
    materialesTecnicos: 'En ABS, TPU y piezas grandes puede ser mayor por la contracción del material.',
    criticas: 'Si una medida es crítica (un ajuste, un rodamiento, una rosca), indícala al cotizar: la verificamos con una pieza de prueba.',
  },

  empresas: {
    /** Visitas a planta para tomar medidas o ver el problema. */
    visitas: 'Visitamos tu planta en la Sabana Centro y Bogotá para tomar medidas y entender el problema. Por ahora, la visita de diagnóstico no tiene costo.',
  },
} as const;

/** "transferencia a cuenta de ahorros Bancolombia, Nequi o Bre-B" */
export function textoMedios(): string {
  const m = condiciones.pagos.medios;
  return m.length > 1 ? `${m.slice(0, -1).join(', ')} o ${m.at(-1)}` : (m[0] ?? '');
}
