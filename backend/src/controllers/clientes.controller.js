import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
import * as clientesService from '../services/clientes.service.js';

export const listar = asyncHandler(async (req, res) => {
  const clientes = await clientesService.listarClientes(req.usuario.negocio_id, { busqueda: req.query.q });
  res.json(clientes);
});

export const crear = asyncHandler(async (req, res) => {
  const cliente = await clientesService.crearCliente(req.usuario.negocio_id, req.body);
  res.status(201).json(cliente);
});

export const actualizar = asyncHandler(async (req, res) => {
  const cliente = await clientesService.actualizarCliente(req.params.id, req.body);
  res.json(cliente);
});

export const obtener = asyncHandler(async (req, res) => {
  const cliente = await clientesService.obtenerCliente(req.params.id);
  res.json(cliente);
});

export const historial = asyncHandler(async (req, res) => {
  const historial = await clientesService.historialConsumoCliente(req.params.id);
  res.json(historial);
});

export const ranking = asyncHandler(async (req, res) => {
  const ranking = await clientesService.rankingClientes(req.usuario.negocio_id);
  res.json(ranking);
});

export const cumpleanos = asyncHandler(async (req, res) => {
  const cumpleanos = await clientesService.proximosCumpleanos(req.usuario.negocio_id);
  res.json(cumpleanos);
});
