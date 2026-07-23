import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

export async function listarNegocios() {
  const { data, error } = await supabaseAdmin.from('negocios').select('*').order('created_at', { ascending: false });
  if (error) throw new AppError('No se pudieron listar los negocios.', 500, error.message);
  return data;
}

export async function crearNegocio(payload) {
  const { data, error } = await supabaseAdmin.from('negocios').insert(payload).select().single();
  if (error) throw new AppError('No se pudo crear el negocio.', 500, error.message);

  // Barra principal por defecto
  await supabaseAdmin.from('barras').insert({ negocio_id: data.id, nombre: 'Barra Principal', orden: 1 });

  return data;
}

export async function actualizarNegocio(negocioId, payload) {
  const { data, error } = await supabaseAdmin.from('negocios').update(payload).eq('id', negocioId).select().single();
  if (error) throw new AppError('No se pudo actualizar el negocio.', 500, error.message);
  return data;
}

export async function cambiarEstadoNegocio(negocioId, estado) {
  const { data, error } = await supabaseAdmin.from('negocios').update({ estado }).eq('id', negocioId).select().single();
  if (error) throw new AppError('No se pudo cambiar el estado del negocio.', 500, error.message);
  return data;
}

export async function estadisticasGlobales() {
  const { data: negocios, error: e1 } = await supabaseAdmin.from('negocios').select('id, estado');
  if (e1) throw new AppError('No se pudieron obtener estadísticas.', 500, e1.message);

  const { data: pedidos, error: e2 } = await supabaseAdmin
    .from('pedidos')
    .select('total, negocio_id')
    .eq('estado', 'pagado');
  if (e2) throw new AppError('No se pudieron obtener estadísticas.', 500, e2.message);

  const ingresosPorNegocio = {};
  let ingresosTotales = 0;
  for (const p of pedidos) {
    ingresosPorNegocio[p.negocio_id] = (ingresosPorNegocio[p.negocio_id] || 0) + Number(p.total);
    ingresosTotales += Number(p.total);
  }

  return {
    totalNegocios: negocios.length,
    negociosActivos: negocios.filter((n) => n.estado === 'activo').length,
    negociosSuspendidos: negocios.filter((n) => n.estado === 'suspendido').length,
    ingresosTotales,
    ingresosPorNegocio,
  };
}
