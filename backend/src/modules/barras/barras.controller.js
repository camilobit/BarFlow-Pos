import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as barrasService from './barras.service.js';

export const listar = asyncHandler(async (req, res) => {
  const negocioId = req.usuario.rol === 'super_admin' ? req.query.negocio_id || req.usuario.negocio_id : req.usuario.negocio_id;
  const barras = await barrasService.listarBarras(negocioId);
  return response.success(res, barras);
});

export const crear = asyncHandler(async (req, res) => {
  const barra = await barrasService.crearBarra(req.usuario.negocio_id, req.body);
  return response.created(res, barra);
});

export const actualizar = asyncHandler(async (req, res) => {
  const barra = await barrasService.actualizarBarra(req.params.id, req.body);
  return response.success(res, barra, 'Barra actualizada');
});

export const eliminar = asyncHandler(async (req, res) => {
  await barrasService.eliminarBarra(req.params.id);
  return response.noContent(res);
});
