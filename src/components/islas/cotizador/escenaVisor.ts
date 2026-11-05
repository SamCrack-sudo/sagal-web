/**
 * Escena three.js del visor del cotizador: la pieza del cliente sobre la cama
 * de impresión, con el volumen de impresión a escala real y la caja límite.
 * Se importa de forma diferida: three.js solo se descarga al subir un archivo.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Malla } from '@/lib/malla/tipos';

export interface Volumen {
  x: number;
  y: number;
  z: number;
}

export interface Visor {
  ponerModelo(malla: Malla, factor: number): void;
  ponerColor(hex: string): void;
  ponerEncaje(cabe: boolean): void;
  vista(tipo: 'iso' | 'frente' | 'arriba'): void;
  destruir(): void;
}

const COLOR_PLANO = 0xe9eef5;
const COLOR_ACENTO = 0xff6a13;
const MAX_TRIANGULOS_ARISTAS = 150_000;

export function crearVisor(contenedor: HTMLElement, volumen: Volumen): Visor {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(35, 1, 0.5, 20000);

  // El mundo de impresión usa Z hacia arriba; three.js usa Y: se rota el grupo.
  const mundo = new THREE.Group();
  mundo.rotation.x = -Math.PI / 2;
  escena.add(mundo);

  escena.add(new THREE.HemisphereLight(0xffffff, 0x2a3c5c, 1.6));
  const luz = new THREE.DirectionalLight(0xffffff, 2.2);
  luz.position.set(300, 600, 400);
  escena.add(luz);
  const contraluz = new THREE.DirectionalLight(0xbfd2ff, 0.8);
  contraluz.position.set(-400, 200, -300);
  escena.add(contraluz);

  // ── Cama y volumen de impresión ──
  const cama = new THREE.Group();
  const lineasCama: number[] = [];
  const paso = 32;
  const hx = volumen.x / 2;
  const hy = volumen.y / 2;
  for (let x = -hx; x <= hx + 0.01; x += paso) lineasCama.push(x, -hy, 0, x, hy, 0);
  for (let y = -hy; y <= hy + 0.01; y += paso) lineasCama.push(-hx, y, 0, hx, y, 0);
  const geoCama = new THREE.BufferGeometry();
  geoCama.setAttribute('position', new THREE.Float32BufferAttribute(lineasCama, 3));
  const matCama = new THREE.LineBasicMaterial({ color: COLOR_PLANO, transparent: true, opacity: 0.18 });
  cama.add(new THREE.LineSegments(geoCama, matCama));

  const geoVolumen = new THREE.EdgesGeometry(new THREE.BoxGeometry(volumen.x, volumen.y, volumen.z));
  const matVolumen = new THREE.LineDashedMaterial({ color: COLOR_PLANO, dashSize: 6, gapSize: 4, transparent: true, opacity: 0.45 });
  const cajaVolumen = new THREE.LineSegments(geoVolumen, matVolumen);
  cajaVolumen.computeLineDistances();
  cajaVolumen.position.z = volumen.z / 2;
  cama.add(cajaVolumen);
  mundo.add(cama);

  // ── Modelo ──
  const material = new THREE.MeshStandardMaterial({ color: 0xff6a13, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });
  const matAristas = new THREE.LineBasicMaterial({ color: 0x10151c, transparent: true, opacity: 0.28 });
  const matCaja = new THREE.LineBasicMaterial({ color: COLOR_PLANO, transparent: true, opacity: 0.75 });
  let modelo: THREE.Group | null = null;
  let objetivo = new THREE.Vector3(0, 0, 0);
  let tamano = 100;

  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.12;
  controles.maxDistance = 4000;

  let pendiente = true;
  controles.addEventListener('change', () => (pendiente = true));

  function redimensionar() {
    const { clientWidth: w, clientHeight: h } = contenedor;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    pendiente = true;
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(contenedor);
  redimensionar();

  let animacion = 0;
  function bucle() {
    animacion = requestAnimationFrame(bucle);
    controles.update();
    if (pendiente) {
      renderer.render(escena, camara);
      pendiente = false;
    }
  }
  bucle();

  function liberar(obj: THREE.Object3D) {
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
    });
  }

  function vista(tipo: 'iso' | 'frente' | 'arriba') {
    const d = tamano * 2.6 + 60;
    // Coordenadas de three.js (Y arriba). "Frente" mira desde −Y del mundo de impresión (+Z en three).
    const dir =
      tipo === 'frente' ? new THREE.Vector3(0, 0.08, 1) : tipo === 'arriba' ? new THREE.Vector3(0, 1, 0.001) : new THREE.Vector3(0.85, 0.7, 1);
    camara.position.copy(objetivo).add(dir.normalize().multiplyScalar(d));
    controles.target.copy(objetivo);
    controles.minDistance = Math.max(10, tamano * 0.5);
    controles.update();
    pendiente = true;
  }

  return {
    ponerModelo(malla, factor) {
      if (modelo) {
        mundo.remove(modelo);
        liberar(modelo);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(malla.posiciones, 3));
      geo.scale(factor, factor, factor);
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      // Centrar en la cama y apoyar sobre Z = 0.
      geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z);
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      const t = new THREE.Vector3();
      geo.boundingBox!.getSize(t);

      modelo = new THREE.Group();
      modelo.add(new THREE.Mesh(geo, material));
      if (malla.triangulos <= MAX_TRIANGULOS_ARISTAS) {
        modelo.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), matAristas));
      }
      const caja = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(t.x, t.y, t.z)), matCaja);
      caja.position.set(0, 0, t.z / 2);
      modelo.add(caja);
      mundo.add(modelo);

      tamano = Math.max(t.x, t.y, t.z, 20);
      objetivo = new THREE.Vector3(0, t.z / 2, 0);
      vista('iso');
    },
    ponerColor(hex) {
      material.color.set(hex);
      // Con colores oscuros las aristas se aclaran para que la pieza se lea sobre el fondo azul.
      const hsl = { h: 0, s: 0, l: 0 };
      material.color.getHSL(hsl);
      const oscuro = hsl.l < 0.25;
      matAristas.color.setHex(oscuro ? COLOR_PLANO : 0x10151c);
      matAristas.opacity = oscuro ? 0.4 : 0.28;
      material.emissive.setHex(oscuro ? 0x1c2b44 : 0x000000);
      pendiente = true;
    },
    ponerEncaje(cabe) {
      matVolumen.color.setHex(cabe ? COLOR_PLANO : COLOR_ACENTO);
      matVolumen.opacity = cabe ? 0.45 : 0.95;
      pendiente = true;
    },
    vista,
    destruir() {
      cancelAnimationFrame(animacion);
      observador.disconnect();
      controles.dispose();
      if (modelo) liberar(modelo);
      liberar(cama);
      material.dispose();
      matAristas.dispose();
      matCaja.dispose();
      matCama.dispose();
      matVolumen.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
