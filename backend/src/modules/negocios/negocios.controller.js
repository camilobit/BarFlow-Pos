import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as negociosService from './negocios.service.js';

export const listar = asyncHandler(async (req, res) => {
  const negocios = await negociosService.listarNegocios();
  return response.success(res, negocios);
});

export const crear = asyncHandler(async (req, res) => {
  const negocio = await negociosService.crearNegocio(req.body);
  return response.created(res, negocio, 'Negocio creado');
});

export const actualizar = asyncHandler(async (req, res) => {
  const negocio = await negociosService.actualizarNegocio(req.params.id, req.body);
  return response.success(res, negocio, 'Negocio actualizado');
});

export const suspender = asyncHandler(async (req, res) => {
  const negocio = await negociosService.cambiarEstadoNegocio(req.params.id, 'suspendido');
  return response.success(res, negocio, 'Negocio suspendido');
});

export const activar = asyncHandler(async (req, res) => {
  const negocio = await negociosService.cambiarEstadoNegocio(req.params.id, 'activo');
  return response.success(res, negocio, 'Negocio activado');
});

export const estadisticas = asyncHandler(async (req, res) => {
  const stats = await negociosService.estadisticasGlobales();
  return response.success(res, stats);
});
