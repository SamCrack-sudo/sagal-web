/**
 * Códigos de seguimiento no adivinables, p. ej. "SR-7KQ4M-9XDTA".
 * 10 caracteres de un alfabeto de 31 símbolos (sin 0/O, 1/I/L) ≈ 8 × 10¹⁴
 * combinaciones, generados con el generador criptográfico del entorno.
 */
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generarCodigo(prefijo: string, longitud = 10): string {
  const bytes = new Uint8Array(longitud * 2);
  crypto.getRandomValues(bytes);
  let salida = '';
  // Muestreo por rechazo para no sesgar la distribución.
  const limite = 256 - (256 % ALFABETO.length);
  for (let i = 0; i < bytes.length && salida.length < longitud; i++) {
    const b = bytes[i]!;
    if (b < limite) salida += ALFABETO[b % ALFABETO.length];
  }
  while (salida.length < longitud) salida += generarCodigo('', longitud - salida.length).replace(/-/g, '');
  const mitad = Math.ceil(longitud / 2);
  const cuerpo = `${salida.slice(0, mitad)}-${salida.slice(mitad)}`;
  return prefijo ? `${prefijo}-${cuerpo}` : cuerpo;
}

export function esCodigoValido(codigo: string, prefijo: string): boolean {
  const re = new RegExp(`^${prefijo}-[${ALFABETO}]{5}-[${ALFABETO}]{5}$`);
  return re.test(codigo);
}
