import { supabaseAnon, supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

/**
 * Verifica el JWT de Supabase enviado como "Authorization: Bearer <token>"
 * y adjunta el perfil (tabla usuarios) a req.usuario.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new AppError('No autenticado. Falta el token de acceso.', 401);
    }

    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    if (error || !user) {
      throw new AppError('Token inválido o expirado.', 401);
    }

    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      throw new AppError('Usuario sin perfil asociado.', 403);
    }

    if (!perfil.activo) {
      throw new AppError('Este usuario ha sido desactivado.', 403);
    }

    req.usuario = perfil;
    req.authUserId = user.id;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restringe el acceso a una lista de roles.
 * Uso: router.get('/ruta', requireAuth, requireRole('admin_negocio', 'super_admin'), handler)
 */
export function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new AppError('No autenticado.', 401));
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new AppError('No tienes permiso para realizar esta acción.', 403));
    }
    next();
  };
}

/**
 * Garantiza que el recurso solicitado pertenece al negocio del usuario
 * autenticado, salvo que sea super_admin (que ve todo).
 * Espera que req.params.negocioId o req.body.negocio_id exista, o usa
 * automáticamente el negocio_id del usuario si no viene en la petición.
 */
export function scopeNegocio(req, res, next) {
  if (req.usuario.rol === 'super_admin') return next();

  const negocioSolicitado = req.params.negocioId || req.body.negocio_id || req.query.negocio_id;
  if (negocioSolicitado && negocioSolicitado !== req.usuario.negocio_id) {
    return next(new AppError('No tienes acceso a este negocio.', 403));
  }
  // Fuerza el negocio_id correcto en el body para creaciones/actualizaciones
  if (req.body && typeof req.body === 'object') {
    req.body.negocio_id = req.usuario.negocio_id;
  }
  next();
}
