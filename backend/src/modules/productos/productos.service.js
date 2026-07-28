import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

const SELECT_PRODUCTO = `
  *,
  categoria:categorias(id, nombre),
  barra:barras(id, nombre),
  ingredientes:producto_insumos(id, cantidad, insumo:insumos(id, nombre, unidad))
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
  const { ingredientes, controla_inventario_unidad, ...producto } = payload;
  const { data, error } = await supabaseAdmin
    .from('productos')
    .insert({ ...producto, negocio_id: negocioId })
    .select()
    .single();
  if (error) throw new AppError('No se pudo crear el producto.', 500, error.message);

  // "Controla inventario por unidad": el producto ES la unidad de stock
  // (una botella, una lata...). Creamos automáticamente el insumo gemelo
  // y la receta "1 producto = 1 unidad de ese insumo", para reutilizar
  // TODO el sistema de asignación de stock por barra que ya existe —
  // sin esto, el admin no tendría dónde asignar cuántas botellas van a
  // cada barra.
  if (controla_inventario_unidad) {
    const { data: insumo, error: errorInsumo } = await supabaseAdmin
      .from('insumos')
      .insert({ negocio_id: negocioId, nombre: producto.nombre, unidad: 'unidad', costo_unitario: producto.costo || 0 })
      .select()
      .single();
    if (errorInsumo) throw new AppError('Producto creado pero falló el inventario asociado.', 500, errorInsumo.message);

    const { error: errorReceta } = await supabaseAdmin
      .from('producto_insumos')
      .insert({ producto_id: data.id, insumo_id: insumo.id, cantidad: 1 });
    if (errorReceta) throw new AppError('Producto creado pero falló el inventario asociado.', 500, errorReceta.message);

    return { ...data, insumo_generado: insumo };
  }

  if (ingredientes && ingredientes.length) {
    const filas = ingredientes.map((i) => ({ producto_id: data.id, insumo_id: i.insumo_id, cantidad: i.cantidad }));
    const { error: errorRecetas } = await supabaseAdmin.from('producto_insumos').insert(filas);
    if (errorRecetas) throw new AppError('Producto creado pero falló la receta.', 500, errorRecetas.message);
  }

  return data;
}

// Crea muchos productos de una vez (usado por la importación desde CSV/Excel).
// Cada fila: { nombre, precio, costo?, categoria_nombre?, barra_nombre? }
// Las categorías/barras se resuelven por nombre; si no existen, se omiten
// (el producto queda sin categoría/barra en vez de fallar toda la carga).
export async function crearProductosMasivo(negocioId, filas) {
  const [{ data: categorias }, { data: barras }] = await Promise.all([
    supabaseAdmin.from('categorias').select('id, nombre').eq('negocio_id', negocioId),
    supabaseAdmin.from('barras').select('id, nombre').eq('negocio_id', negocioId),
  ]);

  const buscarIdPorNombre = (lista, nombre) =>
    lista.find((x) => x.nombre.trim().toLowerCase() === String(nombre || '').trim().toLowerCase())?.id || null;

  const productosAInsertar = filas.map((fila) => ({
    negocio_id: negocioId,
    nombre: fila.nombre,
    precio: Number(fila.precio) || 0,
    costo: Number(fila.costo) || 0,
    categoria_id: buscarIdPorNombre(categorias, fila.categoria_nombre),
    barra_id: buscarIdPorNombre(barras, fila.barra_nombre),
    activo: true,
  }));

  const { data, error } = await supabaseAdmin.from('productos').insert(productosAInsertar).select();
  if (error) throw new AppError('No se pudo importar el archivo.', 500, error.message);
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

// Borra el producto de verdad (no solo desactivarlo). Solo se puede si
// nunca ha sido pedido — la base de datos lo protege con una llave
// foránea. Si ya tiene historial, sugerimos desactivarlo en su lugar.
export async function eliminarProductoPermanente(productoId) {
  const { error } = await supabaseAdmin.from('productos').delete().eq('id', productoId);
  if (error) {
    if (error.code === '23503') {
      throw new AppError(
        'Este producto ya tiene pedidos asociados, así que no se puede eliminar sin perder ese historial. Desactívalo en su lugar.',
        409
      );
    }
    throw new AppError('No se pudo eliminar el producto.', 500, error.message);
  }
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

// Catálogo de insumos (nombre, unidad, costo) — el stock real vive por
// barra en insumo_stock_barra, acá se trae ya combinado para la vista de
// inventario del admin.
export async function listarInsumos(negocioId) {
  const { data, error } = await supabaseAdmin
    .from('insumos')
    .select('*, proveedor:proveedores(id, nombre), stock_por_barra:insumo_stock_barra(id, barra_id, stock, stock_minimo, barra:barras(id, nombre))')
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

// El admin asigna/agrega stock de un insumo a UNA barra específica.
// Ej: compró 15 botellas de aguardiente -> asigna 10 a Vortex, 5 a Cantina
// (dos llamadas independientes, cada una suma a esa barra).
export async function asignarStockBarra(negocioId, insumoId, barraId, cantidad, stockMinimo) {
  const { data: existente } = await supabaseAdmin
    .from('insumo_stock_barra')
    .select('id, stock')
    .eq('insumo_id', insumoId)
    .eq('barra_id', barraId)
    .maybeSingle();

  if (existente) {
    const { data, error } = await supabaseAdmin
      .from('insumo_stock_barra')
      .update({
        stock: Number(existente.stock) + Number(cantidad),
        ...(stockMinimo !== undefined && { stock_minimo: stockMinimo }),
      })
      .eq('id', existente.id)
      .select('*, barra:barras(id, nombre)')
      .single();
    if (error) throw new AppError('No se pudo asignar el stock.', 500, error.message);
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('insumo_stock_barra')
    .insert({
      negocio_id: negocioId,
      insumo_id: insumoId,
      barra_id: barraId,
      stock: Number(cantidad),
      stock_minimo: stockMinimo || 0,
    })
    .select('*, barra:barras(id, nombre)')
    .single();
  if (error) throw new AppError('No se pudo asignar el stock.', 500, error.message);
  return data;
}
