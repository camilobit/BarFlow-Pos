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
