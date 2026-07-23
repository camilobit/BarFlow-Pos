import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as mesasService from './mesas.service.js';

export const listar = asyncHandler(async (req, res) => {
  const mesas = await mesasService.listarMesas(req.usuario.negocio_id);
  return response.success(res, mesas);
});

export const crear = asyncHandler(async (req, res) => {
  const mesa = await mesasService.crearMesa(req.usuario.negocio_id, req.body);
  return response.created(res, mesa, 'Mesa creada');
});

export const actualizar = asyncHandler(async (req, res) => {
  const mesa = await mesasService.actualizarMesa(req.params.id, req.body);
  return response.success(res, mesa, 'Mesa actualizada');
});

export const eliminar = asyncHandler(async (req, res) => {
  await mesasService.eliminarMesa(req.params.id);
  return response.noContent(res);
});
