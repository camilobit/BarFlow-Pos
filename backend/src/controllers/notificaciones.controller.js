import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

export const listar = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('notificaciones')
    .select('*')
    .eq('negocio_id', req.usuario.negocio_id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new AppError('No se pudieron obtener las notificaciones.', 500, error.message);
  res.json(data);
});

export const marcarLeida = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin.from('notificaciones').update({ leida: true }).eq('id', req.params.id);
  if (error) throw new AppError('No se pudo actualizar la notificación.', 500, error.message);
  res.status(204).send();
});

export const marcarTodasLeidas = asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from('notificaciones')
    .update({ leida: true })
    .eq('negocio_id', req.usuario.negocio_id)
    .eq('leida', false);
  if (error) throw new AppError('No se pudieron actualizar las notificaciones.', 500, error.message);
  res.status(204).send();
});
