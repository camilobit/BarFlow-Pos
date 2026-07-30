import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

function inicioDe(periodo) {
  const ahora = new Date();
  const fecha = new Date(ahora);
  if (periodo === 'dia') fecha.setHours(0, 0, 0, 0);
  if (periodo === 'semana') fecha.setDate(ahora.getDate() - 7);
  if (periodo === 'mes') fecha.setMonth(ahora.getMonth() - 1);
  if (periodo === 'anio') fecha.setFullYear(ahora.getFullYear() - 1);
  return fecha.toISOString();
}

export async function resumenVentas(negocioId) {
  const [dia, semana, mes, anio] = await Promise.all([
    totalVentasDesde(negocioId, inicioDe('dia')),
    totalVentasDesde(negocioId, inicioDe('semana')),
    totalVentasDesde(negocioId, inicioDe('mes')),
    totalVentasDesde(negocioId, inicioDe('anio')),
  ]);
  return { hoy: dia, semana, mes, anio };
}

async function totalVentasDesde(negocioId, desdeISO) {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select('total')
    .eq('negocio_id', negocioId)
    .eq('estado', 'pagado')
    .gte('cerrado_at', desdeISO);
  if (error) throw new AppError('No se pudo calcular las ventas.', 500, error.message);
  const total = data.reduce((sum, p) => sum + Number(p.total), 0);
  return { total, numPedidos: data.length, ticketPromedio: data.length ? total / data.length : 0 };
}

export async function productosMasVendidos(negocioId, limite = 10) {
  const { data, error } = await supabaseAdmin
    .from('vw_productos_mas_vendidos')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('unidades_vendidas', { ascending: false })
    .limit(limite);
  if (error) throw new AppError('No se pudo obtener el top de productos.', 500, error.message);
  return data;
}

// desdeISO/hastaISO/barraId son opcionales — se agregaron para soportar
// los filtros del panel administrativo sin romper las llamadas existentes.
export async function ventasPorMesero(negocioId, desdeISO, hastaISO, barraId) {
  let query = supabaseAdmin
    .from('pedidos')
    .select('id, total, origen, mesero:usuarios!pedidos_mesero_id_fkey(id, nombre, apellido)')
    .eq('negocio_id', negocioId)
    .eq('estado', 'pagado')
    .gte('cerrado_at', desdeISO || inicioDe('mes'));
  if (hastaISO) query = query.lte('cerrado_at', hastaISO);
  if (barraId) query = query.eq('barra_id', barraId);

  const { data, error } = await query;
  if (error) throw new AppError('No se pudo calcular ventas por mesero.', 500, error.message);

  const agrupado = {};
  for (const p of data) {
    const key = p.mesero?.id || 'sin_asignar';
    if (!agrupado[key]) agrupado[key] = { mesero: p.mesero, total: 0, pedidos: 0, origen: p.origen };
    agrupado[key].total += Number(p.total);
    agrupado[key].pedidos += 1;
  }
  return Object.values(agrupado).sort((a, b) => b.total - a.total);
}

export async function ventasPorBarra(negocioId, desdeISO, hastaISO) {
  let query = supabaseAdmin
    .from('pedido_items')
    .select('cantidad, precio_unitario, barra:barras(id, nombre), pedido:pedidos!inner(negocio_id, estado, cerrado_at)')
    .eq('pedido.negocio_id', negocioId)
    .eq('pedido.estado', 'pagado')
    .gte('pedido.cerrado_at', desdeISO || inicioDe('mes'));
  if (hastaISO) query = query.lte('pedido.cerrado_at', hastaISO);

  const { data, error } = await query;
  if (error) throw new AppError('No se pudo calcular ventas por barra.', 500, error.message);

  const agrupado = {};
  for (const it of data) {
    const key = it.barra?.id || 'sin_barra';
    if (!agrupado[key]) agrupado[key] = { barra: it.barra, total: 0 };
    agrupado[key].total += Number(it.cantidad) * Number(it.precio_unitario);
  }
  return Object.values(agrupado).sort((a, b) => b.total - a.total);
}

// Compara cuánto se vendió por pedidos tomados por meseros vs. pedidos
// creados directo en la barra (sin mesero de por medio) — el desglose de
// canal que se pidió explícitamente para los reportes del admin.
export async function ventasPorOrigen(negocioId, desdeISO, hastaISO, barraId) {
  let query = supabaseAdmin
    .from('pedidos')
    .select('id, total, origen, barra_id')
    .eq('negocio_id', negocioId)
    .eq('estado', 'pagado')
    .gte('cerrado_at', desdeISO || inicioDe('mes'));
  if (hastaISO) query = query.lte('cerrado_at', hastaISO);
  if (barraId) query = query.eq('barra_id', barraId);

  const { data, error } = await query;
  if (error) throw new AppError('No se pudo calcular ventas por origen.', 500, error.message);

  const resultado = {
    mesero: { total: 0, pedidos: 0 },
    barra: { total: 0, pedidos: 0 },
  };
  for (const p of data) {
    const clave = p.origen === 'barra' ? 'barra' : 'mesero';
    resultado[clave].total += Number(p.total);
    resultado[clave].pedidos += 1;
  }
  return resultado;
}

export async function horasPico(negocioId, desdeISO, hastaISO) {
  let query = supabaseAdmin
    .from('pedidos')
    .select('cerrado_at')
    .eq('negocio_id', negocioId)
    .eq('estado', 'pagado')
    .gte('cerrado_at', desdeISO || inicioDe('mes'));
  if (hastaISO) query = query.lte('cerrado_at', hastaISO);

  const { data, error } = await query;
  if (error) throw new AppError('No se pudo calcular horas pico.', 500, error.message);

  const porHora = Array(24).fill(0);
  for (const p of data) {
    const hora = new Date(p.cerrado_at).getHours();
    porHora[hora] += 1;
  }
  return porHora.map((cantidad, hora) => ({ hora, cantidad }));
}
