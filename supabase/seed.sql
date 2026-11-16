-- ════════════════════════════════════════════════════════════════════════
-- Datos semilla. Generado con `npm run semilla` desde src/config/precios.ts.
-- La configuración de precios es de DEMOSTRACIÓN ([CONFIGURAR]): cámbiala
-- desde /admin/precios. Volver a ejecutar este archivo NO la sobrescribe.
-- ════════════════════════════════════════════════════════════════════════
insert into public.configuracion (clave, valor, actualizado_por)
values ('precios', '{
  "moneda": "COP",
  "esDemo": true,
  "desperdicio": 0.08,
  "paredes": {
    "lineas": 2,
    "anchoLineaMm": 0.42
  },
  "rellenos": [
    0.1,
    0.15,
    0.25,
    0.4,
    0.6,
    1
  ],
  "rellenoPorDefecto": 0.15,
  "caudalCm3PorHora": 15,
  "factorCalibracion": 1,
  "horasMinimasPorPieza": 0.25,
  "tarifaMaquinaHora": 5000,
  "preparacionPorPedido": 5000,
  "recargoCambioColor": 1500,
  "maxColores": 4,
  "margen": 0.4,
  "pedidoMinimo": 20000,
  "descuentosCantidad": [
    {
      "desde": 5,
      "descuento": 0.05
    },
    {
      "desde": 10,
      "descuento": 0.1
    },
    {
      "desde": 25,
      "descuento": 0.15
    }
  ],
  "iva": {
    "cobrar": false,
    "tasa": 0.19
  },
  "redondeo": 100,
  "entrega": {
    "horasMaquinaPorDia": 16,
    "diasPreparacion": 1
  },
  "materiales": [
    {
      "id": "pla",
      "nombre": "PLA",
      "descripcion": "Rígido, preciso y con buen acabado. El más versátil.",
      "usos": "Prototipos, maquetas, carcasas, soportes y piezas de uso interior.",
      "densidad": 1.24,
      "precioKg": 100000,
      "factorVelocidad": 1,
      "permiteMulticolor": true,
      "colores": [
        "negro",
        "blanco",
        "gris",
        "azul",
        "rojo",
        "naranja",
        "verde",
        "amarillo"
      ],
      "activo": true
    },
    {
      "id": "petg",
      "nombre": "PETG",
      "descripcion": "Más tenaz que el PLA y resiste mejor la temperatura y la humedad.",
      "usos": "Piezas funcionales, soportes mecánicos, guardas y piezas con algo de calor.",
      "densidad": 1.27,
      "precioKg": 110000,
      "factorVelocidad": 0.9,
      "permiteMulticolor": true,
      "colores": [
        "negro",
        "blanco",
        "gris",
        "azul",
        "transparente"
      ],
      "activo": true
    },
    {
      "id": "asa",
      "nombre": "ASA",
      "descripcion": "Resiste la intemperie, los rayos UV y temperaturas más altas.",
      "usos": "Piezas para exteriores, repuestos industriales y entornos con calor.",
      "densidad": 1.07,
      "precioKg": 120000,
      "factorVelocidad": 0.85,
      "permiteMulticolor": true,
      "colores": [
        "negro",
        "blanco",
        "gris"
      ],
      "activo": true
    },
    {
      "id": "tpu",
      "nombre": "TPU (flexible)",
      "descripcion": "Flexible y resistente al desgaste, similar al caucho.",
      "usos": "Empaques, amortiguadores, protectores, agarres y correas.",
      "densidad": 1.21,
      "precioKg": 150000,
      "factorVelocidad": 0.45,
      "permiteMulticolor": false,
      "colores": [
        "negro",
        "blanco"
      ],
      "activo": true
    }
  ],
  "colores": [
    {
      "id": "negro",
      "nombre": "Negro",
      "hex": "#1b1d21",
      "activo": true
    },
    {
      "id": "blanco",
      "nombre": "Blanco",
      "hex": "#f4f4f2",
      "activo": true
    },
    {
      "id": "gris",
      "nombre": "Gris",
      "hex": "#8a9099",
      "activo": true
    },
    {
      "id": "azul",
      "nombre": "Azul",
      "hex": "#1f4fa3",
      "activo": true
    },
    {
      "id": "rojo",
      "nombre": "Rojo",
      "hex": "#c62828",
      "activo": true
    },
    {
      "id": "naranja",
      "nombre": "Naranja",
      "hex": "#ff6a13",
      "activo": true
    },
    {
      "id": "verde",
      "nombre": "Verde",
      "hex": "#2e7d32",
      "activo": true
    },
    {
      "id": "amarillo",
      "nombre": "Amarillo",
      "hex": "#f2c230",
      "activo": true
    },
    {
      "id": "transparente",
      "nombre": "Transparente",
      "hex": "#dfe8ee",
      "activo": true
    }
  ],
  "calidades": [
    {
      "id": "fina",
      "nombre": "Fina",
      "alturaCapaMm": 0.12,
      "factorVelocidad": 0.6,
      "descripcion": "Detalle alto y capas casi invisibles. Más lenta.",
      "activo": true
    },
    {
      "id": "estandar",
      "nombre": "Estándar",
      "alturaCapaMm": 0.2,
      "factorVelocidad": 1,
      "descripcion": "Equilibrio entre detalle y tiempo. Recomendada.",
      "activo": true
    },
    {
      "id": "rapida",
      "nombre": "Rápida",
      "alturaCapaMm": 0.28,
      "factorVelocidad": 1.3,
      "descripcion": "Para piezas funcionales donde el acabado importa menos.",
      "activo": true
    }
  ],
  "posprocesados": [
    {
      "id": "ninguno",
      "nombre": "Sin posprocesado",
      "descripcion": "La pieza como sale de la impresora, sin soportes.",
      "costoPorPieza": 0,
      "diasExtra": 0,
      "activo": true
    },
    {
      "id": "lijado",
      "nombre": "Lijado",
      "descripcion": "Superficies visibles lijadas para un acabado más uniforme.",
      "costoPorPieza": 15000,
      "diasExtra": 1,
      "activo": true
    },
    {
      "id": "insertos",
      "nombre": "Insertos roscados",
      "descripcion": "Instalación de insertos metálicos para tornillos.",
      "costoPorPieza": 8000,
      "diasExtra": 1,
      "activo": true
    },
    {
      "id": "pintura",
      "nombre": "Imprimación y pintura",
      "descripcion": "Acabado pintado en el color que elijas.",
      "costoPorPieza": 40000,
      "diasExtra": 3,
      "activo": true
    }
  ],
  "urgencias": [
    {
      "id": "normal",
      "nombre": "Normal",
      "descripcion": "Plazo estándar.",
      "recargo": 0,
      "factorPlazo": 1,
      "activo": true
    },
    {
      "id": "prioritaria",
      "nombre": "Prioritaria",
      "descripcion": "Pasa adelante en la cola de producción.",
      "recargo": 0.25,
      "factorPlazo": 0.6,
      "activo": true
    },
    {
      "id": "urgente",
      "nombre": "Urgente",
      "descripcion": "Lo más pronto posible, según disponibilidad.",
      "recargo": 0.6,
      "factorPlazo": 0.35,
      "activo": true
    }
  ]
}'::jsonb, 'semilla')
on conflict (clave) do nothing;
