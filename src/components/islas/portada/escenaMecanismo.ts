/**
 * Escena de la portada: un reductor de engranajes (placa base, soportes,
 * rodamientos, eje, engranaje, piñón, motor y tornillos) que nace como plano
 * técnico (solo aristas), se arma y se despieza en vista explosionada.
 *
 * - `explosion` 0 = armado, 1 = despiezado (lo controla el scroll).
 * - `solidez`   0 = solo líneas de plano, 1 = piezas sólidas (animación de entrada).
 * - `giro`      inclinación por cursor, en radianes.
 * Solo dibuja cuadros mientras algo cambia: en reposo no consume batería.
 */
import * as THREE from 'three';

interface Pieza {
  grupo: THREE.Group;
  armado: THREE.Vector3;
  despiece: THREE.Vector3;
  /** Retardo relativo en la secuencia de armado (0–1). */
  orden: number;
}

export interface Mecanismo {
  objetivo(estado: { explosion?: number; solidez?: number; giroX?: number; giroY?: number }): void;
  pausar(pausado: boolean): void;
  destruir(): void;
}

const LINEA = 0xe9eef5;

function perfilEngranaje(dientes: number, radioPaso: number, radioAgujero: number): THREE.Shape {
  const m = (2 * radioPaso) / dientes;
  const rExt = radioPaso + m;
  const rRaiz = radioPaso - 1.25 * m;
  const forma = new THREE.Shape();
  const paso = (Math.PI * 2) / dientes;
  for (let i = 0; i < dientes; i++) {
    const a = i * paso;
    const puntos: [number, number][] = [
      [rRaiz, a],
      [rRaiz, a + paso * 0.18],
      [rExt, a + paso * 0.32],
      [rExt, a + paso * 0.5],
      [rRaiz, a + paso * 0.64],
    ];
    for (const [r, ang] of puntos) {
      const x = r * Math.cos(ang);
      const y = r * Math.sin(ang);
      if (i === 0 && ang === a) forma.moveTo(x, y);
      else forma.lineTo(x, y);
    }
  }
  forma.closePath();
  const agujero = new THREE.Path();
  agujero.absarc(0, 0, radioAgujero, 0, Math.PI * 2, true);
  forma.holes.push(agujero);
  // Aligeramientos del engranaje grande
  if (radioPaso > 20) {
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 + 0.3;
      const h = new THREE.Path();
      h.absarc(Math.cos(ang) * radioPaso * 0.55, Math.sin(ang) * radioPaso * 0.55, radioPaso * 0.17, 0, Math.PI * 2, true);
      forma.holes.push(h);
    }
  }
  return forma;
}

