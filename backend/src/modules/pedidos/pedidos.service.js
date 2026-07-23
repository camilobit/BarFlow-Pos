import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

const SELECT_PEDIDO_COMPLETO = `
  *,
  mesa:mesas(id, nombre, zona),
  mesero:usuarios!pedidos_mesero_id_fkey(id, nombre, apellido),
  cliente:clientes(id, nombre, apellido),
  barra_pago:barras!pedidos_barra_id_fkey(id, nombre),
  items:pedido_items(
    id, cantidad, precio_unitario, observaciones, estado, producto_id, barra_id,
    producto:productos(id, nombre, imagen_url)
  )
`;

export async function crearPedido({ negocioId, meseroId, mesaId, clienteId, observaciones, items }) {
  // 1) Crear el pedido base
  const { data: pedido, error: errorPedido } = await supabaseAdmin
    .from('pedidos')
    .insert({
      negocio_id: negocioId,
      mesero_id: meseroId,
      mesa_id: mesaId || null,
      cliente_id: clienteId || null,
      observaciones: observaciones || null,
      estado: 'pendiente',
    })
    .select()
    .single();

  if (errorPedido) throw new AppError('No se pudo crear el pedido.', 500, errorPedido.message);

  // 2) Insertar items (los triggers de DB calculan barra_id, precio y totales)
  const filasItems = items.map((it) => ({
    pedido_id: pedido.id,
    producto_id: it.producto_id,
    cantidad: it.cantidad,
    observaciones: it.observaciones || null,
  }));

  const { error: errorItems } = await supabaseAdmin.from('pedido_items').insert(filasItems);
  if (errorItems) {
    await supabaseAdmin.from('pedidos').delete().eq('id', pedido.id);
    throw new AppError('No se pudieron agregar los productos al pedido.', 500, errorItems.message);
  }

  // 3) Ocupar la mesa si aplica
  if (mesaId) {
    await supabaseAdmin.from('mesas').update({ estado: 'ocupada' }).eq('id', mesaId);
  }

  return obtenerPedidoPorId(pedido.id);
}

export async function obtenerPedidoPorId(pedidoId) {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select(SELECT_PEDIDO_COMPLETO)
    .eq('id', pedidoId)
    .single();
  if (error) throw new AppError('Pedido no encontrado.', 404, error.message);
  return data;
}

export async function listarPedidos({ negocioId, estado, mesaId, meseroId, desde, hasta }) {
  let query = supabaseAdmin
    .from('pedidos')
    .select(SELECT_PEDIDO_COMPLETO)
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false });

  if (estado) query = query.eq('estado', estado);
  if (mesaId) query = query.eq('mesa_id', mesaId);
  if (meseroId) query = query.eq('mesero_id', meseroId);
  if (desde) query = query.gte('created_at', desde);
  if (hasta) query = query.lte('created_at', hasta);

  const { data, error } = await query;
  if (error) throw new AppError('No se pudieron listar los pedidos.', 500, error.message);
  return data;
}

export async function agregarItems(pedidoId, items) {
  const filas = items.map((it) => ({
    pedido_id: pedidoId,
    producto_id: it.producto_id,
    cantidad: it.cantidad,
    observaciones: it.observaciones || null,
  }));
  const { error } = await supabaseAdmin.from('pedido_items').insert(filas);
  if (error) throw new AppError('No se pudieron agregar los productos.', 500, error.message);
  return obtenerPedidoPorId(pedidoId);
}

export async function quitarItem(pedidoId, itemId) {
  const { error } = await supabaseAdmin.from('pedido_items').delete().eq('id', itemId).eq('pedido_id', pedidoId);
  if (error) throw new AppError('No se pudo quitar el producto.', 500, error.message);
  return obtenerPedidoPorId(pedidoId);
}

export async function actualizarEstadoItem(itemId, estado) {
  const { data, error } = await supabaseAdmin
    .from('pedido_items')
    .update({ estado })
    .eq('id', itemId)
    .select('pedido_id')
    .single();
  if (error) throw new AppError('No se pudo actualizar el estado del producto.', 500, error.message);

  // Si todos los items del pedido están 'listo' o superior, marcar pedido como 'listo'
  await sincronizarEstadoPedido(data.pedido_id);
  return obtenerPedidoPorId(data.pedido_id);
}

async function sincronizarEstadoPedido(pedidoId) {
  const { data: items } = await supabaseAdmin
    .from('pedido_items')
    .select('estado')
    .eq('pedido_id', pedidoId)
    .neq('estado', 'cancelado');

  if (!items || items.length === 0) return;

  const estados = items.map((i) => i.estado);
  let nuevoEstado = null;

  if (estados.every((e) => e === 'entregado')) nuevoEstado = 'entregado';
  else if (estados.every((e) => e === 'listo' || e === 'entregado')) nuevoEstado = 'listo';
  else if (estados.some((e) => e === 'preparando')) nuevoEstado = 'preparando';

  if (nuevoEstado) {
    await supabaseAdmin
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId)
      .in('estado', ['pendiente', 'preparando', 'listo']);
  }
}

export async function cambiarMesaPedido(pedidoId, mesaId) {
  const { error } = await supabaseAdmin.from('pedidos').update({ mesa_id: mesaId }).eq('id', pedidoId);
  if (error) throw new AppError('No se pudo cambiar la mesa.', 500, error.message);
  await supabaseAdmin.from('mesas').update({ estado: 'ocupada' }).eq('id', mesaId);
  return obtenerPedidoPorId(pedidoId);
}

