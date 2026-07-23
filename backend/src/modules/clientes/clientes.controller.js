import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as clientesService from './clientes.service.js';

export const listar = asyncHandler(async (req, res) => {
  const clientes = await clientesService.listarClientes(req.usuario.negocio_id, { busqueda: req.query.q });
  return response.success(res, clientes);
});

export const crear = asyncHandler(async (req, res) => {
  const cliente = await clientesService.crearCliente(req.usuario.negocio_id, req.body);
  return response.created(res, cliente, 'Cliente creado');
});

export const actualizar = asyncHandler(async (req, res) => {
  const cliente = await clientesService.actualizarCliente(req.params.id, req.body);
  return response.success(res, cliente, 'Cliente actualizado');
});

export const obtener = asyncHandler(async (req, res) => {
  const cliente = await clientesService.obtenerCliente(req.params.id);
  return response.success(res, cliente);
});

export const historial = asyncHandler(async (req, res) => {
  const historial = await clientesService.historialConsumoCliente(req.params.id);
  return response.success(res, historial);
});

export const ranking = asyncHandler(async (req, res) => {
  const ranking = await clientesService.rankingClientes(req.usuario.negocio_id);
  return response.success(res, ranking);
});

export const cumpleanos = asyncHandler(async (req, res) => {
  const cumpleanos = await clientesService.proximosCumpleanos(req.usuario.negocio_id);
  return response.success(res, cumpleanos);
});
