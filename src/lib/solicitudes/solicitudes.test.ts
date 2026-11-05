import { describe, expect, it } from 'vitest';
import { esSpam, normalizarTelefono, validarArchivos, validarContacto, validarEmpresa, REGLAS_ADJUNTOS } from './validacion';
import { esCodigoValido, generarCodigo } from './codigo';

describe('validación de contacto', () => {
  const valido = { nombre: 'Ana', correo: 'ana@ejemplo.co', consentimiento: 'true', tipoCliente: 'persona' };

  it('acepta datos válidos y normaliza el correo', () => {
    const { datos, errores } = validarContacto({ ...valido, correo: '  Ana@Ejemplo.CO ' });
    expect(errores).toEqual({});
    expect(datos.correo).toBe('ana@ejemplo.co');
  });

  it('exige el consentimiento de tratamiento de datos (Ley 1581)', () => {
    const { errores } = validarContacto({ ...valido, consentimiento: undefined });
    expect(errores.consentimiento).toBeDefined();
  });

  it('rechaza correo, nombre, teléfono y tipo inválidos', () => {
    const { errores } = validarContacto({ nombre: 'A', correo: 'no-es-correo', telefono: '12', tipoCliente: 'pirata', consentimiento: 'on' });
    expect(Object.keys(errores).sort()).toEqual(['correo', 'nombre', 'telefono', 'tipoCliente']);
  });

  it('valida los datos empresariales', () => {
    expect(validarEmpresa({ empresa: 'Planta X', nit: '900.123.456-7' }).errores).toEqual({});
    const { errores } = validarEmpresa({ empresa: '', nit: 'abc', correoFacturacion: 'x' });
    expect(Object.keys(errores).sort()).toEqual(['correoFacturacion', 'empresa', 'nit']);
  });

  it('detecta el campo trampa', () => {
    expect(esSpam({ sitio_web: 'http://spam' })).toBe(true);
    expect(esSpam({ sitio_web: '' })).toBe(false);
  });

  it('normaliza celulares colombianos', () => {
    expect(normalizarTelefono('300 123 4567')).toBe('573001234567');
    expect(normalizarTelefono('+57 300-123-4567')).toBe('573001234567');
  });

  it('valida adjuntos por extensión, tamaño y cantidad', () => {
    expect(validarArchivos([{ name: 'plano.PDF', size: 1000 }], REGLAS_ADJUNTOS)).toBeNull();
    expect(validarArchivos([{ name: 'virus.exe', size: 10 }], REGLAS_ADJUNTOS)).toMatch(/formato/);
    expect(validarArchivos([{ name: 'foto.jpg', size: 50 * 1024 * 1024 }], REGLAS_ADJUNTOS)).toMatch(/MB/);
    expect(validarArchivos(Array(6).fill({ name: 'a.jpg', size: 1 }), REGLAS_ADJUNTOS)).toMatch(/máximo/);
  });
});

describe('códigos de seguimiento', () => {
  it('tienen formato fijo y no se repiten', () => {
    const codigos = new Set(Array.from({ length: 2000 }, () => generarCodigo('SR')));
    expect(codigos.size).toBe(2000);
    for (const c of [...codigos].slice(0, 50)) expect(esCodigoValido(c, 'SR')).toBe(true);
  });

  it('no usan caracteres ambiguos', () => {
    const muestra = Array.from({ length: 300 }, () => generarCodigo('SR')).join('');
    expect(muestra.replace(/^SR-|-|SR/g, '')).not.toMatch(/[01OIL]/);
  });
});
