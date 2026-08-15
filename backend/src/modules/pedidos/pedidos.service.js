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

export async function crearPedido({ negocioId, meseroId, mesaId, referenciaMesa, clienteId, observaciones, items, origen, barraDestinoId }) {
  // 1) Crear el pedido base
  const { data: pedido, error: errorPedido } = await supabaseAdmin
    .from('pedidos')
    .insert({
      negocio_id: negocioId,
      mesero_id: meseroId,
      mesa_id: mesaId || null,
      referencia_mesa: referenciaMesa || null,
      cliente_id: clienteId || null,
      observaciones: observaciones || null,
      origen: origen === 'barra' ? 'barra' : 'mesero',
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

  // 2.1) La barra que el mesero eligió al enviar el pedido rellena SOLO
  // los productos que no tenían una barra fija asignada en su ficha — un
  // trago exclusivo de una barra específica sigue respetando esa
  // asignación aunque el mesero haya elegido otra barra por defecto.
  if (barraDestinoId) {
    await supabaseAdmin.from('pedido_items').update({ barra_id: barraDestinoId }).eq('pedido_id', pedido.id).is('barra_id', null);
  }

  // 3) Ocupar la mesa si aplica
  if (mesaId) {
    await supabaseAdmin.from('mesas').update({ estado: 'ocupada' }).eq('id', mesaId);
  }

  // 4) Pedido NATIVO de barra (cliente que llega directo al mostrador, sin
  //    mesero): no pasa por "preparación" como un pedido de mesa — quien
  //    lo crea es quien lo está sirviendo en el momento. Avanzamos los
  //    ítems automáticamente para que el flujo quede en: crear pedido →
  //    escoger productos → cobrar, sin un paso de "alistar" de por medio.
  if (pedido.origen === 'barra') {
    await marcarItemsComoServidos(pedido.id);
  }

  return obtenerPedidoPorId(pedido.id);
}

// Pasa TODOS los ítems de un pedido a 'entregado', pasando primero por
// 'preparando' (en el mismo paso) para que el trigger de la base de datos
// que descuenta inventario se dispare igual que en el flujo normal — solo
// que aquí ocurre de una vez, sin que nadie tenga que darle clic manual.
async function marcarItemsComoServidos(pedidoId) {
  await supabaseAdmin.from('pedido_items').update({ estado: 'preparando' }).eq('pedido_id', pedidoId);
  await supabaseAdmin.from('pedido_items').update({ estado: 'entregado' }).eq('pedido_id', pedidoId);
  await sincronizarEstadoPedido(pedidoId);
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

export async function listarPedidos({ negocioId, estado, mesaId, meseroId, origen, barraId, desde, hasta }) {
  let query = supabaseAdmin
    .from('pedidos')
    .select(SELECT_PEDIDO_COMPLETO)
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false });

  if (estado) query = query.eq('estado', estado);
  if (mesaId) query = query.eq('mesa_id', mesaId);
  if (meseroId) query = query.eq('mesero_id', meseroId);
  if (origen) query = query.eq('origen', origen);
  if (barraId) query = query.eq('barra_id', barraId);
  if (desde) query = query.gte('created_at', desde);
  if (hasta) query = query.lte('created_at', hasta);

  const { data, error } = await query;
  if (error) throw new AppError('No se pudieron listar los pedidos.', 500, error.message);
  return data;
}

export async function agregarItems(pedidoId, items, barraDestinoId) {
  const filas = items.map((it) => ({
    pedido_id: pedidoId,
    producto_id: it.producto_id,
    cantidad: it.cantidad,
    observaciones: it.observaciones || null,
  }));
  const { error } = await supabaseAdmin.from('pedido_items').insert(filas);
  if (error) throw new AppError('No se pudieron agregar los productos.', 500, error.message);

  if (barraDestinoId) {
    await supabaseAdmin.from('pedido_items').update({ barra_id: barraDestinoId }).eq('pedido_id', pedidoId).is('barra_id', null);
  }

  // Si es un pedido nativo de barra, los ítems nuevos (ej. el cliente pidió
  // una ronda más) también se sirven de una vez, igual que los primeros.
  const { data: pedidoActual } = await supabaseAdmin.from('pedidos').select('origen').eq('id', pedidoId).single();
  if (pedidoActual?.origen === 'barra') {
    await marcarItemsComoServidos(pedidoId);
  }

  return obtenerPedidoPorId(pedidoId);
}

export async function quitarItem(pedidoId, itemId) {
  // Un ítem ya entregado representa una venta real servida — no se puede
  // borrar sin más (evita perder historial de inventario ya descontado).
  // Antes de entregarse (pendiente/preparando/listo) sí se puede quitar o
  // cancelar por completo: por error del mesero, o porque la barra quiere
  // limpiar un pedido muerto/duplicado que nunca se llegó a despachar.
  const { data: item } = await supabaseAdmin.from('pedido_items').select('estado').eq('id', itemId).single();
  if (item?.estado === 'entregado') {
    throw new AppError('Este producto ya fue entregado, no se puede eliminar. Si ya se cobró, es una venta real.', 409);
  }

  const { error } = await supabaseAdmin.from('pedido_items').delete().eq('id', itemId).eq('pedido_id', pedidoId);
  if (error) throw new AppError('No se pudo quitar el producto.', 500, error.message);
  return obtenerPedidoPorId(pedidoId);
}

// Anula el pedido COMPLETO — incluso después de despachado (ej. el
// cliente devuelve todo antes de pagar). Ya no se puede modificar
// producto por producto en ese punto, pero sí se puede anular entero.
// Cualquier ítem que ya haya descontado inventario (preparando/listo/
// entregado) se devuelve a la barra correspondiente, para que el
// inventario quede exacto como si nunca se hubiera preparado.
// Cancela SOLO los productos de la barra que hace la acción, y SOLO los
// que aún no se han entregado — nunca toca productos de otra barra, ni
// productos que ya se sirvieron (eso sería borrar una venta real, un
// hueco de seguridad que ya existía y quedó cerrado aquí). Cada barra
// puede resolver su propia parte del pedido sin depender del admin; si
// dos barras están involucradas, cada una anula lo suyo por separado.
export async function anularPedido(pedidoId, barraId) {
  const { data: pedido, error: errorPedido } = await supabaseAdmin
    .from('pedidos')
    .select('id, estado, mesa_id')
    .eq('id', pedidoId)
    .single();
  if (errorPedido || !pedido) throw new AppError('Pedido no encontrado.', 404);
  if (['pagado', 'cancelado'].includes(pedido.estado)) {
    throw new AppError('Este pedido ya fue cobrado o ya está cancelado — no se puede anular desde aquí.', 409);
  }

  const { data: itemsDeLaBarra } = await supabaseAdmin
    .from('pedido_items')
    .select('id, producto_id, cantidad, estado')
    .eq('pedido_id', pedidoId)
    .eq('barra_id', barraId)
    .neq('estado', 'cancelado');

  if (!itemsDeLaBarra || itemsDeLaBarra.length === 0) {
    throw new AppError('Tu barra no tiene productos activos en este pedido.', 404);
  }

  const cancelables = itemsDeLaBarra.filter((i) => i.estado !== 'entregado');
  if (cancelables.length === 0) {
    throw new AppError('Todos los productos de tu barra en este pedido ya fueron entregados — no se pueden anular, ya son una venta real.', 409);
  }

  for (const item of cancelables) {
    // Si nunca pasó por "preparando", nunca se descontó inventario —
    // nada que devolver.
    if (!['preparando', 'listo'].includes(item.estado)) continue;

    const { data: receta } = await supabaseAdmin
      .from('producto_insumos')
      .select('insumo_id, cantidad')
      .eq('producto_id', item.producto_id);

    for (const ingrediente of receta || []) {
      const cantidadADevolver = Number(ingrediente.cantidad) * Number(item.cantidad);
      const { data: stockActual } = await supabaseAdmin
        .from('insumo_stock_barra')
        .select('id, stock')
        .eq('insumo_id', ingrediente.insumo_id)
        .eq('barra_id', barraId)
        .maybeSingle();
      if (stockActual) {
        await supabaseAdmin
          .from('insumo_stock_barra')
          .update({ stock: Number(stockActual.stock) + cantidadADevolver })
          .eq('id', stockActual.id);
      }
    }
  }

  await supabaseAdmin
    .from('pedido_items')
    .update({ estado: 'cancelado' })
    .in('id', cancelables.map((i) => i.id));

  // Recalcula el estado del pedido con lo que queda: si TODO terminó
  // cancelado (incluyendo lo de otras barras), el pedido se cancela y
  // libera la mesa; si queda algo entregado o en curso, el pedido sigue
  // vivo con lo que sí se puede cobrar.
  const { data: itemsRestantes } = await supabaseAdmin
    .from('pedido_items')
    .select('estado')
    .eq('pedido_id', pedidoId)
    .neq('estado', 'cancelado');

  if (!itemsRestantes || itemsRestantes.length === 0) {
    await supabaseAdmin.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedidoId);
    if (pedido.mesa_id) {
      await supabaseAdmin.from('mesas').update({ estado: 'libre' }).eq('id', pedido.mesa_id);
    }
  } else {
    await sincronizarEstadoPedido(pedidoId);
  }

  return { ok: true, productosAnulados: cancelables.length };
}

