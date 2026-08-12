import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/AppError.js';

const SELECT_PRODUCTO = `
  *,
  categoria:categorias(id, nombre),
  barra:barras(id, nombre),
  ingredientes:producto_insumos(id, cantidad, insumo:insumos(id, nombre, unidad, costo_unitario))
`;

// El costo de un producto con receta se calcula solo, sumando
// costo_unitario × cantidad de cada ingrediente — así el margen real
// queda siempre actualizado sin que el admin tenga que hacer la cuenta
// a mano cada vez que cambia el precio de un insumo.
async function calcularCostoDesdeReceta(ingredientes) {
  if (!ingredientes || !ingredientes.length) return null;
  const idsInsumos = ingredientes.map((i) => i.insumo_id);
  const { data: insumos, error } = await supabaseAdmin
    .from('insumos')
    .select('id, costo_unitario')
    .in('id', idsInsumos);
  if (error) return null;

  return ingredientes.reduce((total, ing) => {
    const insumo = insumos.find((i) => i.id === ing.insumo_id);
    return total + (insumo ? Number(insumo.costo_unitario) * Number(ing.cantidad) : 0);
  }, 0);
}

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

  // Si viene con receta (varios insumos), el costo se calcula solo —
  // ignoramos lo que haya llegado en el campo costo del formulario.
  if (ingredientes && ingredientes.length) {
    const costoCalculado = await calcularCostoDesdeReceta(ingredientes);
    if (costoCalculado !== null) producto.costo = costoCalculado;
  }

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

  if (ingredientes && ingredientes.length) {
    const costoCalculado = await calcularCostoDesdeReceta(ingredientes);
    if (costoCalculado !== null) producto.costo = costoCalculado;
  }

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