export function crearMecanismo(contenedor: HTMLElement): Mecanismo {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(24, 1, 10, 4000);
  camara.position.set(330, 250, 400);
  camara.lookAt(0, 40, 0);

  escena.add(new THREE.HemisphereLight(0xffffff, 0x1d3256, 1.5));
  const luz = new THREE.DirectionalLight(0xffffff, 2.4);
  luz.position.set(200, 400, 260);
  escena.add(luz);
  const contra = new THREE.DirectionalLight(0x9fb8e0, 0.9);
  contra.position.set(-300, 120, -200);
  escena.add(contra);

  const raiz = new THREE.Group();
  raiz.position.y = -10;
  escena.add(raiz);

  const matLinea = new THREE.LineBasicMaterial({ color: LINEA, transparent: true, opacity: 0.9 });
  const mats = {
    placa: new THREE.MeshStandardMaterial({ color: 0xd3dae4, roughness: 0.75, metalness: 0.15 }),
    acento: new THREE.MeshStandardMaterial({ color: 0xff6a13, roughness: 0.5, metalness: 0.1 }),
    acero: new THREE.MeshStandardMaterial({ color: 0x9aa4b2, roughness: 0.35, metalness: 0.75 }),
    oscuro: new THREE.MeshStandardMaterial({ color: 0x1a1f26, roughness: 0.6, metalness: 0.3 }),
  };
  const todosMats = Object.values(mats);
  for (const m of todosMats) {
    m.transparent = true;
    m.opacity = 0;
    m.depthWrite = false;
  }

  const geometrias: THREE.BufferGeometry[] = [];
  const piezas: Pieza[] = [];

  function malla(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Group {
    geometrias.push(geo);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mat));
    const aristas = new THREE.EdgesGeometry(geo, 30);
    geometrias.push(aristas);
    g.add(new THREE.LineSegments(aristas, matLinea));
    return g;
  }

  function agregar(grupo: THREE.Group, armado: [number, number, number], despiece: [number, number, number], orden: number) {
    grupo.position.set(...armado);
    raiz.add(grupo);
    piezas.push({ grupo, armado: new THREE.Vector3(...armado), despiece: new THREE.Vector3(...despiece), orden });
  }

  const ALTO_EJE = 52;

  // Placa base con 4 agujeros
  {
    const f = new THREE.Shape();
    f.moveTo(-80, -55);
    f.lineTo(80, -55);
    f.lineTo(80, 55);
    f.lineTo(-80, 55);
    f.closePath();
    for (const [x, z] of [[-66, -42], [66, -42], [-66, 42], [66, 42]] as const) {
      const h = new THREE.Path();
      h.absarc(x, z, 4, 0, Math.PI * 2, true);
      f.holes.push(h);
    }
    const geo = new THREE.ExtrudeGeometry(f, { depth: 7, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 7, 0);
    agregar(malla(geo, mats.placa), [0, 0, 0], [0, -70, 0], 0);
  }

  // Soportes de rodamiento (perfil en el plano YZ, extruido en X)
  for (const lado of [-1, 1]) {
    const f = new THREE.Shape();
    f.moveTo(-22, 0);
    f.lineTo(22, 0);
    f.lineTo(22, ALTO_EJE - 7);
    f.absarc(0, ALTO_EJE - 7, 22, 0, Math.PI, false);
    f.lineTo(-22, 0);
    const h = new THREE.Path();
    h.absarc(0, ALTO_EJE - 7, 11, 0, Math.PI * 2, true);
    f.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(f, { depth: 16, bevelEnabled: false });
    geo.rotateY(Math.PI / 2);
    geo.translate(-8, 7, 0);
    agregar(malla(geo, mats.placa), [lado * 52, 0, 0], [lado * 70, 30, 0], 0.15);

    // Rodamiento
    const anillo = new THREE.TorusGeometry(9, 2.2, 10, 28);
    anillo.rotateY(Math.PI / 2);
    agregar(malla(anillo, mats.acero), [lado * 52, ALTO_EJE, 0], [lado * 120, 45, 0], 0.3);
  }

  // Eje
  {
    const geo = new THREE.CylinderGeometry(5, 5, 150, 24);
    geo.rotateZ(Math.PI / 2);
    agregar(malla(geo, mats.acero), [0, ALTO_EJE, 0], [-40, 95, 0], 0.4);
  }

  // Engranaje principal (acento)
  const RADIO_G = 34;
  const RADIO_P = 15;
  {
    const geo = new THREE.ExtrudeGeometry(perfilEngranaje(30, RADIO_G, 5.2), { depth: 10, bevelEnabled: false, curveSegments: 6 });
    geo.translate(0, 0, -5);
    geo.rotateY(Math.PI / 2);
    agregar(malla(geo, mats.acento), [0, ALTO_EJE, 0], [0, 70, 85], 0.55);
  }

  // Piñón y motor, engranados en diagonal
  const dist = RADIO_G + RADIO_P + 0.6;
  const py = ALTO_EJE + dist * Math.sin(Math.PI / 4);
  const pz = -dist * Math.cos(Math.PI / 4);
  {
    const geo = new THREE.ExtrudeGeometry(perfilEngranaje(13, RADIO_P, 3.2), { depth: 10, bevelEnabled: false, curveSegments: 4 });
    geo.translate(0, 0, -5);
    geo.rotateY(Math.PI / 2);
    agregar(malla(geo, mats.acento), [0, py, pz], [0, 120, -70], 0.7);

    const motor = new THREE.CylinderGeometry(17, 17, 44, 32);
    motor.rotateZ(Math.PI / 2);
    agregar(malla(motor, mats.oscuro), [36, py, pz], [130, 110, -90], 0.8);

    // Escuadra del motor
    const f = new THREE.Shape();
    f.moveTo(-20, 0);
    f.lineTo(20, 0);
    f.lineTo(20, py - 7 + 6);
    f.lineTo(-20, py - 7 + 6);
    f.closePath();
    const h = new THREE.Path();
    h.absarc(0, py - 7, 7, 0, Math.PI * 2, true);
    f.holes.push(h);
    const esc = new THREE.ExtrudeGeometry(f, { depth: 5, bevelEnabled: false });
    esc.rotateY(Math.PI / 2);
    esc.translate(9, 7, pz);
    agregar(malla(esc, mats.placa), [0, 0, 0], [80, 20, -80], 0.65);
  }

  // Tornillos
  for (const [x, z] of [[-66, -42], [66, -42], [-66, 42], [66, 42]] as const) {
    const g = new THREE.Group();
    const cabeza = new THREE.CylinderGeometry(6.5, 6.5, 5, 6);
    cabeza.translate(0, 9.5, 0);
    const vastago = new THREE.CylinderGeometry(3.5, 3.5, 12, 12);
    vastago.translate(0, 2, 0);
    g.add(malla(cabeza, mats.acero), malla(vastago, mats.acero));
    agregar(g, [x, 0, z], [x * 0.2, 150, z * 0.2], 0.9);
  }

  // ── Estado animado ──
  const direccionCamara = new THREE.Vector3(0.62, 0.48, 0.76).normalize();
  let distanciaBase = 560;
  const actual = { explosion: 1, solidez: 0, giroX: 0, giroY: 0 };
  const meta = { ...actual };
  let pausado = false;
  let animacion = 0;
  let ultimo = performance.now();

  function aplicar() {
    const e = actual.explosion;
    for (const p of piezas) {
      // Cada pieza se despieza con un pequeño desfase para que la secuencia se lea.
      const k = THREE.MathUtils.smootherstep(e * (1 + p.orden * 0.6) - p.orden * 0.3, 0, 1);
      p.grupo.position.copy(p.armado).addScaledVector(p.despiece, k);
    }
    for (const m of todosMats) {
      m.opacity = actual.solidez;
      const opaco = actual.solidez > 0.995;
      if (m.transparent === opaco) {
        m.transparent = !opaco;
        m.depthWrite = opaco;
        m.needsUpdate = true;
      }
    }
    matLinea.opacity = 0.9 - actual.solidez * 0.55;
    // La cámara se aleja al despiezar para que todas las piezas sigan en cuadro.
    camara.position.copy(direccionCamara).multiplyScalar(distanciaBase * (1 + 0.42 * actual.explosion));
    camara.lookAt(18, 44 + 22 * actual.explosion, 0);
    raiz.rotation.y = -0.35 + actual.giroY;
    raiz.rotation.x = actual.giroX;
  }

  function cuadro(ahora: number) {
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    let moviendo = false;
    for (const k of Object.keys(actual) as (keyof typeof actual)[]) {
      const velocidad = k === 'solidez' ? 2.2 : 5;
      const d = meta[k] - actual[k];
      if (Math.abs(d) > 0.0005) {
        actual[k] += d * (1 - Math.exp(-velocidad * dt));
        moviendo = true;
      } else actual[k] = meta[k];
    }
    aplicar();
    renderer.render(escena, camara);
    animacion = moviendo && !pausado ? requestAnimationFrame(cuadro) : 0;
  }

  function despertar() {
    if (!animacion && !pausado) {
      ultimo = performance.now();
      animacion = requestAnimationFrame(cuadro);
    }
  }

  function redimensionar() {
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // Encuadre: alejar en pantallas estrechas para que el conjunto quepa.
    distanciaBase = w / h < 1 ? 640 : 560;
    camara.updateProjectionMatrix();
    aplicar();
    renderer.render(escena, camara);
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(contenedor);
  redimensionar();

  return {
    objetivo(estado) {
      Object.assign(meta, estado);
      despertar();
    },
    pausar(p) {
      pausado = p;
      if (!p) despertar();
    },
    destruir() {
      cancelAnimationFrame(animacion);
      observador.disconnect();
      for (const g of geometrias) g.dispose();
      for (const m of todosMats) m.dispose();
      matLinea.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
