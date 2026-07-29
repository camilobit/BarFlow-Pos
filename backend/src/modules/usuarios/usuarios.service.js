import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

export async function listarUsuarios(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellido, email, rol, activo, avatar_url, barra_id, barra:barras(id, nombre), created_at')
    .eq('negocio_id', negocioId)
    .order('nombre');
  if (error) throw new AppError('No se pudieron listar los usuarios.', 500, error.message);
  return data;
}

async function buscarUsuarioAuthPorEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return null;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Crea un empleado: primero en Supabase Auth, luego su perfil en `usuarios`.
 * Si falla el segundo paso, revierte el usuario de Auth para no dejar huérfanos.
 *
 * Es resistente a intentos anteriores fallidos: si el correo ya existe en
 * Supabase Auth (por ejemplo, porque un intento previo se cayó a mitad de
 * camino) pero NO tiene perfil en `usuarios`, reutiliza esa cuenta en vez
 * de fallar. Si el correo ya tiene un perfil completo, avisa claramente
 * en vez de dar un error genérico de Auth.
 */
export async function crearEmpleado({ negocioId, email, password, nombre, apellido, rol, pin, barraId }) {
  let authUserId;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    const yaRegistrado = /already been registered|already exists/i.test(authError.message);
    if (!yaRegistrado) {
      throw new AppError(`No se pudo crear el usuario de autenticación: ${authError.message}`, 500);
    }

    const existente = await buscarUsuarioAuthPorEmail(email);
    if (!existente) {
      throw new AppError(`Ese correo ya está registrado, pero no se pudo verificar la cuenta: ${authError.message}`, 409);
    }

    const { data: perfilExistente } = await supabaseAdmin.from('usuarios').select('id').eq('id', existente.id).maybeSingle();
    if (perfilExistente) {
      throw new AppError('Ya existe un empleado con ese correo. Usa otro correo o edita el que ya existe.', 409);
    }

    // Cuenta huérfana de un intento anterior: la reutilizamos.
    authUserId = existente.id;
  } else {
    authUserId = authData.user.id;
  }

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('usuarios')
    .insert({
      id: authUserId,
      negocio_id: negocioId,
      rol,
      nombre,
      apellido: apellido || null,
      email,
      pin: pin || null,
      barra_id: barraId || null,
    })
    .select()
    .single();

  if (perfilError) {
    // Solo borramos el usuario de Auth si lo creamos nosotros en esta
    // misma llamada — si era una cuenta reutilizada, la dejamos intacta.
    if (!authError) await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw new AppError(`No se pudo crear el perfil del usuario: ${perfilError.message}`, 500);
  }

  return perfil;
}

export async function actualizarUsuario(usuarioId, payload) {
  const { data, error } = await supabaseAdmin.from('usuarios').update(payload).eq('id', usuarioId).select().single();
  if (error) throw new AppError('No se pudo actualizar el usuario.', 500, error.message);
  return data;
}

export async function desactivarUsuario(usuarioId) {
  const { error } = await supabaseAdmin.from('usuarios').update({ activo: false }).eq('id', usuarioId);
  if (error) throw new AppError('No se pudo desactivar el usuario.', 500, error.message);
  return { ok: true };
}

// Borra al empleado de verdad (tabla `usuarios` Y su cuenta de Supabase
// Auth), liberando el correo para poder reutilizarlo. Solo funciona si
// esa persona NUNCA tomó un pedido, abrió una caja, etc. — la base de
// datos lo protege con una llave foránea. Si ya tiene historial, avisamos
// claramente y sugerimos desactivar en vez de borrar.
export async function eliminarUsuarioPermanente(usuarioId) {
  const { error } = await supabaseAdmin.from('usuarios').delete().eq('id', usuarioId);
  if (error) {
    if (error.code === '23503') {
      throw new AppError(
        'Este empleado ya tiene pedidos, caja u otra actividad registrada, así que no se puede eliminar sin perder ese historial. Desactívalo en su lugar.',
        409
      );
    }
    throw new AppError('No se pudo eliminar el usuario.', 500, error.message);
  }

  // El perfil ya se borró bien — ahora liberamos también la cuenta de
  // Auth para que el correo quede disponible de nuevo. Si esto falla,
  // no es grave: crearEmpleado() ya sabe reutilizar cuentas huérfanas.
  await supabaseAdmin.auth.admin.deleteUser(usuarioId).catch(() => {});

  return { ok: true };
}

// El admin del negocio (o super_admin) le pone una contraseña nueva a un
// empleado sin necesitar la vieja — es el "olvidé mi contraseña" de bajo
// costo mientras no tengamos envío de correos configurado.
export async function resetearPassword(usuarioId, nuevaPassword) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, { password: nuevaPassword });
  if (error) throw new AppError('No se pudo cambiar la contraseña.', 500, error.message);
  return { ok: true };
}
