import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

export async function listarBarras(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('barras')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('orden');
  if (error) throw new AppError('No se pudieron listar las barras.', 500, error.message);
  return data;
}

export async function crearBarra(negocioId, payload) {
  const { data, error } = await supabaseAdmin
    .from('barras')
    .insert({ ...payload, negocio_id: negocioId })
    .select()
    .single();
  if (error) throw new AppError('No se pudo crear la barra.', 500, error.message);
  return data;
}

export async function actualizarBarra(barraId, payload) {
  const { data, error } = await supabaseAdmin.from('barras').update(payload).eq('id', barraId).select().single();
  if (error) throw new AppError('No se pudo actualizar la barra.', 500, error.message);
  return data;
}

// Solo se puede borrar de verdad una barra que nunca tuvo pedidos (la base
// de datos lo protege con una restricción de llave foránea). Si ya tiene
// historial, sugerimos desactivarla en vez de borrarla.
export async function eliminarBarra(barraId) {
  const { error } = await supabaseAdmin.from('barras').delete().eq('id', barraId);
  if (error) {
    if (error.code === '23503') {
      throw new AppError(
        'Esta barra ya tiene pedidos o productos asociados, así que no se puede eliminar sin perder ese historial. Desactívala en su lugar.',
        409
      );
    }
    throw new AppError('No se pudo eliminar la barra.', 500, error.message);
  }
  return { ok: true };
}
