import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as usuariosService from './usuarios.service.js';

export const listar = asyncHandler(async (req, res) => {
  const negocioId = req.usuario.rol === 'super_admin' ? req.query.negocio_id : req.usuario.negocio_id;
  const usuarios = await usuariosService.listarUsuarios(negocioId);
  return response.success(res, usuarios);
});

export const crear = asyncHandler(async (req, res) => {
  const negocioId = req.usuario.rol === 'super_admin' ? req.body.negocio_id : req.usuario.negocio_id;
  const usuario = await usuariosService.crearEmpleado({ ...req.body, negocioId, barraId: req.body.barra_id });
  return response.created(res, usuario, 'Empleado creado');
});

export const actualizar = asyncHandler(async (req, res) => {
  const usuario = await usuariosService.actualizarUsuario(req.params.id, req.body);
  return response.success(res, usuario, 'Usuario actualizado');
});

export const desactivar = asyncHandler(async (req, res) => {
  await usuariosService.desactivarUsuario(req.params.id);
  return response.noContent(res);
});

export const eliminarPermanente = asyncHandler(async (req, res) => {
  await usuariosService.eliminarUsuarioPermanente(req.params.id);
  return response.noContent(res);
});

export const resetearPassword = asyncHandler(async (req, res) => {
  await usuariosService.resetearPassword(req.params.id, req.body.password);
  return response.success(res, null, 'Contraseña actualizada');
});

export const perfilActual = asyncHandler(async (req, res) => {
  return response.success(res, req.usuario);
});
