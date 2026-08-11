import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as productosService from './productos.service.js';

export const listar = asyncHandler(async (req, res) => {
  const { categoria_id, barra_id, activos } = req.query;
  const productos = await productosService.listarProductos(req.usuario.negocio_id, {
    categoriaId: categoria_id,
    barraId: barra_id,
    soloActivos: activos === 'true',
  });
  return response.success(res, productos);
});

export const crear = asyncHandler(async (req, res) => {
  const producto = await productosService.crearProducto(req.usuario.negocio_id, req.body);
  return response.created(res, producto, 'Producto creado');
});

export const importarMasivo = asyncHandler(async (req, res) => {
  const productos = await productosService.crearProductosMasivo(req.usuario.negocio_id, req.body.filas);
  return response.created(res, productos, `${productos.length} productos importados`);
});

export const actualizar = asyncHandler(async (req, res) => {
  const producto = await productosService.actualizarProducto(req.params.id, req.body);
  return response.success(res, producto, 'Producto actualizado');
});

export const eliminar = asyncHandler(async (req, res) => {
  await productosService.eliminarProducto(req.params.id);
  return response.noContent(res);
});

export const eliminarPermanente = asyncHandler(async (req, res) => {
  await productosService.eliminarProductoPermanente(req.params.id);
  return response.noContent(res);
});

export const listarCategorias = asyncHandler(async (req, res) => {
  const categorias = await productosService.listarCategorias(req.usuario.negocio_id);
  return response.success(res, categorias);
});

export const crearCategoria = asyncHandler(async (req, res) => {
  const categoria = await productosService.crearCategoria(req.usuario.negocio_id, req.body);
  return response.created(res, categoria, 'Categoría creada');
});

export const eliminarCategoria = asyncHandler(async (req, res) => {
  await productosService.eliminarCategoria(req.params.id);
  return response.noContent(res);
});

export const listarInsumos = asyncHandler(async (req, res) => {
  const insumos = await productosService.listarInsumos(req.usuario.negocio_id);
  return response.success(res, insumos);
});

export const crearInsumo = asyncHandler(async (req, res) => {
  const insumo = await productosService.crearInsumo(req.usuario.negocio_id, req.body);
  return response.created(res, insumo, 'Insumo creado');
});

export const asignarStockBarra = asyncHandler(async (req, res) => {
  const { barra_id, cantidad, stock_minimo } = req.body;
  const resultado = await productosService.asignarStockBarra(req.usuario.negocio_id, req.params.id, barra_id, cantidad, stock_minimo);
  return response.success(res, resultado, 'Stock asignado');
});

export const establecerStockBarra = asyncHandler(async (req, res) => {
  const { barra_id, cantidad, stock_minimo } = req.body;
  const resultado = await productosService.establecerStockBarra(req.usuario.negocio_id, req.params.id, barra_id, cantidad, stock_minimo);
  return response.success(res, resultado, 'Cantidad actualizada');
});