const ORDEN_ESTADO = { pendiente: 0, preparando: 1, listo: 2, entregado: 3 };
const SIGUIENTE_ESTADO_ITEM = { pendiente: 'preparando', preparando: 'listo', listo: 'entregado' };

// Un solo botón para TODOS los productos que le corresponden a una barra
// dentro de un pedido — en vez de un botón por producto. Si el grupo está
// parejo (lo normal), los mueve a todos juntos al siguiente estado. Si
// quedó mezclado (ej. se agregó un producto nuevo mientras otro ya iba
// más adelante), avanza primero a los que van más atrás, para que un
// segundo clic termine de emparejar al resto.
export async function avanzarEstadoPorBarra(pedidoId, barraId) {
  const { data: items, error } = await supabaseAdmin
    .from('pedido_items')
    .select('id, estado')
    .eq('pedido_id', pedidoId)
    .eq('barra_id', barraId)
    .neq('estado', 'cancelado');
  if (error) throw new AppError('No se pudo leer el pedido.', 500, error.message);

  const activos = (items || []).filter((i) => i.estado !== 'entregado');
  if (activos.length === 0) {
    throw new AppError('Los productos de tu barra en este pedido ya están entregados.', 409);
  }

  const estadoMenosAvanzado = activos.reduce(
    (min, i) => (ORDEN_ESTADO[i.estado] < ORDEN_ESTADO[min] ? i.estado : min),
    activos[0].estado
  );
  const siguiente = SIGUIENTE_ESTADO_ITEM[estadoMenosAvanzado];
  const idsAAvanzar = activos.filter((i) => i.estado === estadoMenosAvanzado).map((i) => i.id);

  const { error: errorUpdate } = await supabaseAdmin.from('pedido_items').update({ estado: siguiente }).in('id', idsAAvanzar);
  if (errorUpdate) throw new AppError('No se pudo actualizar el pedido.', 500, errorUpdate.message);

  await sincronizarEstadoPedido(pedidoId);
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
    .select('negocio_id, subtotal')
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

  // IMPORTANTE: el total se recalcula aquí mismo, en el mismo momento en
  // que se guarda el descuento/propina. Antes, `total` solo se
  // actualizaba automáticamente cuando cambiaban los PRODUCTOS del
  // pedido (por un trigger en pedido_items) — pero nada recalculaba el
  // total cuando el descuento se aplicaba directamente al cerrar la
  // cuenta, así que el pedido quedaba marcado como pagado con el precio
  // de lista completo, ignorando el descuento, y ese era el monto que
  // terminaba registrado en caja.
  const totalConDescuento = Number(pedidoActual.subtotal) - Number(descuento || 0) + Number(propina || 0);

  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .update({
      metodo_pago: metodoPago,
      propina,
      descuento,
      total: totalConDescuento,
      barra_id: barraId || null,
      estado: 'pagado',
    })
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
        origen: pedidoOriginal.origen,
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

// Trae los pedidos "vivos" de una barra: por preparar (pendiente/
// preparando/listo) Y también los ya entregados que todavía no se han
// cobrado (para poder anular el pedido completo si el cliente lo
// devuelve justo después de servirlo, antes de que el mesero cobre).
// Desaparecen de aquí solo cuando el pedido queda pagado o cancelado.
export async function pedidosPorBarra(negocioId, barraId) {
  const { data, error } = await supabaseAdmin
    .from('pedido_items')
    .select(`
      id, cantidad, observaciones, estado, created_at,
      producto:productos(nombre),
      pedido:pedidos!inner(id, negocio_id, estado, created_at, origen, mesa:mesas(nombre), mesero:usuarios!pedidos_mesero_id_fkey(nombre))
    `)
    .eq('barra_id', barraId)
    .eq('pedido.negocio_id', negocioId)
    .not('pedido.estado', 'in', '(pagado,cancelado)')
    .in('estado', ['pendiente', 'preparando', 'listo', 'entregado'])
    .order('created_at', { ascending: true });

  if (error) throw new AppError('No se pudieron obtener los pedidos de la barra.', 500, error.message);
  return data;
}

// Todos los ítems que ha despachado una barra (para sus propias
// estadísticas de rendimiento: origen, tiempo de despacho, productos).
export async function itemsPorBarraParaEstadisticas(negocioId, barraId, { desde, hasta } = {}) {
  let query = supabaseAdmin
    .from('pedido_items')
    .select(`
      id, cantidad, precio_unitario, estado, created_at, updated_at, producto_id,
      producto:productos(nombre),
      pedido:pedidos!inner(id, negocio_id, estado, origen, total, cerrado_at, created_at)
    `)
    .eq('barra_id', barraId)
    .eq('pedido.negocio_id', negocioId)
    .neq('estado', 'cancelado');

  if (desde) query = query.gte('created_at', desde);
  if (hasta) query = query.lte('created_at', hasta);

  const { data, error } = await query;
  if (error) throw new AppError('No se pudieron obtener las estadísticas de la barra.', 500, error.message);
  return data;
}
