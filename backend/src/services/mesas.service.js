import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

export async function listarMesas(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('mesas')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('zona')
    .order('nombre');
  if (error) throw new AppError('No se pudieron listar las mesas.', 500, error.message);
  return data;
}

export async function crearMesa(negocioId, payload) {
  const { data, error } = await supabaseAdmin
    .from('mesas')
    .insert({ ...payload, negocio_id: negocioId })
    .select()
    .single();
  if (error) throw new AppError('No se pudo crear la mesa.', 500, error.message);
  return data;
}

export async function actualizarMesa(mesaId, payload) {
  const { data, error } = await supabaseAdmin.from('mesas').update(payload).eq('id', mesaId).select().single();
  if (error) throw new AppError('No se pudo actualizar la mesa.', 500, error.message);
  return data;
}

export async function eliminarMesa(mesaId) {
  const { error } = await supabaseAdmin.from('mesas').delete().eq('id', mesaId);
  if (error) throw new AppError('No se pudo eliminar la mesa.', 500, error.message);
  return { ok: true };
}
