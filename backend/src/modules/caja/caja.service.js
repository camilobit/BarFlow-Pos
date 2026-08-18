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
export async function cerrarCaja(cajaId, usuarioId, montoFinalReal) {
  const { totales } = await resumenCaja(cajaId);
  const { data: caja } = await supabaseAdmin.from('cajas').select('monto_inicial').eq('id', cajaId).single();

  const montoFinalCalculado = Number(caja.monto_inicial) + totales.ingresosEfectivo - totales.egresos;
  const diferencia = montoFinalReal - montoFinalCalculado;

  const { data, error } = await supabaseAdmin
    .from('cajas')
    .update({
      cerrada_por: usuarioId,
      monto_final_calculado: montoFinalCalculado,
      monto_final_real: montoFinalReal,
      diferencia,
      cerrada_at: new Date().toISOString(),
    })
    .eq('id', cajaId)
    .select()
    .single();
  if (error) throw new AppError('No se pudo cerrar la caja.', 500, error.message);

  return { caja: data, totales };
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
