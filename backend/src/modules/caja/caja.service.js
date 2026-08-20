import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

// barraId puede ser null: negocios con una sola caja general la usan así.
export async function obtenerCajaAbierta(negocioId, barraId = null) {
  let query = supabaseAdmin.from('cajas').select('*, barra:barras(id, nombre)').eq('negocio_id', negocioId).is('cerrada_at', null);
  query = barraId ? query.eq('barra_id', barraId) : query.is('barra_id', null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new AppError('No se pudo consultar la caja.', 500, error.message);
  return data;
}

// Todas las cajas abiertas del negocio en este momento (una por barra) — útil para el admin.
export async function listarCajasAbiertas(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('cajas')
    .select('*, barra:barras(id, nombre)')
    .eq('negocio_id', negocioId)
    .is('cerrada_at', null)
    .order('abierta_at');
  if (error) throw new AppError('No se pudieron listar las cajas abiertas.', 500, error.message);
  return data;
}

export async function abrirCaja(negocioId, barraId, usuarioId, montoInicial) {
  const abierta = await obtenerCajaAbierta(negocioId, barraId);
  if (abierta) throw new AppError('Ya existe una caja abierta para esta barra.', 409);

  const { data, error } = await supabaseAdmin
    .from('cajas')
    .insert({ negocio_id: negocioId, barra_id: barraId || null, abierta_por: usuarioId, monto_inicial: montoInicial })
    .select()
    .single();
  if (error) throw new AppError('No se pudo abrir la caja.', 500, error.message);

  // "Foto" automática del inventario al abrir — sin que nadie tenga que
  // hacer nada extra. Es la base contra la que se compara el cierre.
  if (barraId) {
    await guardarSnapshotInventario(negocioId, data.id, barraId, 'apertura');
  }

  return data;
}

async function guardarSnapshotInventario(negocioId, cajaId, barraId, tipo, conteoFisico = null) {
  const { data: stock, error } = await supabaseAdmin
    .from('insumo_stock_barra')
    .select('insumo_id, stock')
    .eq('barra_id', barraId);
  if (error || !stock) return;

  const mapaConteo = new Map((conteoFisico || []).map((c) => [c.insumo_id, c.cantidad_fisica]));

  const filas = stock.map((s) => ({
    negocio_id: negocioId,
    caja_id: cajaId,
    insumo_id: s.insumo_id,
    tipo,
    cantidad_sistema: s.stock,
    cantidad_fisica: mapaConteo.has(s.insumo_id) ? mapaConteo.get(s.insumo_id) : null,
  }));
  if (!filas.length) return;

  await supabaseAdmin.from('snapshots_inventario_caja').upsert(filas, { onConflict: 'caja_id,insumo_id,tipo' });
}

// Los insumos que le corresponden a esa barra, con el nombre y unidad —
// para que el cajero sepa exactamente qué contar al cerrar (solo lo
// suyo, no el catálogo completo del negocio).
export async function insumosParaConteo(barraId) {
  const { data, error } = await supabaseAdmin
    .from('insumo_stock_barra')
    .select('insumo_id, stock, insumo:insumos(id, nombre, unidad)')
    .eq('barra_id', barraId);
  if (error) throw new AppError('No se pudo obtener el inventario de la barra.', 500, error.message);
  return data;
}

export async function registrarMovimiento(negocioId, barraId, usuarioId, { tipo, monto, descripcion }) {
  const caja = await obtenerCajaAbierta(negocioId, barraId);
  if (!caja) throw new AppError('No hay una caja abierta para esta barra.', 409);

  const { data, error } = await supabaseAdmin
    .from('movimientos_caja')
    .insert({ caja_id: caja.id, negocio_id: negocioId, tipo, monto, descripcion, usuario_id: usuarioId })
    .select()
    .single();
  if (error) throw new AppError('No se pudo registrar el movimiento.', 500, error.message);
  return data;
}

export async function resumenCaja(cajaId) {
  const { data: movimientos, error } = await supabaseAdmin
    .from('movimientos_caja')
    .select('*')
    .eq('caja_id', cajaId)
    .order('created_at');
  if (error) throw new AppError('No se pudo obtener el resumen de caja.', 500, error.message);

  const totales = movimientos.reduce(
    (acc, m) => {
      const esVentaOIngreso = m.tipo === 'venta' || m.tipo === 'ingreso';
      if (esVentaOIngreso) acc.ingresos += Number(m.monto);
      if (esVentaOIngreso && (m.metodo_pago === 'efectivo' || !m.metodo_pago)) acc.ingresosEfectivo += Number(m.monto);
      if (m.tipo === 'egreso') acc.egresos += Number(m.monto);
      if (m.tipo === 'propina') acc.propinas += Number(m.monto);

      if (esVentaOIngreso && m.metodo_pago) {
        acc.porMetodo[m.metodo_pago] = (acc.porMetodo[m.metodo_pago] || 0) + Number(m.monto);
      }
      return acc;
    },
    { ingresos: 0, ingresosEfectivo: 0, egresos: 0, propinas: 0, porMetodo: {} }
  );

  return { movimientos, totales };
}

// Solo el EFECTIVO afecta lo que debería haber físicamente en el cajón —
// las ventas por tarjeta o transferencia nunca fueron billetes que
// entraron a la caja, así que no se suman al monto esperado al cierre.
//
// conteoFisico: [{ insumo_id, cantidad_fisica }] — lo que el cajero contó
// a simple vista en el estante. Si un insumo no viene en la lista, queda
// "sin verificar" en el reporte (no bloquea el cierre).
export async function cerrarCaja(cajaId, usuarioId, montoFinalReal, conteoFisico = []) {
  const { totales } = await resumenCaja(cajaId);
  const { data: caja } = await supabaseAdmin.from('cajas').select('monto_inicial, negocio_id, barra_id').eq('id', cajaId).single();

  const montoFinalCalculado = Number(caja.monto_inicial) + totales.ingresosEfectivo - totales.egresos;
  const diferencia = montoFinalReal - montoFinalCalculado;

  // Foto del inventario con lo contado físicamente
  if (caja.barra_id) {
    await guardarSnapshotInventario(caja.negocio_id, cajaId, caja.barra_id, 'cierre', conteoFisico);
  }

  // ¿Hay algún insumo cuyo conteo físico no coincide con lo que el
  // sistema esperaba? Esa es la señal de un faltante que las ventas
  // registradas no explican.
  const { data: snapshotsCierre } = await supabaseAdmin
    .from('snapshots_inventario_caja')
    .select('insumo_id, cantidad_sistema, cantidad_fisica')
    .eq('caja_id', cajaId)
    .eq('tipo', 'cierre');

  const hayFaltanteInventario = (snapshotsCierre || []).some(
    (s) => s.cantidad_fisica !== null && Number(s.cantidad_fisica) !== Number(s.cantidad_sistema)
  );
  const hayDiferenciaDinero = Math.abs(diferencia) > 1000; // más de $1.000 de diferencia amerita revisar
  const tieneAlertas = hayFaltanteInventario || hayDiferenciaDinero;

  const { data, error } = await supabaseAdmin
    .from('cajas')
    .update({
      cerrada_por: usuarioId,
      monto_final_calculado: montoFinalCalculado,
      monto_final_real: montoFinalReal,
      diferencia,
      tiene_alertas: tieneAlertas,
      cerrada_at: new Date().toISOString(),
    })
    .eq('id', cajaId)
    .select()
    .single();
  if (error) throw new AppError('No se pudo cerrar la caja.', 500, error.message);

  if (tieneAlertas) {
    await supabaseAdmin.from('notificaciones').insert({
      negocio_id: caja.negocio_id,
      tipo: 'cierre_con_alertas',
      titulo: 'Cierre de caja con algo para revisar',
      mensaje: hayFaltanteInventario && hayDiferenciaDinero
        ? 'Este cierre tiene diferencia de dinero y de inventario.'
        : hayFaltanteInventario
          ? 'Este cierre tiene inventario que no coincide con lo vendido.'
          : 'Este cierre tiene una diferencia de dinero.',
      data: { caja_id: cajaId },
    });
  }

  return { caja: data, totales };
}

export async function marcarCajaRevisada(cajaId, usuarioId) {
  const { data, error } = await supabaseAdmin
    .from('cajas')
    .update({ revisado_por: usuarioId, revisado_at: new Date().toISOString() })
    .eq('id', cajaId)
    .select()
    .single();
  if (error) throw new AppError('No se pudo marcar como revisado.', 500, error.message);
  return data;
}

export async function pendientesRevision(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('cajas')
    .select('*, barra:barras(id, nombre)')
    .eq('negocio_id', negocioId)
    .eq('tiene_alertas', true)
    .is('revisado_at', null)
    .not('cerrada_at', 'is', null)
    .order('cerrada_at', { ascending: false });
  if (error) throw new AppError('No se pudieron obtener los cierres pendientes de revisión.', 500, error.message);
  return data;
}

// El reporte completo de un turno: dinero, inventario (con alertas
// primero) y ventas por producto — todo lo que hace falta para entregar
// o revisar una caja de un solo vistazo.
export async function reporteCierre(cajaId) {
  const { data: caja, error: errorCaja } = await supabaseAdmin
    .from('cajas')
    .select(
      '*, barra:barras(id, nombre), abierto_por_usuario:usuarios!cajas_abierta_por_fkey(nombre), cerrado_por_usuario:usuarios!cajas_cerrada_por_fkey(nombre), revisado_por_usuario:usuarios!cajas_revisado_por_fkey(nombre)'
    )
    .eq('id', cajaId)
    .single();
  if (errorCaja || !caja) throw new AppError('Caja no encontrada.', 404);

  const { totales, movimientos } = await resumenCaja(cajaId);

  // Inventario: cruza apertura y cierre por insumo
  const { data: snapshots } = await supabaseAdmin
    .from('snapshots_inventario_caja')
    .select('insumo_id, tipo, cantidad_sistema, cantidad_fisica, insumo:insumos(nombre, unidad)')
    .eq('caja_id', cajaId);

  const porInsumo = new Map();
  for (const s of snapshots || []) {
    if (!porInsumo.has(s.insumo_id)) porInsumo.set(s.insumo_id, { nombre: s.insumo?.nombre, unidad: s.insumo?.unidad });
    const entrada = porInsumo.get(s.insumo_id);
    if (s.tipo === 'apertura') entrada.apertura = Number(s.cantidad_sistema);
    if (s.tipo === 'cierre') {
      entrada.cierreSistema = Number(s.cantidad_sistema);
      entrada.cierreFisico = s.cantidad_fisica !== null ? Number(s.cantidad_fisica) : null;
    }
  }

  const inventario = [...porInsumo.entries()].map(([insumo_id, v]) => {
    const vendidoTeorico = v.apertura !== undefined && v.cierreSistema !== undefined ? v.apertura - v.cierreSistema : null;
    const diferencia = v.cierreFisico !== null && v.cierreFisico !== undefined && v.cierreSistema !== undefined
      ? v.cierreFisico - v.cierreSistema
      : null;
    return {
      insumo_id,
      nombre: v.nombre,
      unidad: v.unidad,
      apertura: v.apertura ?? null,
      cierreSistema: v.cierreSistema ?? null,
      cierreFisico: v.cierreFisico ?? null,
      vendidoTeorico,
      diferencia,
      conAlerta: diferencia !== null && diferencia !== 0,
      sinVerificar: v.cierreFisico === null || v.cierreFisico === undefined,
    };
  }).sort((a, b) => {
    // Alertas primero, ordenadas de la más grave a la menos grave
    if (a.conAlerta !== b.conAlerta) return a.conAlerta ? -1 : 1;
    return Math.abs(b.diferencia || 0) - Math.abs(a.diferencia || 0);
  });

  // Ventas por producto durante este turno (por los movimientos de tipo venta)
  const idsPedidos = [...new Set((movimientos || []).filter((m) => m.pedido_id).map((m) => m.pedido_id))];
  let ventasPorProducto = [];
  if (idsPedidos.length) {
    const { data: items } = await supabaseAdmin
      .from('pedido_items')
      .select('cantidad, precio_unitario, producto:productos(nombre), pedido_id, barra_id')
      .in('pedido_id', idsPedidos)
      .eq('barra_id', caja.barra_id)
      .neq('estado', 'cancelado');

    const agrupado = new Map();
    for (const it of items || []) {
      const key = it.producto?.nombre || 'Producto';
      if (!agrupado.has(key)) agrupado.set(key, { nombre: key, unidades: 0, total: 0 });
      const e = agrupado.get(key);
      e.unidades += Number(it.cantidad);
      e.total += Number(it.cantidad) * Number(it.precio_unitario);
    }
    ventasPorProducto = [...agrupado.values()].sort((a, b) => b.total - a.total);
  }

  return {
    caja,
    totales,
    inventario,
    ventasPorProducto,
    hayAlertasInventario: inventario.some((i) => i.conAlerta),
  };
}

// Historial de sesiones de caja (abiertas y cerradas) con el desglose de
// ingresos totales vs. solo efectivo — para que el admin pueda revisar,
// por barra y por fecha, cuánto entró de verdad en billete físico frente
// a la venta total registrada.
export async function historialCajas(negocioId, { desde, hasta, barraId } = {}, limite = 60) {
  let query = supabaseAdmin
    .from('cajas')
    .select(
      '*, barra:barras(id, nombre), abierto_por_usuario:usuarios!cajas_abierta_por_fkey(nombre), cerrado_por_usuario:usuarios!cajas_cerrada_por_fkey(nombre)'
    )
    .eq('negocio_id', negocioId)
    .order('abierta_at', { ascending: false })
    .limit(limite);
  if (desde) query = query.gte('abierta_at', desde);
  if (hasta) query = query.lte('abierta_at', hasta);
  if (barraId) query = query.eq('barra_id', barraId);

  const { data: cajas, error } = await query;
  if (error) throw new AppError('No se pudo obtener el historial de caja.', 500, error.message);
  if (!cajas.length) return [];

  const { data: movimientos } = await supabaseAdmin
    .from('movimientos_caja')
    .select('caja_id, tipo, monto, metodo_pago')
    .in('caja_id', cajas.map((c) => c.id));

  return cajas.map((caja) => {
    const propios = (movimientos || []).filter((m) => m.caja_id === caja.id);
    const ingresosTotales = propios.filter((m) => m.tipo === 'venta' || m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0);
    const ingresosEfectivo = propios
      .filter((m) => (m.tipo === 'venta' || m.tipo === 'ingreso') && (m.metodo_pago === 'efectivo' || !m.metodo_pago))
      .reduce((s, m) => s + Number(m.monto), 0);
    return { ...caja, ingresosTotales, ingresosEfectivo };
  });
}
