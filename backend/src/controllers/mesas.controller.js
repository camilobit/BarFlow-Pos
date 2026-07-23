import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
import * as mesasService from '../services/mesas.service.js';

export const listar = asyncHandler(async (req, res) => {
  const mesas = await mesasService.listarMesas(req.usuario.negocio_id);
  res.json(mesas);
});

export const crear = asyncHandler(async (req, res) => {
  const mesa = await mesasService.crearMesa(req.usuario.negocio_id, req.body);
  res.status(201).json(mesa);
});

export const actualizar = asyncHandler(async (req, res) => {
  const mesa = await mesasService.actualizarMesa(req.params.id, req.body);
  res.json(mesa);
});

export const eliminar = asyncHandler(async (req, res) => {
  await mesasService.eliminarMesa(req.params.id);
  res.status(204).send();
});
