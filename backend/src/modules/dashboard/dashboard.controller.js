import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as dashboardService from './dashboard.service.js';

export const resumen = asyncHandler(async (req, res) => {
  // Filtros opcionales desde el panel del admin: rango de fechas y barra
  // específica. Si no vienen, todo funciona exactamente igual que antes
  // (por defecto: último mes, todas las barras).
  const { desde, hasta, barra_id } = req.query;
  const desdeISO = desde ? new Date(desde).toISOString() : undefined;
  const hastaISO = hasta ? new Date(hasta).toISOString() : undefined;

  const [ventas, topProductos, porMesero, porBarra, porOrigen, pico] = await Promise.all([
    dashboardService.resumenVentas(req.usuario.negocio_id),
    dashboardService.productosMasVendidos(req.usuario.negocio_id),
    dashboardService.ventasPorMesero(req.usuario.negocio_id, desdeISO, hastaISO, barra_id),
    dashboardService.ventasPorBarra(req.usuario.negocio_id, desdeISO, hastaISO),
    dashboardService.ventasPorOrigen(req.usuario.negocio_id, desdeISO, hastaISO, barra_id),
    dashboardService.horasPico(req.usuario.negocio_id, desdeISO, hastaISO),
  ]);
  return response.success(res, { ventas, topProductos, porMesero, porBarra, porOrigen, pico });
});
