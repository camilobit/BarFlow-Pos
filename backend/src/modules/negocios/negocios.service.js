import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

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

export async function marcarPago(negocioId, pagado, pagadoHasta) {
  const { data, error } = await supabaseAdmin
    .from('negocios')
    .update({ pagado, ...(pagadoHasta !== undefined && { pagado_hasta: pagadoHasta }) })
    .eq('id', negocioId)
    .select()
    .single();
  if (error) throw new AppError('No se pudo actualizar el estado de pago.', 500, error.message);
  return data;
}

// Elimina un negocio y TODOS sus datos (cascada: usuarios, pedidos,
// productos, caja, clientes...). Es irreversible — el frontend exige
// confirmación explícita antes de llamar esto.
export async function eliminarNegocio(negocioId) {
  const { error } = await supabaseAdmin.from('negocios').delete().eq('id', negocioId);
  if (error) throw new AppError('No se pudo eliminar el negocio.', 500, error.message);
  return { ok: true };
}

const CONFIGURACION_POR_DEFECTO = { modo_mesas: 'libre' };

// Lee la configuración operativa del negocio (ej. si usa plano de mesas
// fijo o pedidos libres). Si el negocio es nuevo y no tiene nada guardado
// todavía, responde con los valores por defecto en vez de null.
export async function obtenerConfiguracion(negocioId) {
  if (!negocioId) return CONFIGURACION_POR_DEFECTO;
  const { data, error } = await supabaseAdmin.from('negocios').select('configuracion').eq('id', negocioId).single();
  if (error) throw new AppError('No se pudo obtener la configuración del negocio.', 500, error.message);
  return { ...CONFIGURACION_POR_DEFECTO, ...(data.configuracion || {}) };
}

// Actualiza SOLO las claves enviadas, sin borrar el resto de la
// configuración que ya existía (merge, no reemplazo completo).
export async function actualizarConfiguracion(negocioId, cambios) {
  const actual = await obtenerConfiguracion(negocioId);
  const nueva = { ...actual, ...cambios };
  const { data, error } = await supabaseAdmin
    .from('negocios')
    .update({ configuracion: nueva })
    .eq('id', negocioId)
    .select('configuracion')
    .single();
  if (error) throw new AppError('No se pudo actualizar la configuración.', 500, error.message);
  return data.configuracion;
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
