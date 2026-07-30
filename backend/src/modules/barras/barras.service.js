import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';
import { itemsPorBarraParaEstadisticas } from '../pedidos/pedidos.service.js';

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

// Métricas propias de una barra: cuánto llegó por mesero vs. cuánto se
// vendió directo en barra, ventas, ticket promedio, productos más
// vendidos, tiempo de despacho y pedidos pendientes/entregados.
export async function estadisticasBarra(negocioId, barraId, { desde, hasta } = {}) {
  const items = await itemsPorBarraParaEstadisticas(negocioId, barraId, { desde, hasta });

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const pedidosVistos = new Set();
  const pedidosMeseroSet = new Set();
  const pedidosBarraSet = new Set();
  let ventasTotales = 0;
  let ventasHoy = 0;
  let pedidosPagadosCount = 0;
  let pendientes = 0;
  let entregados = 0;
  let sumaTiemposDespachoMs = 0;
  let countTiemposDespacho = 0;
  const productos = {};

  for (const item of items) {
    const pedido = item.pedido;
    if (!pedido) continue;

    if (!pedidosVistos.has(pedido.id)) {
      pedidosVistos.add(pedido.id);
      if (pedido.origen === 'barra') pedidosBarraSet.add(pedido.id);
      else pedidosMeseroSet.add(pedido.id);
    }

    if (item.estado === 'entregado') entregados += 1;
    else pendientes += 1;

    if (item.estado === 'entregado') {
      const inicio = new Date(item.created_at).getTime();
      const fin = new Date(item.updated_at).getTime();
      if (fin > inicio) {
        sumaTiemposDespachoMs += fin - inicio;
        countTiemposDespacho += 1;
      }
    }

    if (pedido.estado === 'pagado') {
      const ingresoItem = Number(item.cantidad) * Number(item.precio_unitario);
      ventasTotales += ingresoItem;
      if (pedido.cerrado_at && new Date(pedido.cerrado_at) >= inicioHoy) ventasHoy += ingresoItem;

      if (!productos[item.producto_id]) {
        productos[item.producto_id] = { nombre: item.producto?.nombre || 'Producto', unidades: 0, ingresos: 0 };
      }
      productos[item.producto_id].unidades += Number(item.cantidad);
      productos[item.producto_id].ingresos += ingresoItem;
    }
  }

  // Ticket promedio: sobre pedidos pagados que tuvieron al menos un ítem de esta barra
  const pedidosPagadosIds = new Set();
  for (const item of items) {
    if (item.pedido?.estado === 'pagado') pedidosPagadosIds.add(item.pedido.id);
  }
  pedidosPagadosCount = pedidosPagadosIds.size;

  const productosMasVendidos = Object.values(productos)
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 10);

  return {
    pedidosDesdeMesero: pedidosMeseroSet.size,
    pedidosDesdeBarra: pedidosBarraSet.size,
    totalPedidos: pedidosVistos.size,
    ventasTotales,
    ventasHoy,
    ticketPromedio: pedidosPagadosCount ? ventasTotales / pedidosPagadosCount : 0,
    pedidosPendientes: pendientes,
    pedidosEntregados: entregados,
    tiempoPromedioDespachoMinutos: countTiemposDespacho ? Math.round(sumaTiemposDespachoMs / countTiemposDespacho / 60000) : 0,
    productosMasVendidos,
  };
}
