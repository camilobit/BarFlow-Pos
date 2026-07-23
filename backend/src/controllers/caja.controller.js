import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
import { AppError } from '../utils/AppError.js';
import * as cajaService from '../services/caja.service.js';

export const obtenerActual = asyncHandler(async (req, res) => {
  const caja = await cajaService.obtenerCajaAbierta(req.usuario.negocio_id);
  res.json(caja || null);
});

export const abrir = asyncHandler(async (req, res) => {
  const caja = await cajaService.abrirCaja(req.usuario.negocio_id, req.usuario.id, req.body.monto_inicial);
  res.status(201).json(caja);
});

export const registrarMovimiento = asyncHandler(async (req, res) => {
  const movimiento = await cajaService.registrarMovimiento(req.usuario.negocio_id, req.usuario.id, req.body);
  res.status(201).json(movimiento);
});

export const resumen = asyncHandler(async (req, res) => {
  const caja = await cajaService.obtenerCajaAbierta(req.usuario.negocio_id);
  if (!caja) throw new AppError('No hay una caja abierta.', 404);
  const resumenCaja = await cajaService.resumenCaja(caja.id);
  res.json({ caja, ...resumenCaja });
});

export const cerrar = asyncHandler(async (req, res) => {
  const caja = await cajaService.obtenerCajaAbierta(req.usuario.negocio_id);
  if (!caja) throw new AppError('No hay una caja abierta.', 404);
  const resultado = await cajaService.cerrarCaja(caja.id, req.usuario.id, req.body.monto_final_real);
  res.json(resultado);
});

export const historial = asyncHandler(async (req, res) => {
  const historial = await cajaService.historialCajas(req.usuario.negocio_id);
  res.json(historial);
});
