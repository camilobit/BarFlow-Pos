import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
import * as negociosService from '../services/negocios.service.js';

export const listar = asyncHandler(async (req, res) => {
  const negocios = await negociosService.listarNegocios();
  res.json(negocios);
});

export const crear = asyncHandler(async (req, res) => {
  const negocio = await negociosService.crearNegocio(req.body);
  res.status(201).json(negocio);
});

export const actualizar = asyncHandler(async (req, res) => {
  const negocio = await negociosService.actualizarNegocio(req.params.id, req.body);
  res.json(negocio);
});

export const suspender = asyncHandler(async (req, res) => {
  const negocio = await negociosService.cambiarEstadoNegocio(req.params.id, 'suspendido');
  res.json(negocio);
});

export const activar = asyncHandler(async (req, res) => {
  const negocio = await negociosService.cambiarEstadoNegocio(req.params.id, 'activo');
  res.json(negocio);
});

export const estadisticas = asyncHandler(async (req, res) => {
  const stats = await negociosService.estadisticasGlobales();
  res.json(stats);
});
