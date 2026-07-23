/**
 * Crea usuarios de prueba (Auth + perfil) para el negocio demo insertado
 * por database/seed/seed.sql.
 *
 * Es IDEMPOTENTE: si el usuario ya existe en Supabase Auth (por ejemplo,
 * de un intento anterior que falló a mitad de camino), lo reutiliza en
 * vez de fallar — simplemente crea o actualiza su fila en `usuarios`.
 * Puedes correr este script las veces que necesites sin tener que borrar
 * nada manualmente primero.
 *
 * Uso:
 *   1) Completa backend/.env con tus credenciales de Supabase.
 *   2) Asegúrate de haber corrido database/seed/seed.sql (crea el negocio demo).
 *   3) Ejecuta: npm run seed:usuarios
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NEGOCIO_DEMO_ID = '11111111-1111-1111-1111-111111111111';

const USUARIOS = [
  { email: 'admin@laterraza.com', password: 'BarFlow2026!', nombre: 'Ana', apellido: 'Gómez', rol: 'admin_negocio' },
  { email: 'barra@laterraza.com', password: 'BarFlow2026!', nombre: 'Carlos', apellido: 'Ruiz', rol: 'barra' },
  { email: 'mesero@laterraza.com', password: 'BarFlow2026!', nombre: 'Laura', apellido: 'Díaz', rol: 'mesero' },
];

async function buscarUsuarioPorEmail(email) {
  // admin.listUsers() no filtra por email de forma nativa en todas las
  // versiones del SDK, así que traemos y filtramos en memoria (la lista
  // de usuarios de un proyecto en desarrollo es pequeña).
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function verificarNegocioDemo() {
  const { data, error } = await supabase.from('negocios').select('id').eq('id', NEGOCIO_DEMO_ID).maybeSingle();
  if (error) {
    console.error('✗ No se pudo verificar el negocio demo:', error.message);
    return false;
  }
  if (!data) {
    console.error(
      `✗ El negocio demo (${NEGOCIO_DEMO_ID}) no existe todavía.\n` +
        '  Corre primero backend/database/seed/seed.sql en el SQL Editor de Supabase y vuelve a intentar.'
    );
    return false;
  }
  return true;
}

async function crearOReutilizarUsuario({ email, password, nombre, apellido, rol }) {
  let authUser = await buscarUsuarioPorEmail(email);

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) {
      console.error(`✗ No se pudo crear ${email}:`, error.message);
      return;
    }
    authUser = data.user;
  } else {
    console.log(`ℹ ${email} ya existía en Auth — reutilizando esa cuenta.`);
  }

  const { error: perfilError } = await supabase
    .from('usuarios')
    .upsert(
      { id: authUser.id, negocio_id: NEGOCIO_DEMO_ID, rol, nombre, apellido, email, activo: true },
      { onConflict: 'id' }
    );

  if (perfilError) {
    console.error(`✗ Usuario en Auth OK pero falló el perfil de ${email}:`, perfilError.message);
    return;
  }

  console.log(`✓ ${rol.padEnd(14)} ${email} / ${password}`);
}

async function main() {
  console.log('Creando usuarios de prueba para "La Terraza Bar"...\n');

  const negocioListo = await verificarNegocioDemo();
  if (!negocioListo) process.exit(1);

  for (const usuario of USUARIOS) {
    // eslint-disable-next-line no-await-in-loop
    await crearOReutilizarUsuario(usuario);
  }
  console.log('\nListo. Usa estas credenciales para iniciar sesión en la app.');
}

main();