export async function combinarMesas(mesaPrincipalId, mesasSecundariasIds) {
  // Mueve todos los pedidos abiertos de las mesas secundarias a la principal
  const { error } = await supabaseAdmin
    .from('pedidos')
    .update({ mesa_id: mesaPrincipalId })
    .in('mesa_id', mesasSecundariasIds)
    .not('estado', 'in', '(pagado,cancelado)');
  if (error) throw new AppError('No se pudieron combinar las mesas.', 500, error.message);

  await supabaseAdmin.from('mesas').update({ estado: 'limpieza' }).in('id', mesasSecundariasIds);
  await supabaseAdmin
    .from('mesas')
    .update({ mesa_combinada_con: mesasSecundariasIds })
    .eq('id', mesaPrincipalId);

  return { ok: true };
}

export async function cerrarCuenta(pedidoId, { metodoPago, propina, descuento, barraId }) {
  // El dinero (o comprobante de Nequi) siempre lo recibe una barra/caja
  // física concreta — sin caja abierta en esa barra no hay dónde
  // registrar el cobro, así que lo bloqueamos con un mensaje claro en
  // vez de dejar que el trigger de la base de datos lo pierda en silencio.
  const { data: pedidoActual, error: errorPedido } = await supabaseAdmin
    .from('pedidos')
    .select('negocio_id')
    .eq('id', pedidoId)
    .single();
  if (errorPedido) throw new AppError('Pedido no encontrado.', 404, errorPedido.message);

  let cajaQuery = supabaseAdmin
    .from('cajas')
    .select('id')
    .eq('negocio_id', pedidoActual.negocio_id)
    .is('cerrada_at', null);
  cajaQuery = barraId ? cajaQuery.eq('barra_id', barraId) : cajaQuery.is('barra_id', null);
  const { data: cajaAbierta } = await cajaQuery.maybeSingle();

  if (!cajaAbierta) {
    throw new AppError('No hay una caja abierta en esa barra. Pide al cajero que la abra antes de cobrar.', 409);
  }

  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .update({ metodo_pago: metodoPago, propina, descuento, barra_id: barraId || null, estado: 'pagado' })
    .eq('id', pedidoId)
    .select()
    .single();
  if (error) throw new AppError('No se pudo cerrar la cuenta.', 500, error.message);
  return obtenerPedidoPorId(data.id);
}

// El cajero de la barra confirma que ya recibió físicamente el efectivo
// o el comprobante de transferencia que le llevó el mesero.
export async function verificarPago(pedidoId, usuarioId) {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .update({ pago_verificado: true, verificado_por: usuarioId, verificado_at: new Date().toISOString() })
    .eq('id', pedidoId)
    .eq('estado', 'pagado')
    .select()
    .single();
  if (error) throw new AppError('No se pudo confirmar el pago.', 500, error.message);
  return obtenerPedidoPorId(data.id);
}

// Pagos ya cobrados por el mesero pero que el cajero todavía no ha
// confirmado que recibió — para la pantalla de la barra.
export async function pagosPorVerificar(negocioId, barraId) {
  let query = supabaseAdmin
    .from('pedidos')
    .select(SELECT_PEDIDO_COMPLETO)
    .eq('negocio_id', negocioId)
    .eq('estado', 'pagado')
    .eq('pago_verificado', false)
    .order('cerrado_at', { ascending: true });
  if (barraId) query = query.eq('barra_id', barraId);
  const { data, error } = await query;
  if (error) throw new AppError('No se pudieron obtener los pagos por verificar.', 500, error.message);
  return data;
}

export async function dividirCuenta(pedidoId, gruposDeItemIds) {
  const pedidoOriginal = await obtenerPedidoPorId(pedidoId);

  const nuevosPedidos = [];
  for (const grupoIds of gruposDeItemIds) {
    const { data: nuevoPedido, error } = await supabaseAdmin
      .from('pedidos')
      .insert({
        negocio_id: pedidoOriginal.negocio_id,
        mesero_id: pedidoOriginal.mesero_id,
        mesa_id: pedidoOriginal.mesa_id,
        cliente_id: pedidoOriginal.cliente_id,
        estado: 'listo',
      })
      .select()
      .single();
    if (error) throw new AppError('No se pudo dividir la cuenta.', 500, error.message);

    await supabaseAdmin.from('pedido_items').update({ pedido_id: nuevoPedido.id }).in('id', grupoIds);
    nuevosPedidos.push(await obtenerPedidoPorId(nuevoPedido.id));
  }

  // Si ya no quedan items en el pedido original, cancelarlo
  const { data: itemsRestantes } = await supabaseAdmin
    .from('pedido_items')
    .select('id')
    .eq('pedido_id', pedidoId);
  if (!itemsRestantes || itemsRestantes.length === 0) {
    await supabaseAdmin.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedidoId);
  }

  return nuevosPedidos;
}

export async function historialPorMesa(mesaId) {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select(SELECT_PEDIDO_COMPLETO)
    .eq('mesa_id', mesaId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new AppError('No se pudo obtener el historial de la mesa.', 500, error.message);
  return data;
}

export async function pedidosPorBarra(negocioId, barraId) {
  const { data, error } = await supabaseAdmin
    .from('pedido_items')
    .select(`
      id, cantidad, observaciones, estado, created_at,
      producto:productos(nombre),
      pedido:pedidos!inner(id, negocio_id, estado, created_at, mesa:mesas(nombre), mesero:usuarios!pedidos_mesero_id_fkey(nombre))
    `)
    .eq('barra_id', barraId)
    .eq('pedido.negocio_id', negocioId)
    .in('estado', ['pendiente', 'preparando', 'listo'])
    .order('created_at', { ascending: true });

  if (error) throw new AppError('No se pudieron obtener los pedidos de la barra.', 500, error.message);
  return data;
}
