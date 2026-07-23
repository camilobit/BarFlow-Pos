import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
import * as usuariosService from '../services/usuarios.service.js';

export const listar = asyncHandler(async (req, res) => {
  const negocioId = req.usuario.rol === 'super_admin' ? req.query.negocio_id : req.usuario.negocio_id;
  const usuarios = await usuariosService.listarUsuarios(negocioId);
  res.json(usuarios);
});

export const crear = asyncHandler(async (req, res) => {
  const negocioId = req.usuario.rol === 'super_admin' ? req.body.negocio_id : req.usuario.negocio_id;
  const usuario = await usuariosService.crearEmpleado({ ...req.body, negocioId });
  res.status(201).json(usuario);
});

export const actualizar = asyncHandler(async (req, res) => {
  const usuario = await usuariosService.actualizarUsuario(req.params.id, req.body);
  res.json(usuario);
});

export const desactivar = asyncHandler(async (req, res) => {
  await usuariosService.desactivarUsuario(req.params.id);
  res.status(204).send();
});

export const perfilActual = asyncHandler(async (req, res) => {
  res.json(req.usuario);
});
