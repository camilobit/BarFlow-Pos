import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

export async function listarUsuarios(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellido, email, rol, activo, avatar_url, created_at')
    .eq('negocio_id', negocioId)
    .order('nombre');
  if (error) throw new AppError('No se pudieron listar los usuarios.', 500, error.message);
  return data;
}

/**
 * Crea un empleado: primero en Supabase Auth, luego su perfil en `usuarios`.
 * Si falla el segundo paso, revierte el usuario de Auth para no dejar huérfanos.
 */
export async function crearEmpleado({ negocioId, email, password, nombre, apellido, rol, pin }) {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw new AppError('No se pudo crear el usuario de autenticación.', 500, authError.message);

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('usuarios')
    .insert({
      id: authData.user.id,
      negocio_id: negocioId,
      rol,
      nombre,
      apellido: apellido || null,
      email,
      pin: pin || null,
    })
    .select()
    .single();

  if (perfilError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new AppError('No se pudo crear el perfil del usuario.', 500, perfilError.message);
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
