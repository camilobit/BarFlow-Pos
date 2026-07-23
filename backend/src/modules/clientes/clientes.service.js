import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

export async function listarClientes(negocioId, { busqueda } = {}) {
  let query = supabaseAdmin.from('clientes').select('*').eq('negocio_id', negocioId);
  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,celular.ilike.%${busqueda}%,correo.ilike.%${busqueda}%`
    );
  }
  const { data, error } = await query.order('nombre');
  if (error) throw new AppError('No se pudieron listar los clientes.', 500, error.message);
  return data;
}

export async function crearCliente(negocioId, payload) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .insert({ ...payload, negocio_id: negocioId })
    .select()
    .single();
  if (error) throw new AppError('No se pudo crear el cliente.', 500, error.message);
  return data;
}

export async function actualizarCliente(clienteId, payload) {
  const { data, error } = await supabaseAdmin.from('clientes').update(payload).eq('id', clienteId).select().single();
  if (error) throw new AppError('No se pudo actualizar el cliente.', 500, error.message);
  return data;
}

export async function obtenerCliente(clienteId) {
  const { data, error } = await supabaseAdmin.from('clientes').select('*').eq('id', clienteId).single();
  if (error) throw new AppError('Cliente no encontrado.', 404, error.message);
  return data;
}

export async function historialConsumoCliente(clienteId) {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select('id, total, propina, metodo_pago, cerrado_at')
    .eq('cliente_id', clienteId)
    .eq('estado', 'pagado')
    .order('cerrado_at', { ascending: false });
  if (error) throw new AppError('No se pudo obtener el historial del cliente.', 500, error.message);
  return data;
}

export async function rankingClientes(negocioId, limite = 20) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('id, nombre, apellido, consumo_total, visitas, puntos, nivel_fidelizacion')
    .eq('negocio_id', negocioId)
    .order('consumo_total', { ascending: false })
    .limit(limite);
  if (error) throw new AppError('No se pudo obtener el ranking de clientes.', 500, error.message);
  return data;
}

export async function proximosCumpleanos(negocioId) {
  // Trae todos y filtra en memoria por mes/día (evita depender de funciones SQL específicas)
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('id, nombre, apellido, celular, fecha_cumpleanos')
    .eq('negocio_id', negocioId)
    .not('fecha_cumpleanos', 'is', null);
  if (error) throw new AppError('No se pudo consultar cumpleaños.', 500, error.message);

  const hoy = new Date();
  return data
    .map((c) => {
      const fecha = new Date(c.fecha_cumpleanos);
      const proximo = new Date(hoy.getFullYear(), fecha.getMonth(), fecha.getDate());
      if (proximo < hoy) proximo.setFullYear(hoy.getFullYear() + 1);
      const diasFaltantes = Math.ceil((proximo - hoy) / (1000 * 60 * 60 * 24));
      return { ...c, diasFaltantes };
    })
    .filter((c) => c.diasFaltantes <= 30)
    .sort((a, b) => a.diasFaltantes - b.diasFaltantes);
}
