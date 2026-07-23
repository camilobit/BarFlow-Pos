import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';

const SELECT_PRODUCTO = `
  *,
  categoria:categorias(id, nombre),
  barra:barras(id, nombre),
  ingredientes:producto_insumos(id, cantidad, insumo:insumos(id, nombre, unidad, stock))
`;

export async function listarProductos(negocioId, { categoriaId, barraId, soloActivos } = {}) {
  let query = supabaseAdmin.from('productos').select(SELECT_PRODUCTO).eq('negocio_id', negocioId);
  if (categoriaId) query = query.eq('categoria_id', categoriaId);
  if (barraId) query = query.eq('barra_id', barraId);
  if (soloActivos) query = query.eq('activo', true);
  const { data, error } = await query.order('nombre');
  if (error) throw new AppError('No se pudieron listar los productos.', 500, error.message);
  return data;
}

export async function crearProducto(negocioId, payload) {
  const { ingredientes, ...producto } = payload;
  const { data, error } = await supabaseAdmin
    .from('productos')
    .insert({ ...producto, negocio_id: negocioId })
    .select()
    .single();
  if (error) throw new AppError('No se pudo crear el producto.', 500, error.message);

  if (ingredientes && ingredientes.length) {
    const filas = ingredientes.map((i) => ({ producto_id: data.id, insumo_id: i.insumo_id, cantidad: i.cantidad }));
    const { error: errorRecetas } = await supabaseAdmin.from('producto_insumos').insert(filas);
    if (errorRecetas) throw new AppError('Producto creado pero falló la receta.', 500, errorRecetas.message);
  }

  return data;
}

export async function actualizarProducto(productoId, payload) {
  const { ingredientes, ...producto } = payload;
  const { data, error } = await supabaseAdmin
    .from('productos')
    .update(producto)
    .eq('id', productoId)
    .select()
    .single();
  if (error) throw new AppError('No se pudo actualizar el producto.', 500, error.message);

  if (ingredientes) {
    await supabaseAdmin.from('producto_insumos').delete().eq('producto_id', productoId);
    if (ingredientes.length) {
      const filas = ingredientes.map((i) => ({ producto_id: productoId, insumo_id: i.insumo_id, cantidad: i.cantidad }));
      await supabaseAdmin.from('producto_insumos').insert(filas);
    }
  }

  return data;
}

export async function eliminarProducto(productoId) {
  const { error } = await supabaseAdmin.from('productos').update({ activo: false }).eq('id', productoId);
  if (error) throw new AppError('No se pudo desactivar el producto.', 500, error.message);
  return { ok: true };
}

export async function listarCategorias(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('categorias')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('orden');
  if (error) throw new AppError('No se pudieron listar las categorías.', 500, error.message);
  return data;
}

export async function crearCategoria(negocioId, payload) {
  const { data, error } = await supabaseAdmin
    .from('categorias')
    .insert({ ...payload, negocio_id: negocioId })
    .select()
    .single();
  if (error) throw new AppError('No se pudo crear la categoría.', 500, error.message);
  return data;
}

export async function listarInsumos(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('insumos')
    .select('*, proveedor:proveedores(id, nombre)')
    .eq('negocio_id', negocioId)
    .order('nombre');
  if (error) throw new AppError('No se pudieron listar los insumos.', 500, error.message);
  return data;
}

export async function crearInsumo(negocioId, payload) {
  const { data, error } = await supabaseAdmin
    .from('insumos')
    .insert({ ...payload, negocio_id: negocioId })
    .select()
    .single();
  if (error) throw new AppError('No se pudo crear el insumo.', 500, error.message);
  return data;
}

export async function ajustarStockInsumo(insumoId, cantidad) {
  const { data: insumo, error: errorGet } = await supabaseAdmin
    .from('insumos')
    .select('stock')
    .eq('id', insumoId)
    .single();
  if (errorGet) throw new AppError('Insumo no encontrado.', 404, errorGet.message);

  const { data, error } = await supabaseAdmin
    .from('insumos')
    .update({ stock: Number(insumo.stock) + Number(cantidad) })
    .eq('id', insumoId)
    .select()
    .single();
  if (error) throw new AppError('No se pudo ajustar el stock.', 500, error.message);
  return data;
}
