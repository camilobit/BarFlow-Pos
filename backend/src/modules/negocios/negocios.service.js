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

const CONFIGURACION_POR_DEFECTO = {
  modo_mesas: 'libre',
  // Muchos negocios trasladan al cliente el costo que les cobra el
  // datáfono por pagos con tarjeta. Apagado por defecto — el admin lo
  // activa y elige si es un % de la venta o un monto fijo por transacción.
  recargo_tarjeta: { activo: false, tipo: 'porcentaje', valor: 0 },
  // El "día operativo" de un bar no coincide con el día del calendario:
  // un sábado en la noche sigue siendo "sábado" hasta que cierra en la
  // madrugada del domingo. Con esta ventana, filtrar por "sábado" trae
  // todo lo vendido entre las 6pm del sábado y las 8am del domingo, en
  // vez de cortarse a la medianoche.
  turno_inicio: '18:00',
  turno_fin: '08:00',
};

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

// Limpia todos los pedidos/caja de prueba de un negocio SIN tocar
// productos, inventario, categorías, barras ni personal. Pensado para que
// un dueño que estuvo probando la plataforma pueda arrancar en limpio
// antes de operar de verdad, sin tener que recrear su catálogo.
export async function limpiarPedidosYCaja(negocioId, { reiniciarClientes = false } = {}) {
  const { count: countMovimientos, error: e1 } = await supabaseAdmin
    .from('movimientos_caja')
    .delete({ count: 'exact' })
    .eq('negocio_id', negocioId);
  if (e1) throw new AppError('No se pudieron borrar los movimientos de caja.', 500, e1.message);

  const { count: countCajas, error: e2 } = await supabaseAdmin
    .from('cajas')
    .delete({ count: 'exact' })
    .eq('negocio_id', negocioId);
  if (e2) throw new AppError('No se pudieron borrar las cajas.', 500, e2.message);

  // Al borrar pedidos, pedido_items se borra solo (ON DELETE CASCADE)
  const { count: countPedidos, error: e3 } = await supabaseAdmin
    .from('pedidos')
    .delete({ count: 'exact' })
    .eq('negocio_id', negocioId);
  if (e3) throw new AppError('No se pudieron borrar los pedidos.', 500, e3.message);

  await supabaseAdmin.from('mesas').update({ estado: 'libre' }).eq('negocio_id', negocioId);
  await supabaseAdmin.from('notificaciones').delete().eq('negocio_id', negocioId);

  if (reiniciarClientes) {
    await supabaseAdmin
      .from('clientes')
      .update({ visitas: 0, consumo_total: 0, puntos: 0, ultima_visita: null })
      .eq('negocio_id', negocioId);
  }

  return {
    pedidosBorrados: countPedidos || 0,
    cajasBorradas: countCajas || 0,
    movimientosBorrados: countMovimientos || 0,
    clientesReiniciados: reiniciarClientes,
  };
}