// Copia un producto completo (precio, categoría, barra) junto con su
// receta — para no tener que rearmar desde cero variaciones de un mismo
// plato/cóctel ("Mojito Clásico" -> "Mojito de Fresa").
export async function duplicarProducto(productoId) {
  const { data: original, error: errorOriginal } = await supabaseAdmin
    .from('productos')
    .select('*, ingredientes:producto_insumos(insumo_id, cantidad)')
    .eq('id', productoId)
    .single();
  if (errorOriginal) throw new AppError('Producto no encontrado.', 404, errorOriginal.message);

  const { id, created_at, updated_at, ingredientes, ...datosBase } = original;

  const { data: copia, error: errorCopia } = await supabaseAdmin
    .from('productos')
    .insert({ ...datosBase, nombre: `${original.nombre} (copia)` })
    .select()
    .single();
  if (errorCopia) throw new AppError('No se pudo duplicar el producto.', 500, errorCopia.message);

  if (ingredientes && ingredientes.length) {
    const filas = ingredientes.map((i) => ({ producto_id: copia.id, insumo_id: i.insumo_id, cantidad: i.cantidad }));
    await supabaseAdmin.from('producto_insumos').insert(filas);
  }

  return copia;
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

// Borra la categoría — los productos que la tenían quedan "sin categoría"
// (la columna categoria_id de productos es ON DELETE SET NULL), nunca se
// borra ningún producto del inventario.
export async function eliminarCategoria(categoriaId) {
  const { error } = await supabaseAdmin.from('categorias').delete().eq('id', categoriaId);
  if (error) throw new AppError('No se pudo eliminar la categoría.', 500, error.message);
  return { ok: true };
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

// Si el insumo ya está en la receta de algún producto, borrarlo de verdad
// dañaría esa receta en silencio (el producto dejaría de descontar ese
// ingrediente sin que nadie se entere). En ese caso, se desactiva en vez
// de borrarse: desaparece de los selectores para recetas nuevas, pero no
// rompe nada de lo que ya existe.
export async function eliminarInsumo(insumoId) {
  const { data: enUso, error: errorUso } = await supabaseAdmin
    .from('producto_insumos')
    .select('producto_id, producto:productos(nombre)')
    .eq('insumo_id', insumoId);
  if (errorUso) throw new AppError('No se pudo verificar el uso del insumo.', 500, errorUso.message);

  if (enUso && enUso.length > 0) {
    const { error: errorDesactivar } = await supabaseAdmin.from('insumos').update({ activo: false }).eq('id', insumoId);
    if (errorDesactivar) throw new AppError('No se pudo desactivar el insumo.', 500, errorDesactivar.message);

    const nombresProductos = [...new Set(enUso.map((u) => u.producto?.nombre).filter(Boolean))];
    return {
      accion: 'desactivado',
      mensaje: `Este insumo está en la receta de ${nombresProductos.length} producto(s) (${nombresProductos.join(', ')}), así que se desactivó en vez de borrarse — para no dañar esas recetas.`,
    };
  }

  const { error } = await supabaseAdmin.from('insumos').delete().eq('id', insumoId);
  if (error) throw new AppError('No se pudo eliminar el insumo.', 500, error.message);
  return { accion: 'eliminado', mensaje: 'Insumo eliminado.' };
}

// Importación masiva de recetas desde CSV: producto, insumo, cantidad.
// A diferencia de importar productos, acá NADA se crea si falta — el
// producto y el insumo deben existir de antes (el CSV solo conecta lo
// que ya está creado). Las filas que no se pudieron aplicar se devuelven
// con el motivo exacto, para que el admin sepa qué le falta configurar.
export async function importarRecetas(negocioId, filas) {
  const [{ data: productos }, { data: insumos }] = await Promise.all([
    supabaseAdmin.from('productos').select('id, nombre, costo').eq('negocio_id', negocioId),
    supabaseAdmin.from('insumos').select('id, nombre, costo_unitario').eq('negocio_id', negocioId),
  ]);

  const buscarPorNombre = (lista, nombre) =>
    lista.find((x) => x.nombre.trim().toLowerCase() === String(nombre || '').trim().toLowerCase());

  const aplicadas = [];
  const noAplicadas = [];
  const productosParaRecalcularCosto = new Set();

  for (const fila of filas) {
    const producto = buscarPorNombre(productos, fila.producto);
    const insumo = buscarPorNombre(insumos, fila.insumo);

    if (!producto) {
      noAplicadas.push({
        ...fila,
        motivo: `El producto "${fila.producto}" no existe todavía. Créalo primero en Productos (o impórtalo junto con los demás) y vuelve a subir esta fila.`,
      });
      continue;
    }
    if (!insumo) {
      noAplicadas.push({
        ...fila,
        motivo: `El insumo "${fila.insumo}" no existe todavía. Créalo primero en Inventario y vuelve a subir esta fila.`,
      });
      continue;
    }

    const { error } = await supabaseAdmin
      .from('producto_insumos')
      .upsert({ producto_id: producto.id, insumo_id: insumo.id, cantidad: Number(fila.cantidad) }, { onConflict: 'producto_id,insumo_id' });

    if (error) {
      noAplicadas.push({ ...fila, motivo: 'No se pudo guardar esta línea, intenta de nuevo.' });
      continue;
    }

    aplicadas.push(fila);
    productosParaRecalcularCosto.add(producto.id);
  }

  // Recalcula el costo de cada producto que recibió ingredientes nuevos
  for (const productoId of productosParaRecalcularCosto) {
    const { data: receta } = await supabaseAdmin
      .from('producto_insumos')
      .select('insumo_id, cantidad')
      .eq('producto_id', productoId);
    const costoCalculado = await calcularCostoDesdeReceta(receta);
    if (costoCalculado !== null) {
      await supabaseAdmin.from('productos').update({ costo: costoCalculado }).eq('id', productoId);
    }
  }

  return { totalFilas: filas.length, aplicadas: aplicadas.length, noAplicadas };
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

// El admin ESTABLECE la cantidad exacta de un insumo en una barra (no
// suma, reemplaza el valor). Ej: había 20, el admin cuenta físicamente y
// pone 25 -> queda en 25, no en 45. Mucho más intuitivo que tener que
// calcular la diferencia a mano.
export async function establecerStockBarra(negocioId, insumoId, barraId, nuevaCantidad, stockMinimo) {
  const { data: existente } = await supabaseAdmin
    .from('insumo_stock_barra')
    .select('id')
    .eq('insumo_id', insumoId)
    .eq('barra_id', barraId)
    .maybeSingle();

  if (existente) {
    const { data, error } = await supabaseAdmin
      .from('insumo_stock_barra')
      .update({
        stock: Number(nuevaCantidad),
        ...(stockMinimo !== undefined && { stock_minimo: stockMinimo }),
      })
      .eq('id', existente.id)
      .select('*, barra:barras(id, nombre)')
      .single();
    if (error) throw new AppError('No se pudo actualizar el stock.', 500, error.message);
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('insumo_stock_barra')
    .insert({
      negocio_id: negocioId,
      insumo_id: insumoId,
      barra_id: barraId,
      stock: Number(nuevaCantidad),
      stock_minimo: stockMinimo || 0,
    })
    .select('*, barra:barras(id, nombre)')
    .single();
  if (error) throw new AppError('No se pudo actualizar el stock.', 500, error.message);
  return data;
}
