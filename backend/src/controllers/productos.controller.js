import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
import * as productosService from '../services/productos.service.js';

export const listar = asyncHandler(async (req, res) => {
  const { categoria_id, barra_id, activos } = req.query;
  const productos = await productosService.listarProductos(req.usuario.negocio_id, {
    categoriaId: categoria_id,
    barraId: barra_id,
    soloActivos: activos === 'true',
  });
  res.json(productos);
});

export const crear = asyncHandler(async (req, res) => {
  const producto = await productosService.crearProducto(req.usuario.negocio_id, req.body);
  res.status(201).json(producto);
});

export const actualizar = asyncHandler(async (req, res) => {
  const producto = await productosService.actualizarProducto(req.params.id, req.body);
  res.json(producto);
});

export const eliminar = asyncHandler(async (req, res) => {
  await productosService.eliminarProducto(req.params.id);
  res.status(204).send();
});

export const listarCategorias = asyncHandler(async (req, res) => {
  const categorias = await productosService.listarCategorias(req.usuario.negocio_id);
  res.json(categorias);
});

export const crearCategoria = asyncHandler(async (req, res) => {
  const categoria = await productosService.crearCategoria(req.usuario.negocio_id, req.body);
  res.status(201).json(categoria);
});

export const listarInsumos = asyncHandler(async (req, res) => {
  const insumos = await productosService.listarInsumos(req.usuario.negocio_id);
  res.json(insumos);
});

export const crearInsumo = asyncHandler(async (req, res) => {
  const insumo = await productosService.crearInsumo(req.usuario.negocio_id, req.body);
  res.status(201).json(insumo);
});

export const ajustarStock = asyncHandler(async (req, res) => {
  const insumo = await productosService.ajustarStockInsumo(req.params.id, req.body.cantidad);
  res.json(insumo);
});
