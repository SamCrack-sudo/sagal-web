/**
 * Genera supabase/seed.sql con la configuración de precios inicial de
 * src/config/precios.ts (valores DEMO marcados [CONFIGURAR]).
 *   npm run semilla
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const { configPreciosInicial } = await import(`${raiz}src/config/precios.ts`);
const json = JSON.stringify(configPreciosInicial, null, 2).replace(/'/g, "''");

const sql = `-- ════════════════════════════════════════════════════════════════════════
-- Datos semilla. Generado con \`npm run semilla\` desde src/config/precios.ts.
-- La configuración de precios es de DEMOSTRACIÓN ([CONFIGURAR]): cámbiala
-- desde /admin/precios. Volver a ejecutar este archivo NO la sobrescribe.
-- ════════════════════════════════════════════════════════════════════════
insert into public.configuracion (clave, valor, actualizado_por)
values ('precios', '${json}'::jsonb, 'semilla')
on conflict (clave) do nothing;
`;

writeFileSync(`${raiz}supabase/seed.sql`, sql);
console.log('supabase/seed.sql generado');
