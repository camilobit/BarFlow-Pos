import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { AppError } from '../../utils/AppError.js';
import { response } from '../../utils/response.utils.js';
import * as cajaService from './caja.service.js';

export const obtenerActual = asyncHandler(async (req, res) => {
  const caja = await cajaService.obtenerCajaAbierta(req.usuario.negocio_id, req.query.barra_id || null);
  return response.success(res, caja || null);
});

export const listarAbiertas = asyncHandler(async (req, res) => {
  const cajas = await cajaService.listarCajasAbiertas(req.usuario.negocio_id);
  return response.success(res, cajas);
});

export const abrir = asyncHandler(async (req, res) => {
  const caja = await cajaService.abrirCaja(req.usuario.negocio_id, req.body.barra_id || null, req.usuario.id, req.body.monto_inicial);
  return response.created(res, caja, 'Caja abierta');
});

export const registrarMovimiento = asyncHandler(async (req, res) => {
  const movimiento = await cajaService.registrarMovimiento(req.usuario.negocio_id, req.body.barra_id || null, req.usuario.id, req.body);
  return response.created(res, movimiento, 'Movimiento registrado');
});

export const resumen = asyncHandler(async (req, res) => {
  const caja = await cajaService.obtenerCajaAbierta(req.usuario.negocio_id, req.query.barra_id || null);
  if (!caja) throw new AppError('No hay una caja abierta para esta barra.', 404);
  const resumenCaja = await cajaService.resumenCaja(caja.id);
  return response.success(res, { caja, ...resumenCaja });
});

export const insumosParaConteo = asyncHandler(async (req, res) => {
  const caja = await cajaService.obtenerCajaAbierta(req.usuario.negocio_id, req.query.barra_id || null);
  if (!caja) throw new AppError('No hay una caja abierta para esta barra.', 404);
  const insumos = await cajaService.insumosParaConteo(caja.barra_id);
  return response.success(res, insumos);
});

export const cerrar = asyncHandler(async (req, res) => {
  const caja = await cajaService.obtenerCajaAbierta(req.usuario.negocio_id, req.body.barra_id || null);
  if (!caja) throw new AppError('No hay una caja abierta para esta barra.', 404);
  const resultado = await cajaService.cerrarCaja(caja.id, req.usuario.id, req.body.monto_final_real, req.body.conteo_fisico || []);
  return response.success(res, resultado, 'Caja cerrada');
});

export const reporte = asyncHandler(async (req, res) => {
  const reporte = await cajaService.reporteCierre(req.params.id);
  return response.success(res, reporte);
});

export const marcarRevisado = asyncHandler(async (req, res) => {
  const caja = await cajaService.marcarCajaRevisada(req.params.id, req.usuario.id);
  return response.success(res, caja, 'Marcado como revisado');
});

export const pendientesRevision = asyncHandler(async (req, res) => {
  const cajas = await cajaService.pendientesRevision(req.usuario.negocio_id);
  return response.success(res, cajas);
});

export const historial = asyncHandler(async (req, res) => {
  const { desde, hasta, barra_id } = req.query;
  const historial = await cajaService.historialCajas(req.usuario.negocio_id, { desde, hasta, barraId: barra_id });
  return response.success(res, historial);
});
