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
      if (m.tipo === 'venta' || m.tipo === 'ingreso') acc.ingresos += Number(m.monto);
      if (m.tipo === 'egreso') acc.egresos += Number(m.monto);
      if (m.tipo === 'propina') acc.propinas += Number(m.monto);
      return acc;
    },
    { ingresos: 0, egresos: 0, propinas: 0 }
  );

  return { movimientos, totales };
}

export async function cerrarCaja(cajaId, usuarioId, montoFinalReal) {
  const { totales } = await resumenCaja(cajaId);
  const { data: caja } = await supabaseAdmin.from('cajas').select('monto_inicial').eq('id', cajaId).single();

  const montoFinalCalculado = Number(caja.monto_inicial) + totales.ingresos - totales.egresos;
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

export async function historialCajas(negocioId, limite = 30) {
  const { data, error } = await supabaseAdmin
    .from('cajas')
    .select(
      '*, barra:barras(id, nombre), abierto_por_usuario:usuarios!cajas_abierta_por_fkey(nombre), cerrado_por_usuario:usuarios!cajas_cerrada_por_fkey(nombre)'
    )
    .eq('negocio_id', negocioId)
    .order('abierta_at', { ascending: false })
    .limit(limite);
  if (error) throw new AppError('No se pudo obtener el historial de caja.', 500, error.message);
  return data;
}
